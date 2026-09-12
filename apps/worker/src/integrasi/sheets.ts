import crypto from "node:crypto";
import fs from "node:fs";
import { env } from "../env.js";

/**
 * Sambungan Google Sheet, dua arah yang sengaja dipisah:
 *
 * 1. MEMBACA: Sheet stok atau daftar harga jadi Info bisnis, dan ikut terbaru
 *    sendiri. Ini yang membuat asisten tidak lagi menyebut stok kemarin.
 * 2. MENULIS: data pelanggan dari Palwise disalin ke satu tab di Sheet milik
 *    pemilik usaha, supaya timnya bisa memakai data itu di tempat yang sudah
 *    mereka pakai tiap hari.
 *
 * Tanpa pustaka googleapis. Yang dibutuhkan cuma tiga alamat REST dan satu
 * tanda tangan JWT, dan pustaka resminya puluhan megabita di mesin yang RAM-nya
 * sudah pas-pasan.
 */

// ─── Alamat Sheet ─────────────────────────────────────────────────────────────

export interface AlamatSheet {
  /** "biasa" = /d/<id>/..., "terbit" = /d/e/<id>/pub (Publikasikan ke web). */
  jenis: "biasa" | "terbit";
  id: string;
  /** Nomor tab. Null = tab pertama. */
  gid: string | null;
}

/**
 * Ambil id dan tab dari tautan yang ditempel orang.
 *
 * Yang ditempel orang jarang rapi: ada "/edit?usp=sharing", ada "#gid=123",
 * ada "?gid=123#gid=123", ada tautan "Publikasikan ke web". Semuanya diterima.
 * Yang BUKAN docs.google.com ditolak, dan itu juga yang membuat jalur ini
 * aman: alamat yang diambil selalu kita susun sendiri dari id-nya, tidak
 * pernah alamat mentah dari orang.
 */
export function uraiAlamatSheet(masukan: string): AlamatSheet | null {
  let url: URL;
  try {
    url = new URL(masukan.trim());
  } catch {
    return null;
  }
  if (url.hostname !== "docs.google.com") return null;

  const gidDari = (teks: string) => teks.match(/(?:^|[?&#])gid=(\d+)/)?.[1] ?? null;
  const gid = gidDari(url.hash) ?? gidDari(url.search);

  const terbit = url.pathname.match(/^\/spreadsheets\/d\/e\/([A-Za-z0-9_-]{20,})/);
  if (terbit) return { jenis: "terbit", id: terbit[1], gid };

  const biasa = url.pathname.match(/^\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})/);
  if (biasa) return { jenis: "biasa", id: biasa[1], gid };

  return null;
}

/** Bentuk baku yang disimpan, supaya Sheet yang sama tidak tersambung dua kali. */
export function alamatBaku(a: AlamatSheet): string {
  const dasar =
    a.jenis === "terbit"
      ? `https://docs.google.com/spreadsheets/d/e/${a.id}/pubhtml`
      : `https://docs.google.com/spreadsheets/d/${a.id}/edit`;
  return a.gid ? `${dasar}#gid=${a.gid}` : dasar;
}

// ─── Galat ────────────────────────────────────────────────────────────────────

/**
 * Galat yang pesannya aman ditampilkan ke pemilik toko apa adanya.
 *
 * `sementara` membedakan "coba lagi nanti" dari "kamu perlu mengubah sesuatu".
 * Dua-duanya tetap ditampilkan, tapi yang sementara tidak boleh terbaca
 * seperti kesalahan dia.
 */
export class GalatSheet extends Error {
  constructor(
    message: string,
    readonly sementara = false,
  ) {
    super(message);
  }
}

function pesanTidakBoleh(): string {
  const robot = emailRobot();
  return robot
    ? `Palwise belum boleh membuka Sheet ini. Buka Sheet-nya, tekan Bagikan, lalu tambahkan ${robot}. Atau ubah aksesnya jadi "Siapa saja yang memiliki link".`
    : `Palwise belum boleh membuka Sheet ini. Buka Sheet-nya, tekan Bagikan, lalu ubah Akses umum jadi "Siapa saja yang memiliki link".`;
}

// ─── Akun layanan (robot) ─────────────────────────────────────────────────────

interface KunciRobot {
  client_email: string;
  private_key: string;
}

let kunciTerbaca: KunciRobot | null | undefined;

function bacaKunci(): KunciRobot | null {
  if (kunciTerbaca !== undefined) return kunciTerbaca;
  kunciTerbaca = null;
  try {
    const mentah = env.GOOGLE_SERVICE_ACCOUNT_JSON
      ? env.GOOGLE_SERVICE_ACCOUNT_JSON
      : env.GOOGLE_SERVICE_ACCOUNT_FILE
        ? fs.readFileSync(env.GOOGLE_SERVICE_ACCOUNT_FILE, "utf8")
        : "";
    if (!mentah) return null;
    const json = JSON.parse(mentah);
    if (typeof json.client_email === "string" && typeof json.private_key === "string") {
      kunciTerbaca = {
        client_email: json.client_email,
        // Kunci yang ditempel ke .env sebagai satu baris membawa "\n" harfiah.
        private_key: json.private_key.replace(/\\n/g, "\n"),
      };
    }
  } catch {
    kunciTerbaca = null;
  }
  return kunciTerbaca;
}

/** Untuk selftest: lupakan kunci yang sudah terbaca. */
export function lupakanKunciRobot(): void {
  kunciTerbaca = undefined;
  tokenTersimpan = null;
}

/** Alamat email yang ditulis pemilik toko di tombol Bagikan. Null = belum dipasang. */
export function emailRobot(): string | null {
  return bacaKunci()?.client_email ?? null;
}

let tokenTersimpan: { token: string; sampai: number } | null = null;

function b64url(data: Buffer | string): string {
  return Buffer.from(data).toString("base64url");
}

async function tokenAkses(): Promise<string> {
  const kunci = bacaKunci();
  if (!kunci) throw new GalatSheet("Sambungan Google belum dipasang di server Palwise.");
  if (tokenTersimpan && tokenTersimpan.sampai > Date.now() + 60_000) {
    return tokenTersimpan.token;
  }

  const sekarang = Math.floor(Date.now() / 1000);
  const kepala = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const isi = b64url(
    JSON.stringify({
      iss: kunci.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      iat: sekarang,
      exp: sekarang + 3600,
    }),
  );
  const tanda = crypto
    .createSign("RSA-SHA256")
    .update(`${kepala}.${isi}`)
    .sign(kunci.private_key);
  const jwt = `${kepala}.${isi}.${b64url(tanda)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }).toString(),
  });
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!res.ok || !json.access_token) {
    throw new GalatSheet("Sambungan Google di server Palwise sedang bermasalah. Kami sudah dikabari.", true);
  }
  tokenTersimpan = {
    token: json.access_token,
    sampai: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return json.access_token;
}

/** Panggil Sheets API sebagai robot. Galat HTTP diubah jadi kalimat manusia. */
async function panggilApi<T>(
  jalur: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const token = await tokenAkses();
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${jalur}`, {
    method: init?.method ?? "GET",
    headers: {
      authorization: `Bearer ${token}`,
      ...(init?.body ? { "content-type": "application/json" } : {}),
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  if (res.ok) return (await res.json().catch(() => ({}))) as T;

  if (res.status === 403 || res.status === 401) throw new GalatSheet(pesanTidakBoleh());
  if (res.status === 404) throw new GalatSheet("Sheet-nya tidak ketemu. Mungkin sudah dihapus, atau tautannya salah salin.");
  if (res.status === 429 || res.status >= 500) {
    throw new GalatSheet("Google sedang sibuk. Palwise mencoba lagi otomatis sebentar lagi.", true);
  }
  const teks = await res.text().catch(() => "");
  throw new GalatSheet(`Google menolak permintaannya (${res.status}). ${teks.slice(0, 160)}`.trim());
}

function kutipTab(nama: string): string {
  return `'${nama.replace(/'/g, "''")}'`;
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

/**
 * Pengurai CSV kecil (RFC 4180): tanda kutip ganda, koma dan pindah baris di
 * dalam sel, "" sebagai kutip di dalam kutip. Deskripsi produk sering memuat
 * koma dan pindah baris, dan pemecah per koma polos membelah satu barang jadi
 * dua baris palsu.
 */
export function uraiCsv(teks: string): string[][] {
  const hasil: string[][] = [];
  let baris: string[] = [];
  let sel = "";
  let dalamKutip = false;
  const s = teks.replace(/^﻿/, "");

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (dalamKutip) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          sel += '"';
          i++;
        } else {
          dalamKutip = false;
        }
      } else {
        sel += c;
      }
      continue;
    }
    if (c === '"') dalamKutip = true;
    else if (c === ",") {
      baris.push(sel);
      sel = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      baris.push(sel);
      hasil.push(baris);
      baris = [];
      sel = "";
    } else sel += c;
  }
  if (sel !== "" || baris.length > 0) {
    baris.push(sel);
    hasil.push(baris);
  }
  return hasil;
}

// ─── Membaca ──────────────────────────────────────────────────────────────────

export interface IsiSheet {
  baris: string[][];
  /** Nama berkas dan tab, untuk judul catatan kalau orangnya tidak mengisi. */
  judul: string | null;
}

const MAKS_BYTE_CSV = 6 * 1024 * 1024;

/**
 * Jalur tanpa robot: ekspor CSV untuk Sheet yang dibagikan lewat link.
 *
 * Google menjawab ekspor dengan pengalihan ke googleusercontent.com, dan untuk
 * Sheet pribadi mengalihkan ke halaman masuk. Jadi pengalihannya diikuti
 * MANUAL dan cuma ke dua rumah itu. "redirect: follow" akan dengan senang hati
 * mengembalikan halaman login HTML berstatus 200, dan halaman login itu lalu
 * dihafal sebagai daftar harga.
 */
async function ambilCsvPublik(a: AlamatSheet): Promise<IsiSheet> {
  let url =
    a.jenis === "terbit"
      ? `https://docs.google.com/spreadsheets/d/e/${a.id}/pub?output=csv&single=true${a.gid ? `&gid=${a.gid}` : ""}`
      : `https://docs.google.com/spreadsheets/d/${a.id}/export?format=csv${a.gid ? `&gid=${a.gid}` : ""}`;

  for (let lompat = 0; lompat < 5; lompat++) {
    let res: Response;
    try {
      res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(30_000) });
    } catch {
      throw new GalatSheet("Google tidak bisa dihubungi. Palwise mencoba lagi otomatis sebentar lagi.", true);
    }

    if (res.status >= 300 && res.status < 400) {
      const ke = res.headers.get("location");
      if (!ke) throw new GalatSheet(pesanTidakBoleh());
      const tujuan = new URL(ke, url);
      const aman =
        tujuan.protocol === "https:" &&
        (tujuan.hostname === "docs.google.com" ||
          tujuan.hostname.endsWith(".googleusercontent.com"));
      if (!aman) throw new GalatSheet(pesanTidakBoleh());
      url = tujuan.toString();
      continue;
    }

    if (res.status === 401 || res.status === 403) throw new GalatSheet(pesanTidakBoleh());
    if (res.status === 404 || res.status === 400) {
      throw new GalatSheet("Sheet-nya tidak ketemu. Mungkin sudah dihapus, tabnya dihapus, atau tautannya salah salin.");
    }
    if (!res.ok) {
      throw new GalatSheet("Google sedang sibuk. Palwise mencoba lagi otomatis sebentar lagi.", true);
    }

    const jenis = res.headers.get("content-type") ?? "";
    if (jenis.includes("text/html")) throw new GalatSheet(pesanTidakBoleh());

    const panjang = Number(res.headers.get("content-length") ?? 0);
    if (panjang > MAKS_BYTE_CSV) {
      throw new GalatSheet("Sheet-nya terlalu besar untuk dibaca sekaligus. Pisahkan jadi beberapa tab, lalu sambungkan tab yang dipakai asisten saja.");
    }
    const teks = await res.text();
    if (teks.length > MAKS_BYTE_CSV) {
      throw new GalatSheet("Sheet-nya terlalu besar untuk dibaca sekaligus. Pisahkan jadi beberapa tab, lalu sambungkan tab yang dipakai asisten saja.");
    }

    // Nama berkas ikut dikirim di kepala unduhan: "Nama Sheet - Tab.csv".
    const cd = res.headers.get("content-disposition") ?? "";
    const nama =
      decodeURIComponent(cd.match(/filename\*=UTF-8''([^;]+)/i)?.[1] ?? "") ||
      cd.match(/filename="([^"]+)"/i)?.[1] ||
      "";
    return { baris: uraiCsv(teks), judul: nama.replace(/\.csv$/i, "").trim() || null };
  }
  throw new GalatSheet(pesanTidakBoleh());
}

/** Jalur robot: Sheet pribadi yang dibagikan ke email robot. */
async function ambilLewatRobot(a: AlamatSheet): Promise<IsiSheet> {
  const meta = await panggilApi<{
    properties?: { title?: string };
    sheets?: { properties?: { sheetId?: number; title?: string } }[];
  }>(`${a.id}?fields=properties.title,sheets.properties(sheetId,title)`);

  const tab =
    meta.sheets?.find((s) => a.gid !== null && String(s.properties?.sheetId) === a.gid) ??
    meta.sheets?.[0];
  const namaTab = tab?.properties?.title;
  if (!namaTab) throw new GalatSheet("Sheet-nya kosong, tidak ada satu tab pun.");
  if (a.gid !== null && String(tab?.properties?.sheetId) !== a.gid) {
    throw new GalatSheet("Tab yang ada di tautan itu sudah tidak ada. Salin ulang tautannya dari tab yang mau dipakai.");
  }

  const nilai = await panggilApi<{ values?: unknown[][] }>(
    `${a.id}/values/${encodeURIComponent(kutipTab(namaTab))}?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`,
  );
  const baris = (nilai.values ?? []).map((r) => r.map((v) => (v == null ? "" : String(v))));
  const judulBerkas = meta.properties?.title?.trim();
  return {
    baris,
    judul: judulBerkas ? `${judulBerkas} - ${namaTab}` : namaTab,
  };
}

/**
 * Baca isi satu tab. Robot dicoba duluan kalau dipasang, karena dia yang bisa
 * membuka Sheet pribadi; kalau robot ditolak, jalur link publik masih dicoba,
 * karena pemiliknya mungkin memilih membagikan lewat link saja.
 */
export async function ambilIsiSheet(masukan: string): Promise<IsiSheet> {
  const a = uraiAlamatSheet(masukan);
  if (!a) {
    throw new GalatSheet(
      "Itu bukan tautan Google Sheet. Buka Sheet-nya, salin alamat dari kolom alamat browser, lalu tempel di sini.",
    );
  }

  if (emailRobot() && a.jenis === "biasa") {
    try {
      return await ambilLewatRobot(a);
    } catch (err) {
      // Yang sementara (Google sibuk) langsung dilaporkan, jangan ditutupi
      // jalur lain yang galatnya menyesatkan.
      if (err instanceof GalatSheet && err.sementara) throw err;
    }
  }
  return ambilCsvPublik(a);
}

// ─── Menulis data pelanggan ───────────────────────────────────────────────────

export const NAMA_TAB_PELANGGAN = "Pelanggan Palwise";

/**
 * Tulis ulang tab pelanggan: pastikan tabnya ada, kosongkan, isi dari A1.
 *
 * Nilainya ditulis RAW, bukan USER_ENTERED, dan itu keputusan keamanan.
 * Nama dan catatan pelanggan diketik orang luar. Dengan USER_ENTERED, pelanggan
 * yang menulis namanya "=IMPORTXML(...)" membuat Sheet pemilik toko menjalankan
 * rumus itu. RAW menyimpan semuanya sebagai teks apa adanya, termasuk nomor
 * telepon yang kalau tidak begitu berubah jadi 6,28E+12.
 *
 * Ditulis lewat append OVERWRITE, bukan update, karena update menolak menulis
 * melewati jumlah baris tab (1.000 bawaan). Append memperluas tabnya sendiri.
 */
export async function tulisTabPelanggan(
  spreadsheetId: string,
  baris: string[][],
): Promise<void> {
  const meta = await panggilApi<{ sheets?: { properties?: { title?: string } }[] }>(
    `${spreadsheetId}?fields=sheets.properties.title`,
  );
  const ada = meta.sheets?.some((s) => s.properties?.title === NAMA_TAB_PELANGGAN);
  if (!ada) {
    await panggilApi(`${spreadsheetId}:batchUpdate`, {
      method: "POST",
      body: {
        requests: [
          {
            addSheet: {
              properties: {
                title: NAMA_TAB_PELANGGAN,
                gridProperties: { frozenRowCount: 1 },
              },
            },
          },
        ],
      },
    });
  }

  const rentang = encodeURIComponent(kutipTab(NAMA_TAB_PELANGGAN));
  await panggilApi(`${spreadsheetId}/values/${rentang}:clear`, { method: "POST", body: {} });
  await panggilApi(
    `${spreadsheetId}/values/${encodeURIComponent(`${kutipTab(NAMA_TAB_PELANGGAN)}!A1`)}:append?valueInputOption=RAW&insertDataOption=OVERWRITE`,
    { method: "POST", body: { majorDimension: "ROWS", values: baris } },
  );
}

/** Sidik jari isi, untuk melewati tulis ulang yang isinya tidak berubah. */
export function sidikIsi(baris: string[][]): string {
  return crypto.createHash("sha256").update(JSON.stringify(baris)).digest("hex").slice(0, 32);
}
