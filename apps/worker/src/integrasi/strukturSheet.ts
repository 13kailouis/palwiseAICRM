import crypto from "node:crypto";

/**
 * Memahami BENTUK Sheet sungguhan, yang jarang rapi.
 *
 * Sheet toko Indonesia yang sungguhan hampir tidak pernah berbentuk "baris 1
 * judul kolom, sisanya data". Yang biasa ketemu:
 *
 *   DAFTAR HARGA TOKO BERKAH APRIL 2026          ← judul di atas tabel
 *   Harga belum termasuk ongkir                   ← catatan
 *                                                 ← baris kosong
 *   No | Nama Barang | Hrg | Qty | Modal | Ket    ← judul kolom di baris 4
 *   MAKANAN                                       ← nama bagian
 *   1  | Keripik     | 15rb| 20  | 9000  |
 *   2  | Basreng     | 12rb| 0   | 7000  | PO
 *   MINUMAN
 *   ...
 *
 * Membacanya dengan aturan "baris pertama = judul" menghasilkan catatan yang
 * menyebut "DAFTAR HARGA TOKO BERKAH APRIL 2026: Keripik", dan lebih buruk,
 * membocorkan harga MODAL ke pembeli.
 *
 * Pembagian kerjanya tegas, dan ini keputusan terpenting di berkas ini:
 * - TEBAKAN (kode) dan AI boleh memutuskan BENTUKNYA saja: baris judul yang
 *   mana, kolom apa artinya, kolom mana yang dilewati atau rahasia.
 * - ISI SEL SELALU DISALIN KODE APA ADANYA. AI tidak pernah menulis ulang satu
 *   angka pun, jadi dia tidak bisa mengarang harga dan tidak bisa memotong
 *   daftar di tengah, dua kegagalan yang pernah terjadi di jalur impor lain.
 */

export interface Struktur {
  jenis: "tabel" | "kunciNilai" | "teks";
  /** Indeks baris judul kolom di tabel. -1 = tidak ada judul kolom. */
  barisJudul: number;
  /** Satu nama per kolom. Kosong = pakai "Kolom X". */
  namaKolom: string[];
  /** Kolom yang tidak berarti: nomor urut, kolom bantu. */
  abaikan: number[];
  /** Kolom data internal yang TIDAK BOLEH sampai ke pembeli. */
  rahasia: number[];
  /** Kolom hasil gabung sel (merge), diisi turun dari atas. */
  kelompok: number[];
  /** Seberapa yakin tebakan kode. Di bawah AMBANG_YAKIN, AI diminta membaca. */
  yakin: number;
  sumber: "tebakan" | "ai";
}

export const AMBANG_YAKIN = 0.75;

// ─── Jenis isi sel ────────────────────────────────────────────────────────────

const POLA_ANGKA =
  /^[-+]?\s*(rp\.?\s*|idr\s*)?[\d.,]+\s*(rb|ribu|k|jt|juta|%|pcs|gr|g|kg|ml|l|lusin|pak|box)?$/i;
const POLA_TANGGAL = /^\d{1,4}[-/.]\d{1,2}([-/.]\d{1,4})?$/;

export function adalahAngka(v: string): boolean {
  return v !== "" && POLA_ANGKA.test(v.trim());
}

/** Sel yang bentuknya seperti judul kolom: teks pendek, bukan angka, bukan tanggal. */
function miripJudul(v: string): boolean {
  const t = v.trim();
  return (
    t !== "" &&
    t.length <= 40 &&
    !adalahAngka(t) &&
    !POLA_TANGGAL.test(t) &&
    /[a-zA-Z]/.test(t)
  );
}

/**
 * Kolom yang dari namanya jelas data internal toko.
 *
 * Ini jaring pengaman KODE, berlaku walau AI tidak dipakai atau salah baca.
 * Harga modal yang terbaca asisten akan disebut ke pembeli yang menawar, dan
 * itu kerugian yang tidak bisa ditarik balik. "Harga jual" dan "harga" polos
 * sengaja TIDAK kena.
 */
const POLA_RAHASIA =
  /\b(modal|hpp|harga\s*beli|harga\s*pokok|harga\s*dasar|cost|supplier|suplier|pemasok|vendor|margin|untung|laba|profit|keuntungan|no\.?\s*(hp|wa|telp)\s*(supplier|pemasok)|catatan\s*internal|internal)\b/i;

export function namaRahasia(nama: string): boolean {
  return POLA_RAHASIA.test(nama);
}

const POLA_NOMOR_URUT = /^(no\.?|nomor|#|urut|no\s*urut)$/i;

// ─── Pembersihan awal ─────────────────────────────────────────────────────────

/**
 * Rapikan sel dan buang kolom yang kosong di SEMUA baris.
 *
 * Ekspor CSV Google membawa kolom kosong sampai kolom terakhir yang pernah
 * diformat, jadi tabel tiga kolom sering datang selebar 26 kolom. Baris kosong
 * TIDAK dibuang di sini: dia penanda batas antar tabel yang ditumpuk.
 */
export function rapikanTabel(tabel: string[][]): string[][] {
  const rapi = tabel.map((r) => r.map((c) => (c ?? "").replace(/\s+/g, " ").trim()));
  const lebar = Math.max(0, ...rapi.map((r) => r.length));
  const terpakai: number[] = [];
  for (let c = 0; c < lebar; c++) {
    if (rapi.some((r) => (r[c] ?? "") !== "")) terpakai.push(c);
  }
  const hasil = rapi.map((r) => terpakai.map((c) => r[c] ?? ""));
  // Baris kosong di ekor tidak berarti apa-apa.
  while (hasil.length && hasil[hasil.length - 1].every((c) => c === "")) hasil.pop();
  return hasil;
}

function terisi(r: string[]): number[] {
  const out: number[] = [];
  r.forEach((c, i) => {
    if (c !== "") out.push(i);
  });
  return out;
}

// ─── Tebakan kode ─────────────────────────────────────────────────────────────

/**
 * Tebak bentuk tabel tanpa AI. Selalu jalan, dan jadi cadangan kalau AI mati
 * atau jawabannya tidak masuk akal.
 */
export function tebakStruktur(tabel: string[][]): Struktur {
  const lebar = Math.max(0, ...tabel.map((r) => r.length));
  const kosong: Struktur = {
    jenis: "tabel",
    barisJudul: -1,
    namaKolom: Array(lebar).fill(""),
    abaikan: [],
    rahasia: [],
    kelompok: [],
    yakin: 0,
    sumber: "tebakan",
  };
  if (lebar === 0) return kosong;

  // Satu kolom saja: daftar teks atau tanya jawab, bukan tabel.
  if (lebar === 1) return { ...kosong, jenis: "teks", yakin: 0.9 };

  // Cari baris judul di 15 baris terisi pertama.
  let terbaik = -1;
  let skorTerbaik = 0;
  let dicek = 0;
  for (let i = 0; i < tabel.length && dicek < 15; i++) {
    const sel = terisi(tabel[i]);
    if (sel.length === 0) continue;
    dicek++;
    if (sel.length < 2) continue;

    const nilai = sel.map((c) => tabel[i][c]);
    const fraksiJudul = nilai.filter(miripJudul).length / nilai.length;
    const unik = new Set(nilai.map((v) => v.toLowerCase())).size / nilai.length;

    // Di bawah judul yang benar ada data: ada angka, dan isinya beda dari judul.
    let adaAngkaDiBawah = false;
    let barisDataDiBawah = 0;
    for (let j = i + 1, n = 0; j < tabel.length && n < 8; j++) {
      const s = terisi(tabel[j]);
      if (s.length === 0) continue;
      n++;
      if (s.length >= 2) barisDataDiBawah++;
      if (s.some((c) => adalahAngka(tabel[j][c]))) adaAngkaDiBawah = true;
    }

    const cakupan = sel.length / lebar;
    const skor =
      sel.length * fraksiJudul * fraksiJudul * unik * (0.4 + 0.6 * cakupan) +
      (adaAngkaDiBawah ? 1.5 : 0) +
      (barisDataDiBawah >= 2 ? 1 : 0) -
      dicek * 0.05;
    if (fraksiJudul >= 0.6 && skor > skorTerbaik) {
      skorTerbaik = skor;
      terbaik = i;
    }
  }

  // Dua kolom tanpa judul yang jelas, kolom kedua berupa kalimat: itu daftar
  // "hal: keterangan" (jam buka, alamat, cara bayar), bukan tabel barang.
  // Tapi "Nama | Keterangan" di baris pertama itu judul kolom tabel biasa:
  // judul kolom pendek, sedangkan "Pembayaran | Transfer BCA, QRIS..." tidak.
  if (lebar === 2) {
    const data = tabel.filter((r) => r[0] && r[1]);
    const kalimat = data.filter((r) => !adalahAngka(r[1]) && r[1].length > 15).length;
    const pertama = tabel.findIndex((r) => terisi(r).length > 0);
    const judulPendek = terbaik === pertama && tabel[terbaik].every((c) => c.length <= 20);
    if (!judulPendek && data.length >= 2 && kalimat / data.length >= 0.5) {
      return { ...kosong, jenis: "kunciNilai", yakin: 0.7 };
    }
  }

  if (terbaik < 0) return { ...kosong, yakin: 0.2 };

  const judul = tabel[terbaik];
  const namaKolom = Array.from({ length: lebar }, (_, c) => judul[c] ?? "");
  const baris = tabel.slice(terbaik + 1).filter((r) => terisi(r).length > 0);

  // Kolom nomor urut: judulnya "No", isinya 1, 2, 3.
  const abaikan: number[] = [];
  namaKolom.forEach((nama, c) => {
    if (!POLA_NOMOR_URUT.test(nama.trim())) return;
    // Yang diperiksa cuma baris data (dua sel atau lebih, bukan judul yang
    // terulang). Nama bagian seperti "MAKANAN" duduk di kolom yang sama dan
    // jangan sampai membatalkan kenalnya.
    const isi = baris
      .filter((r) => terisi(r).length >= 2 && r[c].toLowerCase() !== nama.trim().toLowerCase())
      .map((r) => r[c])
      .filter(Boolean);
    if (isi.length && isi.every((v) => /^\d+\.?$/.test(v))) abaikan.push(c);
  });

  const rahasia = namaKolom.flatMap((n, c) => (n && namaRahasia(n) ? [c] : []));

  // Sel gabungan: kolom di sisi kiri yang cuma terisi di baris pertama tiap
  // kelompoknya, sementara baris di bawahnya punya data di kolom lain.
  const kelompok: number[] = [];
  for (const c of [0, 1]) {
    if (c >= lebar || abaikan.includes(c)) continue;
    const dataBaris = baris.filter((r) => terisi(r).filter((x) => x !== c).length >= 1);
    if (dataBaris.length < 4) continue;
    const kosongKolom = dataBaris.filter((r) => r[c] === "").length;
    const isiKolom = dataBaris.map((r) => r[c]).filter(Boolean);
    const rasio = kosongKolom / dataBaris.length;
    if (
      rasio >= 0.3 &&
      rasio <= 0.9 &&
      dataBaris[0][c] !== "" &&
      isiKolom.every((v) => !adalahAngka(v))
    ) {
      kelompok.push(c);
    }
  }

  const sel = terisi(judul);
  const semuaJudul = sel.every((c) => miripJudul(judul[c]));
  const judulKosong = namaKolom.filter((n, c) => !n && !abaikan.includes(c)).length;
  const yakin =
    semuaJudul && sel.length >= 2 && judulKosong === 0
      ? 0.9
      : semuaJudul && judulKosong <= 1
        ? 0.7
        : 0.4;

  return {
    jenis: "tabel",
    barisJudul: terbaik,
    namaKolom,
    abaikan,
    rahasia,
    kelompok,
    yakin,
    sumber: "tebakan",
  };
}

// ─── Menyusun catatan ─────────────────────────────────────────────────────────

/** Sama dengan MAX_CONTENT di dashboard. */
export const MAKS_HURUF_CATATAN_SHEET = 200_000;

export interface HasilCatatan {
  teks: string;
  /** Baris data, tanpa judul, catatan atas, dan baris kosong. */
  jumlahBaris: number;
  /** Yang benar-benar masuk catatan. Lebih kecil = kepanjangan. */
  terbaca: number;
  /** Baris teks di atas tabel (judul Sheet, catatan). */
  judulAtas: string[];
}

function hurufKolom(i: number): string {
  let s = "";
  let n = i + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Kotak centang Sheet keluar sebagai TRUE/FALSE. Pembeli bertanya "ready?", bukan "TRUE?". */
function nilaiSel(v: string): string {
  if (/^(true|✓|✔|☑)$/i.test(v)) return "Ya";
  if (/^(false|✗|✘|☐)$/i.test(v)) return "Tidak";
  return v;
}

/** Baris satu sel berhuruf kapital atau berakhir titik dua: nama bagian, bukan barang. */
function namaBagian(v: string): boolean {
  const t = v.trim();
  if (t.endsWith(":")) return true;
  const huruf = t.replace(/[^a-zA-Z]/g, "");
  return huruf.length >= 3 && huruf === huruf.toUpperCase();
}

function samaDenganJudul(r: string[], judul: string[]): boolean {
  const a = terisi(r);
  if (a.length < 2) return false;
  return a.every((c) => (judul[c] ?? "").toLowerCase() === r[c].toLowerCase());
}

/**
 * Susun catatan SATU BARIS SATU BARANG, tiap sel membawa nama kolomnya.
 *
 * Nama kolom diulang di tiap baris, dan itu disengaja. Pencarian info bisnis
 * bekerja per BARIS (lihat rag.ts), dan baris "Keripik, 15rb, 20" tidak
 * memberi tahu model mana harga dan mana stok.
 *
 * Yang kepanjangan dipotong DI BATAS BARIS dan jumlahnya dilaporkan.
 */
export function susunCatatan(tabel: string[][], s: Struktur): HasilCatatan {
  const lewati = new Set([...s.abaikan, ...s.rahasia]);
  const keluar: string[] = [];
  const judulAtas: string[] = [];
  let panjang = 0;
  let jumlahBaris = 0;
  let terbaca = 0;
  let penuh = false;

  const tambah = (baris: string) => {
    jumlahBaris++;
    if (penuh || panjang + baris.length + 1 > MAKS_HURUF_CATATAN_SHEET) {
      penuh = true;
      return;
    }
    keluar.push(baris);
    panjang += baris.length + 1;
    terbaca++;
  };

  if (s.jenis === "teks") {
    for (const r of tabel) {
      const t = r.filter(Boolean).join(" ");
      if (t) tambah(t);
    }
    return { teks: keluar.join("\n"), jumlahBaris, terbaca, judulAtas };
  }

  if (s.jenis === "kunciNilai") {
    tabel.forEach((r, i) => {
      if (i === s.barisJudul) return;
      const sel = terisi(r).filter((c) => !lewati.has(c));
      if (sel.length === 0) return;
      const [pertama, ...sisa] = sel;
      tambah(
        sisa.length
          ? `${r[pertama]}: ${sisa.map((c) => nilaiSel(r[c])).join(" | ")}`
          : r[pertama],
      );
    });
    return { teks: keluar.join("\n"), jumlahBaris, terbaca, judulAtas };
  }

  // Tabel. Baris di atas judul kolom = judul Sheet dan catatan umum, ditaruh
  // di paling atas apa adanya, karena di situ sering tertulis hal penting
  // seperti "harga belum termasuk ongkir".
  for (let i = 0; i < Math.max(0, s.barisJudul); i++) {
    const t = tabel[i].filter(Boolean).join(" ");
    if (t) judulAtas.push(t);
  }

  let judul = s.namaKolom.slice();
  let kategori: string | null = null;
  const terakhir = new Map<number, string>();
  let habisKosong = false;
  const lebarPakai = judul.filter((_, c) => !lewati.has(c)).length;

  for (let i = s.barisJudul + 1; i < tabel.length; i++) {
    const r = tabel[i].slice();
    const sel = terisi(r);
    if (sel.length === 0) {
      habisKosong = true;
      continue;
    }

    // Judul kolom yang diulang di tengah (hasil tempel beberapa tabel).
    if (samaDenganJudul(r, judul)) {
      habisKosong = false;
      continue;
    }

    // Tabel kedua yang ditumpuk di bawah, dipisah baris kosong, dengan judul
    // kolomnya sendiri.
    if (habisKosong && sel.length >= 2 && sel.every((c) => miripJudul(r[c]))) {
      const berikut = tabel.slice(i + 1).find((x) => terisi(x).length > 0);
      if (berikut && terisi(berikut).some((c) => adalahAngka(berikut[c]))) {
        judul = judul.map((lama, c) => r[c] || lama);
        kategori = null;
        terakhir.clear();
        habisKosong = false;
        continue;
      }
    }
    habisKosong = false;

    // Nama bagian: "MAKANAN", "Paket Hemat:". Dipakai sebagai kategori untuk
    // baris di bawahnya, bukan dicatat sebagai barang tanpa harga.
    if (sel.length === 1 && lebarPakai >= 3 && namaBagian(r[sel[0]])) {
      kategori = r[sel[0]].replace(/:$/, "").trim();
      continue;
    }

    for (const c of s.kelompok) {
      const adaLain = sel.some((x) => x !== c);
      if (r[c] === "" && adaLain && terakhir.has(c)) r[c] = terakhir.get(c)!;
      else if (r[c] !== "") terakhir.set(c, r[c]);
    }

    const bagian: string[] = [];
    if (kategori) bagian.push(`Kategori: ${kategori}`);
    r.forEach((v, c) => {
      if (!v || lewati.has(c)) return;
      const nama = judul[c] || (s.barisJudul < 0 ? "" : `Kolom ${hurufKolom(c)}`);
      bagian.push(nama ? `${nama}: ${nilaiSel(v)}` : nilaiSel(v));
    });
    if (bagian.length === 0 || (bagian.length === 1 && kategori)) continue;
    tambah(bagian.join(" | "));
  }

  const teks = [...judulAtas, ...keluar].join("\n");
  return { teks, jumlahBaris, terbaca, judulAtas };
}

// ─── Bantuan AI ───────────────────────────────────────────────────────────────

/**
 * Sidik jari BENTUK tabel, bukan isinya.
 *
 * Yang dihitung: lebar, isi baris sampai judul kolom, dan pola jenis sel
 * (angka/teks/kosong) tiga baris sesudahnya. Stok yang berubah tidak mengubah
 * sidik ini, jadi AI tidak ditanya ulang tiap setengah jam. Judul kolom yang
 * diganti atau kolom baru mengubahnya, dan barulah AI membaca lagi.
 */
export function sidikBentuk(tabel: string[][], tebakan: Struktur): string {
  // Tanpa baris judul kolom, baris pertama itu DATA, dan stoknya berubah.
  // Memasukkannya ke sidik membuat AI ditanya ulang tiap stok berubah.
  const kepala = tebakan.barisJudul >= 0 ? tabel.slice(0, tebakan.barisJudul + 1) : [];
  const pola = tabel
    .slice(tebakan.barisJudul + 1)
    .filter((r) => terisi(r).length > 0)
    .slice(0, 3)
    .map((r) => r.map((c) => (c === "" ? "_" : adalahAngka(c) ? "9" : "a")).join(""));
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({ l: tabel[0]?.length ?? 0, kepala, pola, j: tebakan.jenis }))
    .digest("hex")
    .slice(0, 24);
}

export const PROMPT_STRUKTUR = `Kamu membaca BENTUK sebuah tabel Google Sheet milik toko atau usaha kecil di Indonesia. Tabelnya akan dipakai asisten customer service untuk menjawab pembeli.

Tugasmu CUMA menentukan bentuknya. Jangan menyalin, menulis ulang, atau merangkum isi sel.

Balas JSON saja dengan kunci:
- "jenis": "tabel" (daftar barang/layanan/data per baris), "kunciNilai" (dua kolom berisi hal dan keterangannya, mis. jam buka, alamat, cara bayar), atau "teks" (paragraf atau tanya jawab).
- "barisJudul": nomor baris yang berisi judul kolom, persis nomor di depan baris. -1 kalau tidak ada baris judul kolom. Baris judul toko, tanggal, atau catatan di atas tabel BUKAN baris judul kolom.
- "namaKolom": daftar nama, SATU untuk tiap kolom A, B, C, dan seterusnya sesuai urutan. Kalau judul kolom aslinya sudah jelas, pakai persis. Kalau kosong atau singkatan (Hrg, Qty, Ket, Stk), beri nama yang jelas dalam Bahasa Indonesia yang dipakai pembeli (Harga, Stok, Keterangan). Nama diambil dari yang kelihatan di isinya; kalau ragu, pakai judul aslinya.
- "rahasia": nomor kolom (0 = A) yang jelas data internal yang TIDAK BOLEH diketahui pembeli: harga modal, harga beli, HPP, nama atau nomor pemasok, margin, untung, catatan internal. Harga jual BUKAN rahasia. Kalau tidak ada, [].
- "abaikan": nomor kolom yang tidak berarti untuk pembeli: nomor urut 1, 2, 3, kolom bantu rumus. Kalau tidak ada, [].
- "kelompok": nomor kolom yang selnya digabung (merge), sehingga cuma terisi di baris pertama tiap kelompok dan kosong di baris-baris bawahnya. Kalau tidak ada, [].

Contoh:
{"jenis":"tabel","barisJudul":3,"namaKolom":["No","Nama barang","Harga","Stok","Harga modal"],"rahasia":[4],"abaikan":[0],"kelompok":[]}`;

/** Tampilkan potongan tabel ke AI: 30 baris terisi pertama, sel dipendekkan. */
export function contohUntukAi(tabel: string[][]): string {
  const baris: string[] = [];
  for (let i = 0; i < tabel.length && baris.length < 30; i++) {
    if (terisi(tabel[i]).length === 0) continue;
    const sel = tabel[i].map((c, j) => `[${hurufKolom(j)}] ${c.length > 50 ? `${c.slice(0, 50)}…` : c}`);
    baris.push(`baris ${i}: ${sel.join(" | ")}`);
  }
  const lebar = Math.max(0, ...tabel.map((r) => r.length));
  return `Tabel ini punya ${lebar} kolom (A sampai ${hurufKolom(Math.max(0, lebar - 1))}).\n\n${baris.join("\n")}`;
}

/**
 * Terima jawaban AI hanya kalau masuk akal, lalu gabung dengan tebakan kode.
 *
 * Kolom rahasia dari tebakan kode SELALU ikut, apa pun kata AI-nya: AI yang
 * lupa menandai "Harga modal" tidak boleh membuat harga modal sampai ke
 * pembeli.
 */
export function terimaJawabanAi(
  mentah: unknown,
  tabel: string[][],
  tebakan: Struktur,
): Struktur | null {
  if (!mentah || typeof mentah !== "object") return null;
  const j = mentah as Record<string, unknown>;
  const lebar = Math.max(0, ...tabel.map((r) => r.length));
  const jenis = ["tabel", "kunciNilai", "teks"].includes(String(j.jenis))
    ? (String(j.jenis) as Struktur["jenis"])
    : null;
  if (!jenis) return null;

  const barisJudul = Number.isInteger(j.barisJudul) ? Number(j.barisJudul) : -1;
  if (barisJudul < -1 || barisJudul >= tabel.length) return null;
  if (barisJudul >= 0 && terisi(tabel[barisJudul]).length === 0) return null;

  const daftar = (v: unknown) =>
    Array.isArray(v)
      ? [...new Set(v.filter((x) => Number.isInteger(x) && x >= 0 && x < lebar).map(Number))]
      : [];

  const namaAi = Array.isArray(j.namaKolom) ? j.namaKolom : [];
  const namaKolom = Array.from({ length: lebar }, (_, c) => {
    const n = typeof namaAi[c] === "string" ? String(namaAi[c]).replace(/\s+/g, " ").trim() : "";
    const asli = barisJudul >= 0 ? tabel[barisJudul][c] ?? "" : "";
    return (n || asli).slice(0, 40);
  });

  const rahasiaKode = new Set(tebakan.rahasia);
  namaKolom.forEach((n, c) => {
    const asli = barisJudul >= 0 ? tabel[barisJudul][c] ?? "" : "";
    if (namaRahasia(n) || namaRahasia(asli)) rahasiaKode.add(c);
  });

  // Arah sebaliknya juga dijaga: kolom yang judul aslinya "Harga" atau
  // "Harga jual" TIDAK boleh disembunyikan, apa pun kata AI-nya. Asisten yang
  // kehilangan kolom harga akan menjawab "harganya belum ada" untuk semua barang.
  const hargaJual = (c: number) => {
    const asli = barisJudul >= 0 ? tabel[barisJudul][c] ?? "" : "";
    return /\bharga\b/i.test(asli) && !namaRahasia(asli);
  };

  return {
    jenis,
    barisJudul,
    namaKolom,
    abaikan: daftar(j.abaikan).filter((c) => !hargaJual(c)),
    rahasia: [...new Set([...daftar(j.rahasia).filter((c) => !hargaJual(c)), ...rahasiaKode])],
    kelompok: daftar(j.kelompok),
    yakin: 1,
    sumber: "ai",
  };
}

// ─── Penjelasan untuk pemilik toko ────────────────────────────────────────────

/**
 * Cara Palwise membaca Sheet ini, dalam satu dua kalimat.
 *
 * Ditampilkan di layar supaya pemiliknya bisa melihat kalau bacaannya keliru,
 * terutama kolom yang disembunyikan dari asisten. Pembacaan yang tidak bisa
 * dilihat itu pembacaan yang tidak bisa dibetulkan.
 */
export function jelaskanStruktur(tabel: string[][], s: Struktur, h: HasilCatatan): string {
  const kalimat: string[] = [];
  if (s.jenis === "teks") kalimat.push("Dibaca sebagai daftar tulisan, satu baris satu hal.");
  else if (s.jenis === "kunciNilai") kalimat.push("Dibaca sebagai daftar hal dan keterangannya.");
  else {
    const dipakai = s.namaKolom
      .map((n, c) => ({ n: n || `Kolom ${hurufKolom(c)}`, c }))
      .filter(({ c }) => !s.abaikan.includes(c) && !s.rahasia.includes(c))
      .map(({ n }) => n);
    kalimat.push(
      s.barisJudul >= 0
        ? `Judul kolom di baris ${s.barisJudul + 1}. Kolom yang dipakai: ${dipakai.join(", ")}.`
        : `Tidak ada baris judul kolom, jadi kolomnya dinamai dari isinya: ${dipakai.join(", ")}.`,
    );
  }
  const rahasia = s.rahasia.map((c) => (s.barisJudul >= 0 ? tabel[s.barisJudul][c] : "") || s.namaKolom[c] || `Kolom ${hurufKolom(c)}`);
  if (rahasia.length) {
    kalimat.push(`Disembunyikan dari asisten karena kelihatan data internal: ${rahasia.join(", ")}.`);
  }
  if (h.judulAtas.length) kalimat.push(`Tulisan di atas tabel ikut dihafal sebagai keterangan umum.`);
  return kalimat.join(" ");
}

/** Buang nama tab bawaan dari judul: "Stok Toko - Sheet1" jadi "Stok Toko". */
export function rapikanJudul(judulBerkas: string | null, judulAtas: string[]): string | null {
  let j = (judulBerkas ?? "").trim();
  j = j.replace(/\s*-\s*(sheet|lembar|lembaran)\s*\d+$/i, "").trim();
  const umum = /^(untitled spreadsheet|spreadsheet tanpa judul|copy of|salinan dari)/i.test(j);
  if ((!j || umum) && judulAtas[0]) return judulAtas[0].slice(0, 80);
  return j || null;
}
