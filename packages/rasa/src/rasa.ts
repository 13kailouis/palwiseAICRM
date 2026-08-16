/**
 * Dari keadaan PAD ke empat angka yang punya arti buat pemilik toko.
 *
 * Mesin aslinya mengeluarkan 15 label emosi Plutchik: joy, serenity, pride,
 * shame, boredom, disgust, dan seterusnya. Tidak ada satu pun pemilik warung
 * yang butuh tahu pelanggannya sedang `shame 0,34`, dan menampilkannya persis
 * itulah yang bikin fitur semacam ini terasa aneh dan lalu dimatikan orang.
 *
 * Jadi PAD tetap dihitung penuh — dia yang bikin dinamikanya benar — tapi yang
 * KELUAR dari modul ini cuma empat sumbu dan satu kata dalam bahasa yang memang
 * dipakai orang jualan.
 *
 * "Panas" bukan istilah yang kita karang. Lead panas sudah jadi kosakata sales
 * di Indonesia jauh sebelum ada produk ini.
 */

import { baca, SinyalPerilaku } from "./baca.js";
import { IntiRasa, jepit01, KeadaanTersimpan } from "./pad.js";
import { Tanda } from "./leksikon.js";

export type LabelRasa =
  | "marah"
  | "kesal"
  | "malu"
  | "mundur"
  | "ragu"
  | "panas"
  | "hangat"
  | "dingin"
  | "netral";

export interface Rasa {
  /** 0..1 — seberapa dekat dia ke memutuskan beli. */
  minat: number;
  /** 0..1 — marah, tidak sabar, merasa didiamkan. */
  kesal: number;
  /** 0..1 — kaget harga, mau nawar, mau mikir dulu. */
  ragu: number;
  /**
   * 0..1 — mau tapi tidak sanggup, dan sungkan mengatakannya.
   *
   * Dipisah dari `ragu` karena perlakuan yang benar untuk ragu MELUKAI yang
   * malu. Lihat catatan panjang di leksikon.ts pada tanda "malu".
   */
  malu: number;
  /** 0..1 — percaya dan akrab. */
  hangat: number;

  label: LabelRasa;

  /**
   * 0..1 — berapa banyak keluarga sinyal yang sepakat.
   *
   * Di bawah AMBANG_MENAMBAH, sikap cuma boleh MENGURANGI (jangan upsell,
   * jangan tanya, jangan panjang) dan tidak boleh menambahkan kalimat apa pun.
   * Salah mengurangi menghasilkan jawaban datar; salah menambah menghasilkan
   * jawaban yang bohong. Lihat catatan lengkapnya di bisnis/08-lapisan-rasa.md.
   */
  keyakinan: number;

  /** Kenapa. Selalu tetapan, tidak pernah memuat teks pelanggan. */
  alasan: string[];

  /** Ada tuduhan atau ancaman. Jalur pintas eskalasi, tidak lewat ambang. */
  keras: boolean;
}

export const AMBANG_MENAMBAH = 0.5;

export const RASA_NETRAL: Rasa = {
  minat: 0,
  kesal: 0,
  ragu: 0,
  malu: 0,
  hangat: 0,
  label: "netral",
  keyakinan: 0,
  alasan: [],
  keras: false,
};

/** Naik cepat di awal lalu melandai. Dua isyarat jauh lebih berarti dari satu; yang kelima tidak. */
const jenuh = (x: number, skala: number) => jepit01(1 - Math.exp(-Math.max(0, x) / skala));

/**
 * Gabungkan dua bukti yang berdiri sendiri.
 *
 * Jalur PAD dan jalur tanda mengukur hal yang sama lewat cara yang tidak
 * saling bergantung, jadi keduanya harus saling MENGUATKAN, bukan saling
 * menimpa. Sempat memakai `Math.max`, dan itu terlalu pelit: "kok lama banget
 * sih" menghasilkan 0,33 dari PAD dan 0,47 dari tanda, dua-duanya di bawah
 * ambang, jadi pesan yang jelas-jelas kesal terbaca netral. Digabung begini
 * hasilnya 0,64 dan itu memang bacaan yang benar.
 */
const atau = (a: number, b: number) => jepit01(1 - (1 - jepit01(a)) * (1 - jepit01(b)));

function nilai(
  emosi: { p: number; a: number; d: number },
  tanda: Record<Tanda, number>,
  keluarga: number,
  tandaTerima: boolean,
): Omit<Rasa, "alasan"> {
  const negatif = Math.max(0, -emosi.p);
  const positif = Math.max(0, emosi.p);
  const tegang = Math.max(0, emosi.a);
  const tenang = Math.max(0, -emosi.a);
  const menuntut = Math.max(0, emosi.d);
  const takBerdaya = Math.max(0, -emosi.d);

  // KESAL itu tidak enak + bergairah + menuntut. Ketiganya wajib, dan itu yang
  // memisahkannya dari ragu: orang yang kaget harga juga tidak enak, tapi dia
  // tidak sedang menuntut siapa pun.
  const kesalPad = negatif * (0.4 + 0.6 * tegang) * (0.65 + 0.35 * menuntut);
  const kesal = atau(
    kesalPad,
    jenuh(tanda.desak * 0.9 + tanda.komplain * 0.8 + tanda.keras * 2, 1.4),
  );

  // RAGU itu tidak enak + tenang + sedikit tidak berdaya. Dia masih menimbang.
  const raguPad = negatif * (0.35 + 0.45 * tenang) * (0.6 + 0.4 * takBerdaya);
  const ragu = atau(raguPad * 0.85, jenuh(tanda.ragu, 1.1));

  // MALU itu tidak enak + tenang + BENAR-BENAR tidak berdaya.
  //
  // `takBerdaya` dikalikan langsung, bukan dijadikan bonus seperti di ragu.
  // Artinya tanpa ketidakberdayaan sungguhan, jalur PAD-nya nol. Itu disengaja:
  // yang membedakan orang yang menimbang dari orang yang tidak sanggup bukan
  // seberapa tidak enak perasaannya, tapi apakah dia merasa punya pilihan.
  const maluPad = negatif * (0.3 + 0.5 * tenang) * takBerdaya;
  const malu = atau(maluPad, jenuh(tanda.malu, 1));

  const hangat =
    atau(positif * (0.55 + 0.45 * tenang), jenuh(tanda.hangat, 1.2)) *
    (tandaTerima ? 0.3 : 1);

  // MINAT bukan emosi, jadi tidak lewat PAD sama sekali. Dia bacaan niat, dan
  // "transfer kemana ya" itu isyarat terkuat yang bisa diberikan pembeli
  // sekaligus datar secara perasaan.
  const minat = jepit01(
    jenuh(tanda.minat, 2.6) * (1 - 0.5 * jenuh(tanda.batal, 1)) * (1 - 0.25 * ragu),
  );

  const keras = tanda.keras > 0;

  let label: LabelRasa;
  // Ambang marah 0,75, bukan 0,8. Yang menentukan bukan angka bulatnya tapi
  // apa yang jatuh di antaranya: "BALIKIN UANG SAYA SEKARANG" berhenti di
  // 0,79, dan tuntutan huruf besar itu jelas bukan sekadar kesal.
  //
  // Menurunkan ambang ini TIDAK membuat eskalasi lebih galak. Eskalasi memakai
  // angka kesalnya sendiri (0,85 untuk menyerahkan), bukan labelnya. Yang
  // berubah cuma sikap: lebih pendek, tanpa emoji, tanpa tawaran.
  if (keras || kesal >= 0.75) label = "marah";
  else if (kesal >= 0.5) label = "kesal";
  else if (minat >= 0.8) label = "panas";
  // Malu diperiksa SEBELUM mundur dan ragu, dan urutan itu penting.
  //
  // Orang yang tidak sanggup sering juga memakai kalimat mundur ("ga jadi
  // deh") dan sering juga terbaca ragu. Kalau mundur menang, sikapnya jadi
  // "jangan kejar" dan penjualan yang sebenarnya masih bisa diselamatkan
  // dengan satu pilihan yang lebih kecil dilepas begitu saja. Kalau ragu yang
  // menang, sikapnya menyuruh menjelaskan nilai barangnya — dan menjelaskan
  // kenapa barang mahal itu pantas kepada orang yang tidak sanggup membelinya
  // adalah cara paling cepat membuatnya pergi.
  else if (malu >= 0.5) label = "malu";
  else if (tanda.batal >= 1 && minat < 0.5) label = "mundur";
  else if (ragu >= 0.5) label = "ragu";
  else if (minat >= 0.6) label = "panas";
  else if (hangat >= 0.55) label = "hangat";
  // "dingin" HANYA untuk tanda terima, bukan untuk semua yang skornya rendah.
  //
  // Sempat mencakup keduanya, dan itu keliru dengan cara yang merugikan:
  // "halo kak" juga berskor rendah di semua sumbu, lalu kena sikap dingin yang
  // melarang membuka topik dan melarang bertanya. Artinya sapaan pertama
  // seorang calon pembeli dijawab satu kata. Yang tidak jelas harus jatuh ke
  // netral, dan netral tidak menempelkan apa pun.
  else if (tandaTerima) label = "dingin";
  else label = "netral";

  // Keyakinan: berapa keluarga sinyal yang bicara (kata, tanda baca, perilaku,
  // riwayat), dinaikkan kalau sumbu utamanya memang kuat. Tuduhan langsung
  // dianggap pasti — kalimatnya tidak punya bacaan kedua.
  // Keyakinan: berapa keluarga sinyal yang bicara DITAMBAH seberapa kuat
  // sumbu utamanya — dijumlahkan, bukan dikalikan.
  //
  // Versi pertama mengalikan `keluarga/3` dengan kekuatannya, dan itu punya
  // akibat yang tidak disengaja: satu keluarga sinyal mentok di 0,33, jadi
  // pesan yang cuma punya bukti kata TIDAK PERNAH bisa melewati ambang 0,5
  // sejelas apa pun kalimatnya. "Belum ada rejeki kak" hampir tidak punya
  // bacaan kedua, dan tetap dianggap tebakan lemah.
  //
  // Dijumlahkan, dua-duanya tetap dibutuhkan — nol keluarga tetap nol, dan
  // satu keluarga dengan sumbu lemah tetap di bawah ambang — tapi bukti tunggal
  // yang kuat sekarang boleh dipakai.
  const puncak = Math.max(minat, kesal, ragu, malu, hangat);
  const keyakinan = keras ? 1 : jepit01(0.25 * keluarga + 0.45 * puncak);

  return { minat, kesal, ragu, malu, hangat, label, keyakinan, keras };
}

/**
 * Satu angka untuk mengurutkan kotak masuk: siapa yang paling mahal kalau
 * ditinggalkan sampai nanti.
 *
 * SENGAJA BERPITA, bukan campuran mulus dari keempat sumbu. Waktu urutannya
 * masih memakai `kesal` lalu `minat` berurutan, pelanggan yang cuma agak ragu
 * dan kebetulan belum dibalas dua pesan (kesal 0,28) naik di atas orang yang
 * baru saja menulis "transfer kemana ya kak" (minat 0,95, kesal 0). Untuk alat
 * jualan itu terbalik.
 *
 * Urutan pitanya menjawab satu pertanyaan: kalau dibiarkan satu jam lagi, apa
 * yang hilang?
 *
 *   kesal   ulasan buruk, permintaan refund, orang yang cerita ke temannya
 *   panas   uang yang sudah di atas meja, dan dia sedang memegang HP-nya
 *   malu    masih mau, cuma tidak sanggup di angka ini — dan dia akan pergi
 *           tanpa mengatakan apa pun, jadi tidak akan ada kesempatan kedua
 *   mundur  jendelanya sedang menutup, tapi keputusannya sudah setengah jadi
 *   ragu    perlu didorong, dan besok masih bisa
 *
 * Malu di ATAS mundur karena masih bisa diselamatkan: yang mundur sudah
 * memutuskan, yang malu cuma tidak sanggup di angka ini. Satu pilihan yang
 * lebih kecil sering cukup, dan tidak ada yang perlu dibujuk.
 *
 * Angka di dalam pita tetap membedakan urutan sesama pita, jadi yang paling
 * marah tetap paling atas di antara yang marah.
 */
export function prioritas(rasa: Rasa): number {
  return Math.max(
    rasa.kesal >= 0.5 ? 0.6 + 0.4 * rasa.kesal : 0,
    rasa.minat >= 0.6 ? 0.4 + 0.2 * rasa.minat : 0,
    rasa.label === "malu" ? 0.4 : 0,
    rasa.label === "mundur" ? 0.35 : 0,
    rasa.ragu >= 0.5 ? 0.2 + 0.1 * rasa.ragu : 0,
  );
}

function muatKeadaan(json: string | null | undefined): KeadaanTersimpan | null {
  if (!json) return null;
  try {
    const isi = JSON.parse(json);
    return isi && typeof isi === "object" ? (isi as KeadaanTersimpan) : null;
  } catch {
    // Kolom rusak tidak boleh menjatuhkan balasan ke pelanggan. Pola yang sama
    // dengan bacaTags di agent.ts.
    return null;
  }
}

export interface HasilBaca {
  rasa: Rasa;
  /** Keadaan baru untuk disimpan ke Conversation.rasaState. */
  keadaan: string;
}

/**
 * Satu-satunya pintu masuk yang dipakai worker.
 *
 * Urutannya penting: MAJUKAN WAKTU DULU, baru terapkan pesan barunya. Kalau
 * dibalik, pelanggan yang marah kemarin sore dianggap masih semarah itu pagi
 * ini, dan seluruh kotak masuk lama-lama merah semua.
 */
export function bacaRasa(opsi: {
  teks: string;
  sinyal: SinyalPerilaku;
  /** Isi Conversation.rasaState, atau null kalau belum pernah. */
  keadaan: string | null;
  /** Detik sejak bacaan terakhir. */
  sejakDetik: number;
}): HasilBaca {
  const inti = new IntiRasa();
  inti.muat(muatKeadaan(opsi.keadaan));
  if (opsi.sejakDetik > 0) inti.tick(opsi.sejakDetik);

  const bacaan = baca(opsi.teks, opsi.sinyal);
  inti.terapkan(bacaan.ap);

  const angka = nilai(
    inti.emosi.keObjek(),
    bacaan.tanda,
    bacaan.keluarga,
    bacaan.tandaTerima,
  );

  return {
    rasa: { ...angka, alasan: bacaan.alasan },
    keadaan: JSON.stringify(inti.simpan()),
  };
}
