import {
  HANYA_PELANGGAN_ASLI,
  displayName,
  parseJsonArray,
  prisma,
} from "@palwise/db";
import { aiConfigured, env } from "../env.js";
import { getLlm } from "../ai/provider.js";
import { textMessage } from "../ai/types.js";
import { parseJsonLoose } from "../ai/agent.js";
import { log } from "../lib/log.js";
import { indexSource } from "../ai/rag.js";
import {
  GalatSheet,
  alamatBaku,
  ambilIsiSheet,
  emailRobot,
  sidikIsi,
  tulisTabPelanggan,
  uraiAlamatSheet,
} from "./sheets.js";
import {
  PROMPT_STRUKTUR,
  contohUntukAi,
  jelaskanStruktur,
  rapikanJudul,
  rapikanTabel,
  sidikBentuk,
  susunCatatan,
  tebakStruktur,
  terimaJawabanAi,
  type HasilCatatan,
  type Struktur,
} from "./strukturSheet.js";

/**
 * Jarak antar sinkron otomatis untuk Info bisnis dari Sheet.
 *
 * Setengah jam, bukan tiap menit. Yang dibayar tiap kali isinya BERUBAH cuma
 * embedding potongan yang berubah (lihat indexSource), jadi biayanya kecil,
 * tapi jatah baca Google dipakai bersama semua akun di satu robot. Stok yang
 * telat setengah jam masih jauh lebih benar daripada stok yang ditempel manual
 * minggu lalu, dan pemiliknya selalu bisa menekan "Perbarui sekarang".
 */
export const JEDA_SINKRON_MENIT = 30;
/** Salinan data pelanggan ke Sheet. */
export const JEDA_SALIN_MENIT = 15;

function pesan(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// ─── Info bisnis dari Sheet ───────────────────────────────────────────────────

/** Bacaan bentuk Sheet yang disimpan di KnowledgeSource.sheetStruktur. */
interface Simpanan {
  sidik: string;
  struktur: Struktur;
  /** Kalimat untuk pemilik toko, lihat jelaskanStruktur. */
  bacaan: string;
  pada: number;
}

/** AI yang gagal membaca bentuk dicoba lagi paling cepat sesudah ini. */
const JEDA_ULANG_AI_MS = 6 * 60 * 60 * 1000;

function bacaSimpanan(json: string | null | undefined): Simpanan | null {
  if (!json) return null;
  try {
    const s = JSON.parse(json) as Simpanan;
    return s && typeof s.sidik === "string" && s.struktur ? s : null;
  } catch {
    return null;
  }
}

/**
 * Pahami bentuk Sheet, lalu susun catatannya.
 *
 * AI dipanggil SEKALI per bentuk tabel, bukan tiap sinkron. Bentuknya dikenali
 * lewat sidikBentuk: stok dan harga yang berubah tidak mengubahnya, judul
 * kolom yang diganti atau kolom baru mengubahnya. Jadi satu Sheet biasanya
 * cuma sekali dibaca AI seumur hidupnya, sekitar satu dua rupiah.
 *
 * AI tidak pernah menyentuh isi sel, lihat catatan di strukturSheet.ts. Kalau
 * AI mati atau jawabannya tidak masuk akal, tebakan kode yang dipakai, dan
 * tebakan itu sudah menangani judul di baris ke sekian, nama bagian, sel
 * gabungan, kolom nomor urut, dan kolom harga modal.
 */
async function bacaPintar(
  mentah: string[][],
  simpananJson: string | null | undefined,
): Promise<{ hasil: HasilCatatan; simpanan: Simpanan }> {
  const tabel = rapikanTabel(mentah);
  const tebakan = tebakStruktur(tabel);
  const sidik = sidikBentuk(tabel, tebakan);
  const lama = bacaSimpanan(simpananJson);

  let struktur: Struktur = tebakan;
  let pada = Date.now();
  const bolehPakaiLama =
    lama &&
    lama.sidik === sidik &&
    (lama.struktur.sumber === "ai" ||
      !aiConfigured() ||
      Date.now() - lama.pada < JEDA_ULANG_AI_MS);

  if (bolehPakaiLama && lama) {
    struktur = lama.struktur;
    pada = lama.pada;
  } else if (aiConfigured() && tabel.length > 0) {
    try {
      const jawab = await getLlm().complete({
        system: PROMPT_STRUKTUR,
        messages: [textMessage("user", contohUntukAi(tabel))],
        temperature: 0,
        maxTokens: 800,
        json: true,
      });
      const diterima = terimaJawabanAi(parseJsonLoose(jawab), tabel, tebakan);
      if (diterima) struktur = diterima;
      else log.warn("bacaan bentuk Sheet dari AI tidak masuk akal, pakai tebakan kode");
    } catch (err) {
      log.warn(`AI gagal membaca bentuk Sheet, pakai tebakan kode: ${pesan(err)}`);
    }
  }

  const hasil = susunCatatan(tabel, struktur);
  return {
    hasil,
    simpanan: { sidik, struktur, bacaan: jelaskanStruktur(tabel, struktur, hasil), pada },
  };
}

function keteranganTerbaca(h: { jumlahBaris: number; terbaca: number }): string | null {
  if (h.terbaca >= h.jumlahBaris) return null;
  return `Sheet-nya ${h.jumlahBaris.toLocaleString("id-ID")} baris, yang muat di satu catatan ${h.terbaca.toLocaleString("id-ID")} baris pertama. Pisahkan sisanya ke tab lain, lalu sambungkan tab itu sebagai catatan kedua.`;
}

export interface HasilTambah {
  sourceId: string;
  judul: string;
  jumlahBaris: number;
  terbaca: number;
  /** Sheet yang sama sudah tersambung ke asisten ini sebelumnya. */
  sudahAda: boolean;
  dihafal: boolean;
}

/**
 * Sambungkan satu tab Sheet sebagai catatan Info bisnis.
 *
 * Sheet-nya DIBACA DULU, baru catatannya dibuat. Kalau urutannya dibalik,
 * Sheet yang belum dibagikan meninggalkan catatan kosong berstatus gagal, dan
 * catatan kosong itu tetap memakan jatah catatan paketnya.
 */
export async function tambahSumberSheet(input: {
  agentId: string;
  url: string;
  judul?: string;
}): Promise<HasilTambah> {
  const alamat = uraiAlamatSheet(input.url);
  if (!alamat) {
    throw new GalatSheet(
      "Itu bukan tautan Google Sheet. Buka Sheet-nya, salin alamat dari kolom alamat browser, lalu tempel di sini.",
    );
  }
  const baku = alamatBaku(alamat);

  const lama = await prisma.knowledgeSource.findFirst({
    where: { agentId: input.agentId, sheetUrl: baku },
    select: { id: true, title: true },
  });
  if (lama) {
    await sinkronSumberSheet(lama.id);
    return {
      sourceId: lama.id,
      judul: lama.title,
      jumlahBaris: 0,
      terbaca: 0,
      sudahAda: true,
      dihafal: true,
    };
  }

  const isi = await ambilIsiSheet(baku);
  const { hasil, simpanan } = await bacaPintar(isi.baris, null);
  if (hasil.jumlahBaris === 0 || !hasil.teks) {
    throw new GalatSheet(
      "Tab itu kosong, atau cuma berisi judul tanpa data di bawahnya. Pastikan tautannya dari tab yang berisi daftar barang atau harganya.",
    );
  }

  const judul = (
    input.judul?.trim() ||
    rapikanJudul(isi.judul, hasil.judulAtas) ||
    "Google Sheet"
  ).slice(0, 120);
  const sekarang = new Date();
  const source = await prisma.knowledgeSource.create({
    data: {
      agentId: input.agentId,
      type: "sheet",
      title: judul,
      content: hasil.teks,
      status: "pending",
      sheetUrl: baku,
      sheetDisinkron: sekarang,
      sheetDicek: sekarang,
      sheetCatatan: keteranganTerbaca(hasil),
      sheetStruktur: JSON.stringify(simpanan),
    },
  });
  // Catatannya sudah tersimpan, jadi gagal menghafal tidak boleh terbaca
  // sebagai gagal menyambung. Galatnya tercatat di catatannya sendiri dan
  // dicoba lagi otomatis.
  const dihafal = await indexSource(source.id)
    .then(() => true)
    .catch((err) => {
      log.warn(`hafal sheet baru "${judul}" gagal: ${pesan(err)}`);
      return false;
    });
  return {
    sourceId: source.id,
    judul,
    jumlahBaris: hasil.jumlahBaris,
    terbaca: hasil.terbaca,
    sudahAda: false,
    dihafal,
  };
}

export interface HasilSinkron {
  berubah: boolean;
  galat: string | null;
}

/**
 * Baca ulang satu Sheet dan hafalkan ulang kalau isinya berubah.
 *
 * GAGAL TIDAK MENGOSONGKAN apa pun. Isi terakhir yang berhasil tetap dipakai
 * asisten, dan galatnya dicatat supaya kelihatan di layar. Sheet yang sebentar
 * tidak bisa dibuka (Google sibuk, orangnya salah klik di pengaturan berbagi)
 * tidak boleh berubah jadi asisten yang mendadak lupa semua harga.
 *
 * Sheet yang dikosongkan pemiliknya diperlakukan sama: itu hampir selalu salah
 * hapus atau tab yang tertukar, bukan "tokonya tutup". Yang benar menghapus
 * catatannya di Palwise.
 */
export async function sinkronSumberSheet(sourceId: string): Promise<HasilSinkron> {
  const source = await prisma.knowledgeSource.findUnique({ where: { id: sourceId } });
  if (!source || source.type !== "sheet" || !source.sheetUrl) {
    throw new Error("Catatan ini bukan dari Google Sheet.");
  }
  const sekarang = new Date();

  try {
    const isi = await ambilIsiSheet(source.sheetUrl);
    const { hasil, simpanan } = await bacaPintar(isi.baris, source.sheetStruktur);
    if (hasil.jumlahBaris === 0 || !hasil.teks) {
      throw new GalatSheet(
        "Tab-nya sekarang kosong. Isi terakhir tetap dipakai asisten sampai tabnya diisi lagi, atau hapus catatan ini kalau memang sudah tidak dipakai.",
      );
    }

    const berubah = hasil.teks !== source.content || source.status !== "ready";
    await prisma.knowledgeSource.update({
      where: { id: sourceId },
      data: {
        sheetDicek: sekarang,
        sheetDisinkron: sekarang,
        sheetGagal: null,
        sheetCatatan: keteranganTerbaca(hasil),
        sheetStruktur: JSON.stringify(simpanan),
        ...(berubah ? { content: hasil.teks, status: "pending", error: null } : {}),
      },
    });
    // Gagal MENGHAFAL itu urusan lain dari gagal MEMBACA Sheet, dan sudah
    // dicatat indexSource di kolom error catatannya sendiri. Putaran berikutnya
    // mencoba lagi karena statusnya belum "ready".
    if (berubah) {
      await indexSource(sourceId).catch((err) =>
        log.warn(`hafal ulang sheet "${source.title}" gagal: ${pesan(err)}`),
      );
    }
    return { berubah, galat: null };
  } catch (err) {
    const galat = pesan(err);
    await prisma.knowledgeSource.update({
      where: { id: sourceId },
      data: { sheetDicek: sekarang, sheetGagal: galat.slice(0, 500) },
    });
    return { berubah: false, galat };
  }
}

// ─── Data pelanggan ke Sheet ──────────────────────────────────────────────────

const KOLOM_PELANGGAN = [
  "Nama",
  "Nomor WhatsApp",
  "Tahap",
  "Label",
  "Masalah",
  "Masalah sejak",
  "Mengaku sudah bayar",
  "Janji temu",
  "Janji dipastikan",
  "Catatan janji",
  "Catatan",
  "Ringkasan AI",
  "Chat terakhir",
  "Pertama chat",
  "Buka di Palwise",
];

/** "2026-09-11 14:30" waktu setempat. Urut dengan benar walau disimpan teks. */
function tanggal(d: Date | null | undefined): string {
  if (!d) return "";
  const b = new Intl.DateTimeFormat("sv-SE", {
    timeZone: env.TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return b.replace(",", "");
}

function alamatApp(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
}

/** Semua pelanggan sungguhan satu akun, siap ditulis. Baris pertama judul kolom. */
export async function barisPelanggan(workspaceId: string): Promise<string[][]> {
  const kontak = await prisma.contact.findMany({
    where: { workspaceId, ...HANYA_PELANGGAN_ASLI },
    orderBy: { createdAt: "asc" },
    include: {
      conversations: {
        select: { lastMessageAt: true },
        orderBy: { lastMessageAt: "desc" },
        take: 1,
      },
    },
  });

  const app = alamatApp();
  const baris = kontak.map((c) => [
    displayName(c),
    c.phone ?? "",
    c.stage,
    parseJsonArray(c.tags).join(", "),
    c.masalah ?? "",
    tanggal(c.masalahSejak),
    tanggal(c.klaimBayarSejak),
    tanggal(c.janjiPada),
    c.janjiPada ? (c.janjiDipastikan ? "Ya" : "Belum") : "",
    c.janjiCatatan ?? "",
    c.notes ?? "",
    c.ringkasan ?? "",
    tanggal(c.conversations[0]?.lastMessageAt),
    tanggal(c.createdAt),
    app ? `${app}/app/kontak/${c.id}` : "",
  ]);
  return [KOLOM_PELANGGAN, ...baris];
}

export interface HasilSalin {
  jumlah: number;
  ditulis: boolean;
}

/**
 * Salin data pelanggan satu akun ke Sheet-nya.
 *
 * Kalau isinya sama dengan salinan terakhir, tidak ditulis ulang. Galat
 * dicatat di baris sambungan dan DILEMPAR lagi, supaya tombol "Salin
 * sekarang" bisa menampilkannya saat itu juga.
 */
export async function salinPelangganKeSheet(
  workspaceId: string,
  opsi: { paksa?: boolean } = {},
): Promise<HasilSalin> {
  const sambungan = await prisma.sambunganSheet.findUnique({ where: { workspaceId } });
  if (!sambungan) throw new Error("Belum ada Sheet yang disambungkan.");
  const sekarang = new Date();

  try {
    const baris = await barisPelanggan(workspaceId);
    const sidik = sidikIsi(baris);
    const jumlah = baris.length - 1;

    if (!opsi.paksa && sidik === sambungan.sidik && !sambungan.galat) {
      await prisma.sambunganSheet.update({
        where: { workspaceId },
        data: { terakhirCoba: sekarang },
      });
      return { jumlah, ditulis: false };
    }

    await tulisTabPelanggan(sambungan.spreadsheetId, baris);
    await prisma.sambunganSheet.update({
      where: { workspaceId },
      data: {
        terakhirCoba: sekarang,
        terakhirKirim: sekarang,
        jumlahBaris: jumlah,
        sidik,
        galat: null,
      },
    });
    return { jumlah, ditulis: true };
  } catch (err) {
    await prisma.sambunganSheet.update({
      where: { workspaceId },
      data: { terakhirCoba: sekarang, galat: pesan(err).slice(0, 500) },
    });
    throw err;
  }
}

/**
 * Pasang (atau ganti) Sheet tujuan, lalu langsung salin sekali.
 *
 * Salinan pertama sekaligus jadi ujinya. Kalau robot belum diberi akses, orangnya
 * tahu SEKARANG, di layar yang sama, bukan besok dari tab yang tidak pernah
 * terisi.
 */
export async function pasangSambunganPelanggan(
  workspaceId: string,
  url: string,
): Promise<HasilSalin> {
  if (!emailRobot()) {
    throw new GalatSheet("Menyalin ke Google Sheet belum dipasang di server Palwise.");
  }
  const alamat = uraiAlamatSheet(url);
  if (!alamat) {
    throw new GalatSheet(
      "Itu bukan tautan Google Sheet. Buka Sheet-nya, salin alamat dari kolom alamat browser, lalu tempel di sini.",
    );
  }
  if (alamat.jenis === "terbit") {
    throw new GalatSheet(
      "Itu tautan \"Publikasikan ke web\", yang cuma bisa dibaca. Salin alamat Sheet-nya dari kolom alamat browser waktu Sheet-nya sedang dibuka.",
    );
  }

  const data = {
    sheetUrl: alamatBaku({ ...alamat, gid: null }),
    spreadsheetId: alamat.id,
    aktif: true,
    sidik: null,
    galat: null,
  };
  await prisma.sambunganSheet.upsert({
    where: { workspaceId },
    create: { workspaceId, ...data },
    update: data,
  });
  return salinPelangganKeSheet(workspaceId, { paksa: true });
}

// ─── Penjadwal ────────────────────────────────────────────────────────────────

/** Satu putaran: Sheet yang sudah waktunya dibaca, dan salinan yang sudah waktunya dikirim. */
export async function runSheetTick(): Promise<{ dibaca: number; disalin: number }> {
  const batasBaca = new Date(Date.now() - JEDA_SINKRON_MENIT * 60_000);
  const sumber = await prisma.knowledgeSource.findMany({
    where: {
      type: "sheet",
      sheetUrl: { not: null },
      OR: [{ sheetDicek: null }, { sheetDicek: { lt: batasBaca } }],
    },
    orderBy: { sheetDicek: "asc" },
    take: 25,
    select: { id: true, title: true },
  });

  let dibaca = 0;
  for (const s of sumber) {
    try {
      const h = await sinkronSumberSheet(s.id);
      dibaca++;
      if (h.berubah) log.info(`sheet "${s.title}" berubah, dihafal ulang`);
    } catch (err) {
      log.warn(`sinkron sheet "${s.title}" gagal: ${pesan(err)}`);
    }
  }

  let disalin = 0;
  if (emailRobot()) {
    const batasSalin = new Date(Date.now() - JEDA_SALIN_MENIT * 60_000);
    const sambungan = await prisma.sambunganSheet.findMany({
      where: {
        aktif: true,
        OR: [{ terakhirCoba: null }, { terakhirCoba: { lt: batasSalin } }],
      },
      orderBy: { terakhirCoba: "asc" },
      take: 25,
      select: { workspaceId: true },
    });
    for (const s of sambungan) {
      try {
        const h = await salinPelangganKeSheet(s.workspaceId);
        if (h.ditulis) disalin++;
      } catch (err) {
        log.warn(`salin pelanggan ke sheet gagal (${s.workspaceId}): ${pesan(err)}`);
      }
    }
  }

  return { dibaca, disalin };
}

const TICK_MS = 5 * 60 * 1000;

export function startSheetScheduler(): NodeJS.Timeout {
  log.info(
    `sambungan Google Sheet aktif (baca tiap ${JEDA_SINKRON_MENIT} menit, salin pelanggan tiap ${JEDA_SALIN_MENIT} menit${emailRobot() ? "" : ", robot belum dipasang"})`,
  );
  let jalan = false;
  const putar = () => {
    // Putaran yang lambat (Google sibuk, puluhan Sheet) tidak boleh ditumpuk
    // putaran berikutnya, kalau tidak Sheet yang sama dibaca dua kali bersamaan.
    if (jalan) return;
    jalan = true;
    runSheetTick()
      .catch((err) => log.error(`penjadwal sheet error: ${pesan(err)}`))
      .finally(() => {
        jalan = false;
      });
  };
  const awal = setTimeout(putar, 60_000);
  awal.unref?.();
  const timer = setInterval(putar, TICK_MS);
  timer.unref?.();
  return timer;
}
