import { log } from "./log.js";

/**
 * Pencatat pemakaian token.
 *
 * Tanpa ini tidak ada satu pun angka yang bisa dipakai untuk menjawab
 * "satu balasan itu ongkosnya berapa", jadi harga per balasan di tiap paket
 * cuma tebakan.
 *
 * Soal `dariCache`: angka nol TIDAK otomatis berarti ada yang salah. Diskon
 * awal prompt Google baru berlaku kalau bagian yang sama persis di depan
 * permintaan cukup panjang, dan prompt kita di bawah ambang itu. Diukur
 * langsung ke API pada 4 Agustus 2026 dengan gemini-3.5-flash: 2.164 token
 * tidak kena, 3.766 token tidak kena, 6.966 token kena (4.074 di antaranya
 * ditagih murah). Jadi ambangnya ada di antara 3.766 dan 6.966.
 *
 * PERBARUI KALAU PROMPTNYA BERUBAH. Waktu catatan ini ditulis system prompt kita
 * sekitar 2.200 token. Diukur ulang 8 Agustus 2026 dengan `npm run ukur:prompt`:
 * sudah 3.300 sampai 3.600 token, ikut naik karena pagar anti-suntikan. Artinya
 * kita sekarang duduk TEPAT DI BAWAH ambang yang terukur, dan itu posisi paling
 * merugikan: cukup panjang untuk mahal, belum cukup panjang untuk dapat diskon.
 *
 * Dulu di sini tertulis "bukan masalah yang perlu dikejar", dan itu benar waktu
 * promptnya 2.200. Sekarang tidak lagi. Kalau harga paket berbayar mau untung,
 * inilah angka pertama yang harus diperiksa, karena system prompt dikirim ulang
 * di SETIAP balasan dan dia bagian input yang paling besar.
 *
 * Ukur ulang dulu dengan `npm run uji:diskon` sebelum mengubah apa pun.
 *
 * Ulangi pengukurannya dengan `npm run uji:diskon` kalau modelnya diganti.
 */
export interface PemakaianToken {
  provider: string;
  model: string;
  masuk: number;
  keluar: number;
  /** Bagian dari `masuk` yang ditagih murah karena awal prompt-nya sama. */
  dariCache: number;
  /** Token berpikir, sudah termasuk di `keluar`. Gemini saja. */
  berpikir?: number;
}

const total = {
  panggilan: 0,
  masuk: 0,
  keluar: 0,
  dariCache: 0,
};

/**
 * Batas bawah tempat diskon mulai mungkin kena, dari pengukuran langsung.
 *
 * Bukan angka resmi Google. Yang terukur cuma "3.766 tidak kena, 6.966 kena",
 * jadi ini titik tempat kita berhenti berharap, bukan ambang sebenarnya.
 */
export const AMBANG_TERUKUR = 4_000;

let sudahDijelaskan = false;

export function catatToken(p: PemakaianToken): void {
  total.panggilan++;
  total.masuk += p.masuk;
  total.keluar += p.keluar;
  total.dariCache += p.dariCache;

  // "hemat 0%" di tiap baris dulu terbaca seperti ada yang rusak, dan itu
  // memancing pencarian bug yang tidak ada. Angkanya cuma ditulis kalau memang
  // ada yang dihemat; kalau tidak, alasannya dijelaskan sekali saja.
  const persen = p.masuk > 0 ? Math.round((p.dariCache / p.masuk) * 100) : 0;
  const hemat = p.dariCache > 0 ? ` (hemat ${persen}%)` : "";

  log.info(
    `token ${p.model}: masuk ${p.masuk}${hemat}, keluar ${p.keluar}` +
      (p.berpikir ? `, berpikir ${p.berpikir}` : ""),
  );

  if (!sudahDijelaskan && p.dariCache === 0 && p.masuk < AMBANG_TERUKUR) {
    sudahDijelaskan = true;
    log.info(
      `prompt-nya di bawah ambang diskon ${p.model} (~${AMBANG_TERUKUR} token), ` +
        "jadi tidak ada bagian yang ditagih murah. Ini normal, bukan kesalahan. " +
        "Ukur lagi dengan npm run uji:diskon kalau modelnya diganti.",
    );
  }
}

/** Total sejak worker hidup. Direset tiap restart, memang begitu maksudnya. */
export function ringkasanToken() {
  const persen = total.masuk > 0 ? Math.round((total.dariCache / total.masuk) * 100) : 0;
  return { ...total, persenHemat: persen };
}

/** Dipakai uji supaya hitungan satu bagian tidak bocor ke bagian berikutnya. */
export function resetToken(): void {
  total.panggilan = 0;
  total.masuk = 0;
  total.keluar = 0;
  total.dariCache = 0;
  sudahDijelaskan = false;
}
