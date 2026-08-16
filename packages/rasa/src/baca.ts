/**
 * Membaca satu pesan pelanggan.
 *
 * Dua jalur yang sengaja dipisah, karena dua-duanya bisa benar sendiri-sendiri
 * dan sering bertentangan:
 *
 *   KATA      apa yang dia tulis
 *   PERILAKU  berapa lama dia menunggu, berapa pesan yang belum dijawab,
 *             apakah ada keluhan yang menggantung, uangnya sudah masuk atau belum
 *
 * Perilaku LEBIH BISA DIPERCAYA daripada kata, dan itu bukan pendapat. Kata
 * bisa dikelabui bahasa daerah, salah ketik, singkatan, dan basa-basi sopan —
 * pembeli Indonesia yang paling kesal justru sering menulis paling manis. Tiga
 * pesan beruntun dalam dua menit tanpa dibalas artinya sama dari Aceh sampai
 * Merauke.
 *
 * Karena itu waktu keduanya bertentangan, perilaku tidak pernah dibatalkan
 * kata. Pelanggan yang menulis "oke ga papa kok" sesudah menunggu empat jam
 * TIDAK terbaca baik-baik saja.
 */

import { Appraisal, jepit, jepit01 } from "./pad.js";
import {
  EMOJI,
  FRASA_URUT,
  Isyarat,
  KATA,
  NEGASI,
  PENGUAT,
  SERUAN,
  TANDA_TERIMA,
  Tanda,
} from "./leksikon.js";

export interface SinyalPerilaku {
  /**
   * Pesan customer beruntun yang BELUM dijawab asisten. Pesan ini ikut
   * dihitung, jadi nilai terkecilnya 1.
   */
  beruntun: number;
  /** Detik sejak pesan pertama yang belum dijawab itu masuk. */
  menungguDetik: number;
  /** Panjang pesan ini dibagi rata-rata pesan dia sebelumnya. 1 = biasa. */
  rasioPanjang: number;
  /** Berapa kali dia menanyakan hal yang pada dasarnya sama. */
  ulangPertanyaan: number;
  /** Umur keluhan terbuka di CRM, dalam hari. null = tidak ada. */
  masalahHari: number | null;
  /** Sudah mengaku bayar berapa jam lalu dan belum beres. null = tidak ada. */
  klaimBayarJam: number | null;
  /** Tahap pipeline sekarang. */
  tahap: string;
  /**
   * Balasan asisten TERAKHIR menyebut harga.
   *
   * Sinyal kecil dengan akibat besar. Orang yang tidak sanggup hampir tidak
   * pernah mengatakannya — dia menjawab pendek, sopan, lalu hilang. Kalimat
   * "oh gitu ya kak" tidak berarti apa-apa sendirian; kalimat yang sama tepat
   * SESUDAH angka disebut adalah bentuk paling umum dari orang yang mundur
   * karena kemahalan dan sungkan mengatakannya.
   *
   * Tanpa ini, satu-satunya cara mengenali malu adalah menunggu dia mengetik
   * kata yang memang tidak akan pernah dia ketik.
   */
  setelahAngka: boolean;
}

export const SINYAL_KOSONG: SinyalPerilaku = {
  beruntun: 1,
  menungguDetik: 0,
  rasioPanjang: 1,
  ulangPertanyaan: 0,
  masalahHari: null,
  klaimBayarJam: null,
  tahap: "baru",
  setelahAngka: false,
};

export interface Bacaan {
  ap: Appraisal;
  /** Kekuatan tiap tanda, 0..n. Bukan boolean — dua isyarat lebih berarti dari satu. */
  tanda: Record<Tanda, number>;
  /** Kalimat siap tampil untuk pemilik toko. Selalu tetapan, tidak pernah teks pelanggan. */
  alasan: string[];
  /** Keluarga sinyal yang ikut bicara: kata, tandaBaca, perilaku, riwayat. */
  keluarga: number;
  /** Pesan ini cuma tanda terima ("ok", "sip"). */
  tandaTerima: boolean;
}

const TANDA_NOL = (): Record<Tanda, number> => ({
  minat: 0,
  ragu: 0,
  malu: 0,
  desak: 0,
  komplain: 0,
  keras: 0,
  hangat: 0,
  batal: 0,
});

/**
 * Gabungkan dua bukti yang searah tanpa pernah melewati 1.
 *
 * Penjumlahan biasa bikin keluhan sedang plus tiga pesan beruntun terbaca
 * sekeras ancaman hukum, dan sesudah itu tidak ada lagi ruang untuk
 * membedakan mana yang benar-benar gawat.
 */
function gabung(a: number, b: number): number {
  if (a === 0) return b;
  if (b === 0) return a;
  if (a > 0 === b > 0) {
    const t = Math.abs(a) + Math.abs(b) - Math.abs(a * b);
    return a > 0 ? Math.min(1, t) : Math.max(-1, -t);
  }
  return jepit(a + b, -1, 1);
}

/**
 * Rapikan ejaan WhatsApp.
 *
 * Huruf berulang tiga kali atau lebih dipendekkan jadi satu, jadi "mahaaaal"
 * ketemu "mahal" dan "bgttt" ketemu "bgt". Dua huruf dibiarkan supaya "maaf",
 * "saat", dan "keren" tidak ikut rusak.
 */
export function rapikan(teks: string): string {
  return teks
    .toLowerCase()
    .replace(/(.)\1{2,}/g, "$1")
    .replace(/[\r\n]+/g, " ")
    .replace(/[^\p{L}\p{N}\s?!]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Ambil emoji sebelum tanda baca dibersihkan. */
function ambilEmoji(mentah: string): Isyarat[] {
  const keluar: Isyarat[] = [];
  for (const [e, isy] of Object.entries(EMOJI)) {
    if (mentah.includes(e)) keluar.push(isy);
  }
  return keluar;
}

/** Ada negasi di dua kata sebelum posisi ini? */
function adaNegasiSebelum(teks: string, mulai: number): boolean {
  const depan = teks.slice(Math.max(0, mulai - 24), mulai).trim().split(" ");
  return depan.slice(-2).some((k) => NEGASI.has(k));
}

interface Terkumpul {
  isy: Isyarat;
  /** Pengali dari penguat dan negasi. */
  k: number;
  /** 0..1, makin ke belakang makin berat. */
  posisi: number;
}

export function baca(teksMentah: string, sinyal: SinyalPerilaku): Bacaan {
  const tanda = TANDA_NOL();
  const alasan: string[] = [];
  const kumpul: Terkumpul[] = [];

  const seru = (teksMentah.match(/!/g) ?? []).length;
  const tanya = (teksMentah.match(/\?/g) ?? []).length;
  const huruf = (teksMentah.match(/[a-zA-Z]/g) ?? []).length;
  const besar = (teksMentah.match(/[A-Z]/g) ?? []).length;
  const rasioBesar = huruf >= 8 ? besar / huruf : 0;

  for (const isy of ambilEmoji(teksMentah)) {
    kumpul.push({ isy, k: 1, posisi: 1 });
    if (isy.tanda) tanda[isy.tanda] += 0.7;
  }

  let teks = rapikan(teksMentah);
  const panjangAwal = Math.max(1, teks.length);

  /**
   * Ada huruf atau angka SEBELUM pencocokan frasa melubangi teksnya.
   *
   * Wajib diambil di sini, bukan nanti. Frasa yang cocok diganti spasi supaya
   * katanya tidak dihitung dua kali, jadi pesan yang SELURUH katanya kebetulan
   * cocok frasa akan terlihat kosong sesudahnya. Terukur: "kalau ambil banyak
   * bisa kurang?" — dua frasa tawar-menawar, dua-duanya cocok, sisanya cuma
   * tanda tanya, lalu terbaca sebagai orang yang mengirim "?" karena
   * didiamkan. Penawar terbaca sebagai pelanggan kesal.
   */
  const adaHuruf = /[\p{L}\p{N}]/u.test(teks);

  // Pesan yang isinya cuma "ok" atau "sip". Diperiksa SEBELUM apa pun, karena
  // "siap" ada di daftar hangat dan "oke" ada di daftar batal — dua-duanya
  // salah kalau itu satu-satunya isi pesannya.
  const tandaTerima = teks.length > 0 && TANDA_TERIMA.has(teks);

  if (!tandaTerima) {
    // ── frasa, yang panjang dulu ──
    for (const [frasa, isy] of FRASA_URUT) {
      let dari = 0;
      for (;;) {
        const i = teks.indexOf(frasa, dari);
        if (i < 0) break;
        const negasi = adaNegasiSebelum(teks, i);
        const posisi = 0.7 + 0.3 * (i / panjangAwal);

        if (negasi && isy.tanda === "minat") {
          // "ga jadi pesan", "belum mau order". Ini pembatalan, bukan pemesanan,
          // dan membacanya terbalik jauh lebih mahal daripada tidak membacanya.
          kumpul.push({ isy: { v: -0.5, a: -0.05, d: -0.1 }, k: 1, posisi });
          tanda.batal += 1;
        } else if (negasi) {
          kumpul.push({ isy, k: -0.6, posisi });
        } else {
          kumpul.push({ isy, k: 1, posisi });
          if (isy.tanda) tanda[isy.tanda] += isy.tanda === "minat" ? (isy.bobot ?? 1) : 1;
        }

        // Dilubangi supaya kata di dalamnya tidak dihitung dua kali.
        teks = teks.slice(0, i) + " ".repeat(frasa.length) + teks.slice(i + frasa.length);
        dari = i + frasa.length;
      }
    }

    // ── kata tunggal ──
    const kata = teks.split(" ").filter(Boolean);
    kata.forEach((k, i) => {
      const isy = KATA[k];
      if (!isy) return;
      const jendela = kata.slice(Math.max(0, i - 2), i);
      const negasi = jendela.some((x) => NEGASI.has(x));
      const kuat = jendela.some((x) => PENGUAT.has(x)) || kata[i + 1] !== undefined && PENGUAT.has(kata[i + 1]);
      const posisi = 0.7 + 0.3 * (i / Math.max(1, kata.length - 1 || 1));

      if (negasi && isy.tanda === "minat") {
        kumpul.push({ isy: { v: -0.45, a: -0.05 }, k: 1, posisi });
        tanda.batal += 1;
        return;
      }
      kumpul.push({ isy, k: negasi ? -0.6 : kuat ? 1.4 : 1, posisi });
      if (!negasi && isy.tanda) {
        tanda[isy.tanda] += isy.tanda === "minat" ? (isy.bobot ?? 1) : kuat ? 1.3 : 1;
      }
    });

    // Seruan gaul: gairahnya diambil, valensinya tidak. Lihat catatan [SERUAN].
    for (const k of kata) if (SERUAN.has(k)) kumpul.push({ isy: { v: 0, a: 0.3 }, k: 1, posisi: 1 });
  }

  const adaKata = kumpul.length > 0;

  // ── ringkas jalur kata ──
  // Valensi dan kuasa: rata-rata berbobot BESARNYA sendiri, jadi isyarat kuat
  // mendominasi tanpa menghapus yang lemah. Rata-rata biasa bikin keluhan berat
  // yang dibungkus sapaan sopan terbaca setengah netral, dan itu justru bentuk
  // yang paling sering dikirim orang.
  let bobotV = 0;
  let jumV = 0;
  let bobotD = 0;
  let jumD = 0;
  let gairahMaks = 0;
  for (const { isy, k, posisi } of kumpul) {
    const v = isy.v * k;
    const d = (isy.d ?? 0) * k;
    const w = posisi * Math.abs(v);
    jumV += v * w;
    bobotV += w;
    const wd = posisi * Math.abs(d);
    jumD += d * wd;
    bobotD += wd;
    gairahMaks = Math.max(gairahMaks, Math.abs(isy.a) * Math.sign(isy.a) * (k < 0 ? 0.6 : 1));
  }
  let valensi = bobotV > 0 ? jumV / bobotV : 0;
  let kuasa = bobotD > 0 ? jumD / bobotD : 0;
  let gairah = gairahMaks + Math.min(0.15, 0.05 * Math.max(0, kumpul.length - 1));
  let desakan = 0;
  let kedekatan = 0;

  if (tanda.hangat > 0) kedekatan += 0.5;
  if (tanda.keras > 0 || tanda.batal > 0) kedekatan -= 0.5;

  // ── tanda baca dan huruf besar ──
  let keluarga = adaKata ? 1 : 0;
  let adaTandaBaca = false;

  // Pesan tanpa satu pun huruf atau angka — lihat [adaHuruf] di atas.
  //
  // Sempat diperiksa dengan `teks === ""`, dan itu tidak pernah benar: rapikan()
  // sengaja MENYISAKAN "?" dan "!" supaya bisa dihitung, jadi pesan "?" tetap
  // menyisakan "?" dan cabang ini tidak pernah jalan. Pesan yang isinya cuma
  // tanda tanya justru bentuk paling murni dari "kok didiamkan", dan itu persis
  // yang paling butuh terbaca.
  if (!adaHuruf && tanya >= 1) {
    // Ini paling sering berarti "halo, kok didiamkan", bukan pertanyaan.
    valensi = gabung(valensi, -0.4);
    gairah = Math.max(gairah, 0.45);
    kuasa = gabung(kuasa, 0.3);
    tanda.desak += 1;
    adaTandaBaca = true;
    alasan.push("cuma mengirim tanda tanya");
  } else if (tanya >= 2) {
    valensi = gabung(valensi, -0.25);
    gairah = Math.max(gairah, 0.35);
    kuasa = gabung(kuasa, 0.2);
    tanda.desak += 0.7;
    adaTandaBaca = true;
  }

  if (seru >= 2) {
    gairah = Math.min(1, gairah + 0.1 * Math.min(seru, 4));
    adaTandaBaca = true;
  }
  if (rasioBesar > 0.6) {
    gairah = Math.min(1, gairah + 0.3);
    kuasa = gabung(kuasa, 0.2);
    // Huruf besar semua itu bukan cuma gairah, itu menuntut. Tanpa baris ini,
    // "BALIKIN UANG SAYA SEKARANG" terbaca setingkat dengan keluhan biasa yang
    // ditulis santai.
    tanda.desak += 0.6;
    adaTandaBaca = true;
    alasan.push("ditulis dengan huruf besar semua");
  }
  if (adaTandaBaca) keluarga++;

  // ── jalur perilaku ──
  let adaPerilaku = false;

  // "Belum dibalas" dan "sudah menunggu lama" itu SATU keadaan yang diukur dua
  // cara, bukan dua bukti yang berdiri sendiri.
  //
  // Sempat dijumlahkan, dan hasilnya bacaan yang meledak tanpa satu pun kata
  // marah: "jadi gimana kak" dengan empat pesan beruntun selama sejam terbaca
  // 0,87 — cukup untuk melempar orang ke manusia dan menyalakan rem tiga jam,
  // padahal kalimatnya sopan dan pertanyaannya wajar. Itu bentuk kesalahan yang
  // paling mahal di sini: bukan asisten yang kurang peka, tapi asisten yang
  // memperlakukan pertanyaan biasa sebagai kemarahan.
  //
  // Jadi diambil yang paling kuat di antara keduanya, bukan jumlahnya.
  const beratBeruntun = sinyal.beruntun >= 2 ? jepit01((sinyal.beruntun - 1) / 4) : 0;
  const menit = Math.floor(sinyal.menungguDetik / 60);
  // Tumbuh melandai: menit ke-15 jauh lebih menyakitkan daripada menit ke-90,
  // karena yang menyakitkan itu sadar dirinya didiamkan, bukan lamanya.
  const beratTunggu =
    sinyal.menungguDetik >= 600 && sinyal.beruntun >= 1
      ? jepit01(Math.log10(menit / 5) / 1.2)
      : 0;
  const diabaikan = Math.max(beratBeruntun, beratTunggu);

  if (diabaikan > 0) {
    valensi = gabung(valensi, -0.5 * diabaikan);
    gairah = Math.min(1, gairah + 0.32 * diabaikan);
    kuasa = gabung(kuasa, 0.22 * diabaikan);
    desakan = Math.max(desakan, diabaikan);
    tanda.desak += 1.2 * diabaikan;
    adaPerilaku = true;

    // Alasan yang ditampilkan tetap dua-duanya kalau dua-duanya benar. Yang
    // digabung itu bobotnya, bukan keterangannya — pemilik toko perlu tahu
    // persis apa yang terjadi.
    if (beratBeruntun > 0) alasan.push(`${sinyal.beruntun} pesan belum dibalas`);
    if (beratTunggu > 0) {
      alasan.push(
        menit >= 120 ? `menunggu ${Math.round(menit / 60)} jam` : `menunggu ${menit} menit`,
      );
    }
  }

  if (sinyal.ulangPertanyaan >= 2) {
    valensi = gabung(valensi, -0.3);
    gairah = Math.min(1, gairah + 0.2);
    kuasa = gabung(kuasa, 0.2);
    tanda.desak += 0.8;
    adaPerilaku = true;
    alasan.push("menanyakan hal yang sama berulang");
  }

  // Pesan yang mendadak jauh lebih pendek. Lemah, dan memang seharusnya lemah:
  // sendirian ini tidak berarti apa-apa, tapi bersama isyarat lain dia yang
  // membedakan "sedang sibuk" dari "sudah mulai menutup".
  const memendek = sinyal.rasioPanjang < 0.45 && !tandaTerima;
  if (memendek) {
    valensi = gabung(valensi, -0.12);
    gairah = Math.min(1, gairah - 0.1);
  }

  // MENGKERUT SESUDAH HARGA DISEBUT.
  //
  // Ini jalur utama pengenalan malu, dan sengaja perilaku, bukan kata. Orang
  // yang tidak sanggup tidak menulis "saya tidak sanggup" — dia menjawab
  // pendek, sopan, tanpa pertanyaan, lalu berhenti. Yang membedakannya dari
  // sekadar sibuk cuma satu: kalimat itu jatuh tepat sesudah angka disebut.
  //
  // Kuasa ditekan dalam-dalam, gairah ditekan turun. Kombinasi itu yang
  // memisahkannya dari "ragu" (kuasa agak negatif, gairah naik) dan dari
  // "kesal" (kuasa positif, gairah tinggi).
  if (sinyal.setelahAngka && tanda.keras === 0 && tanda.komplain === 0) {
    const diamSetelahHarga = memendek || tandaTerima || tanya === 0;
    if (diamSetelahHarga) {
      const berat = memendek ? 1 : 0.6;
      valensi = gabung(valensi, -0.3 * berat);
      gairah = Math.min(1, gairah - 0.15 * berat);
      kuasa = gabung(kuasa, -0.5 * berat);
      tanda.malu += 0.9 * berat;
      adaPerilaku = true;
      alasan.push("mengkerut sesudah harganya disebut");
    }
    // Yang MENAWAR sesudah harga itu kebalikannya: dia masih di meja. Sengaja
    // tidak ikut ditekan, supaya penawar tidak diperlakukan sebagai orang yang
    // tidak mampu — itu justru menghina.
  }

  if (adaPerilaku) keluarga++;

  // ── jalur riwayat CRM ──
  let adaRiwayat = false;

  if (sinyal.masalahHari !== null) {
    const hari = sinyal.masalahHari;
    const berat = jepit01(0.35 + hari * 0.2);
    valensi = gabung(valensi, -0.5 * berat);
    gairah = Math.min(1, gairah + 0.15 * berat);
    kuasa = gabung(kuasa, 0.15 * berat);
    tanda.komplain += 0.8;
    adaRiwayat = true;
    alasan.push(
      hari >= 1 ? `keluhan belum beres ${Math.round(hari)} hari` : "keluhan masih terbuka",
    );
  }

  if (sinyal.klaimBayarJam !== null && sinyal.klaimBayarJam >= 12) {
    const berat = jepit01(sinyal.klaimBayarJam / 48);
    valensi = gabung(valensi, -0.55 * berat);
    gairah = Math.min(1, gairah + 0.25 * berat);
    kuasa = gabung(kuasa, 0.2 * berat);
    tanda.komplain += 1;
    adaRiwayat = true;
    alasan.push(`sudah bayar ${Math.round(sinyal.klaimBayarJam)} jam lalu, belum beres`);
  }

  if (sinyal.tahap === "closing" || sinyal.tahap === "negosiasi") {
    tanda.minat += sinyal.tahap === "closing" ? 1.5 : 0.7;
    adaRiwayat = true;
  }

  if (adaRiwayat) keluarga++;

  if (tanda.keras > 0) alasan.unshift("ada tuduhan atau ancaman");
  else if (tanda.komplain > 0 && !alasan.length) alasan.push("sedang mengeluhkan sesuatu");
  else if (tanda.batal > 0) alasan.push("terdengar mau mundur");
  else if (tanda.ragu > 0 && !alasan.length) alasan.push("terdengar ragu soal harga");

  return {
    ap: {
      valensi: jepit(valensi, -1, 1),
      gairah: jepit(gairah, -1, 1),
      kuasa: jepit(kuasa, -1, 1),
      desakan: jepit01(desakan),
      kedekatan: jepit(kedekatan, -1, 1),
    },
    tanda,
    alasan: alasan.slice(0, 3),
    keluarga,
    tandaTerima,
  };
}
