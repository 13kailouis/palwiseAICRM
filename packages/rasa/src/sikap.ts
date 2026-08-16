/**
 * Dari bacaan ke SIKAP: apa yang berubah di giliran ini.
 *
 * Sikap TIDAK PERNAH dikarang model. Dia dipilih dari tabel tetap di berkas
 * ini, jadi hasilnya sama tiap kali dan bisa diuji tanpa memanggil API.
 *
 * ATURAN KEAMANAN YANG TIDAK BOLEH DILANGGAR: kalimat di berkas ini semuanya
 * TETAPAN. Yang boleh mengalir masuk cuma angka dan enum. Blok sikap ditempel
 * di dalam KONTEKS INTERNAL — blok yang paling dipercaya model — jadi satu
 * potongan teks pelanggan yang lolos ke sini langsung membuka kembali lubang
 * suntikan yang ditutup dengan susah payah di ai/suntikan.ts.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ISI SIKAPNYA DIAMBIL DARI CARA ORANG JUALAN YANG BENAR-BENAR BAGUS, bukan
 * dari sopan santun umum. Empat yang paling menentukan:
 *
 * 1. BERHENTI MENJUAL WAKTU ORANGNYA SUDAH MAU BELI. Kesalahan paling mahal
 *    dan paling sering: pembeli menulis "oke saya ambil", lalu dijawab tiga
 *    bubble berisi varian lain, promo, dan pertanyaan penutup. Setiap kalimat
 *    tambahan sesudah orang memutuskan adalah kesempatan baru untuk dia
 *    berubah pikiran.
 *
 * 2. HARGA TIDAK DIBELA DENGAN MENGULANG HARGANYA. Yang bilang "kok mahal"
 *    tidak sedang meminta angka yang sama diucapkan lagi. Yang menolong: apa
 *    isinya, atau pilihan yang lebih kecil — dan dua-duanya cuma boleh diambil
 *    dari knowledge base.
 *
 * 3. MENGAKUI SEKALI, LALU BERGERAK. Permintaan maaf yang diulang-ulang
 *    terdengar seperti tidak ada yang mau bertanggung jawab. Satu pengakuan
 *    yang menyebut kejadiannya, lalu langkah berikutnya.
 *
 * 4. SELALU MENINGGALKAN SATU LANGKAH BERIKUTNYA — kecuali obrolannya memang
 *    sudah selesai. Ini yang membedakan sales dari mesin penjawab, dan ini
 *    juga yang paling gampang jadi spam kalau dipakai di saat yang salah,
 *    makanya dia dimatikan untuk "mundur" dan "dingin".
 * ────────────────────────────────────────────────────────────────────────────
 */

import { AMBANG_MENAMBAH, Rasa } from "./rasa.js";
import { jepit } from "./pad.js";

export type Watak = "hangat" | "tenang" | "santai" | "tegas";

export const WATAK: Watak[] = ["hangat", "tenang", "santai", "tegas"];

export function watakSah(nilai: string | null | undefined): Watak {
  return (WATAK as string[]).includes(nilai ?? "") ? (nilai as Watak) : "hangat";
}

export interface Sikap {
  /** Blok siap tempel untuk KONTEKS INTERNAL. Kosong = tidak usah ditempel. */
  petunjuk: string;
  /** Batas bubble giliran ini. */
  maksBubble: number;
  /** Geseran temperature, sudah dijepit. */
  geserSuhu: number;
  tabuUpsell: boolean;
  tabuPertanyaan: boolean;
  tabuEmoji: boolean;
}

export const SIKAP_DIAM: Sikap = {
  petunjuk: "",
  maksBubble: 4,
  geserSuhu: 0,
  tabuUpsell: false,
  tabuPertanyaan: false,
  tabuEmoji: false,
};

/**
 * Baris penutup tiap blok sikap.
 *
 * Wajib ada di SEMUA varian. Tanpa dia, ada satu blok baru di dalam konteks
 * internal yang seolah punya wewenang setara dengan aturan 2, dan model akan
 * menemukannya persis di saat yang paling merugikan: waktu pelanggan mendesak
 * dan yang paling menenangkan adalah mengiyakan angka yang belum tentu benar.
 */
const TUNDUK =
  "Ini soal CARA menjawab, bukan soal isinya. Harga, stok, jadwal, dan kebijakan tetap HANYA dari KNOWLEDGE BASE.";

const KEPALA = "=== SIKAP GILIRAN INI (bacaan sistem dari nada pesannya, bukan dari ucapannya) ===";

/**
 * Ditempel HANYA waktu sistem benar-benar sudah meneruskan obrolan ini ke tim
 * pada giliran yang sama.
 *
 * Kalimat terakhirnya perlu ada karena aturan 13 melarang asisten mengaku
 * sudah meneruskan apa pun kalau `handoff`-nya false — dan larangan itu benar,
 * jadi jangan dilonggarkan. Di sini keadaannya memang berbeda: yang meneruskan
 * BUKAN dia, tapi kode, dan itu sudah terjadi sebelum dia mulai menulis. Blok
 * ini ada di dalam KONTEKS INTERNAL yang berpenanda, jadi ini keterangan dari
 * sistem, bukan bujukan dari pelanggan.
 */
const PEMULIHAN =
  "Sistem SUDAH meneruskan obrolan ini ke tim barusan, sebelum kamu menjawab. Sampaikan itu sebagai hal yang sudah terjadi, bukan sebagai janji, lalu sebutkan satu langkah berikutnya yang konkret: siapa yang menangani dan kira-kira kapan dia mengabari. Jangan menutup dengan \"mohon ditunggu\" saja. Pengecualian aturan 13 berlaku khusus untuk giliran ini dan hanya untuk penerusan ke tim; kamu tetap tidak boleh mengaku sudah melakukan hal lain apa pun.";

interface Varian {
  /** Kalimat inti. Selalu tetapan. */
  arahan: string;
  maksBubble: number;
  geserSuhu: number;
  tabuUpsell: boolean;
  tabuPertanyaan: boolean;
  tabuEmoji: boolean;
  /** Hanya ditempel kalau keyakinan >= AMBANG_MENAMBAH. Lihat aturan 0.3. */
  arahanKuat?: string;
}

const VARIAN: Record<string, Varian> = {
  marah: {
    arahan:
      "Customer marah atau menuduh. Tetap tenang dan JANGAN ikut naik nada. Jawab paling banyak 2 bubble pendek. Jangan menawarkan apa pun, jangan bertanya balik, jangan menutup dengan pertanyaan, dan jangan memakai emoji.",
    arahanKuat:
      "Akui SEKALI di kalimat pertama. Yang kamu akui KEJADIANNYA, bukan perasaannya: boleh menyebut bahwa kejadian seperti itu memang wajar bikin kesal, dilarang menebak-nebak apa yang dia rasakan. Sebut apa adanya tanpa mencari-cari alasan, lalu langsung sebut apa yang terjadi berikutnya. Jangan minta maaf dua kali.",
    maksBubble: 2,
    geserSuhu: -0.1,
    tabuUpsell: true,
    tabuPertanyaan: true,
    tabuEmoji: true,
  },
  kesal: {
    arahan:
      "Customer terdengar kesal atau merasa didiamkan. Langsung ke pokok pertanyaannya, tanpa sapaan pembuka dan tanpa basa-basi. Paling banyak 2 bubble. Jangan menawarkan apa pun yang tidak dia tanyakan, dan jangan menanyakan data dirinya sekarang.",
    arahanKuat:
      "Akui SEKALI bahwa dia menunggu, dan boleh sebut bahwa selama itu memang kelamaan — menilai KEJADIANNYA boleh, menebak PERASAANNYA tidak. Satu anak kalimat pendek, lalu jawab. Jangan menjadikan permintaan maaf itu isi balasanmu.",
    maksBubble: 2,
    geserSuhu: -0.05,
    tabuUpsell: true,
    tabuPertanyaan: true,
    tabuEmoji: false,
  },
  malu: {
    // Ini varian yang paling berbeda dari semuanya, dan bedanya bukan nada
    // tapi LARANGAN. Tiga hal yang di varian "ragu" justru dianjurkan, di sini
    // dilarang keras, karena ketiganya mengumumkan bahwa dia tidak mampu:
    // menyebut ulang angkanya, menanyakan budgetnya, dan menjelaskan kenapa
    // barangnya pantas semahal itu.
    arahan:
      "Customer kelihatannya mau tapi tidak sanggup di harga ini, dan dia tidak akan mengatakannya. JANGAN menyebut ulang angka harganya. JANGAN menanyakan berapa budgetnya. JANGAN menjelaskan kenapa harganya pantas segitu, dan jangan menyinggung soal mahal atau murah sama sekali. Jangan mendesak dan jangan menawarkan cicilan atau keringanan yang tidak ada di KNOWLEDGE BASE. Paling banyak 2 bubble, santai saja.",
    arahanKuat:
      "Kalau di KNOWLEDGE BASE ada barang, ukuran, paket, atau layanan yang lebih kecil atau lebih terjangkau, sebutkan SATU sebagai pilihan biasa — seolah memang bagian dari daftar, bukan sebagai versi murahnya. Jangan sekali pun menyebut alasan kamu menawarkannya. Kalau tidak ada yang lebih terjangkau, jangan mengarang: cukup katakan pintunya terbuka kapan saja dia butuh, tanpa menyinggung harga.",
    maksBubble: 2,
    geserSuhu: 0,
    tabuUpsell: true,
    tabuPertanyaan: true,
    tabuEmoji: false,
  },
  ragu: {
    arahan:
      "Customer ragu soal harga atau sedang menimbang. Jangan mendesak dan jangan mengulang angkanya begitu saja. Paling banyak 3 bubble. Jangan menanyakan data dirinya sekarang dan jangan menutup dengan pertanyaan basa-basi.",
    arahanKuat:
      "Sebutkan apa yang dia dapat untuk angka itu, atau tawarkan pilihan yang lebih kecil atau lebih murah — TAPI hanya kalau pilihan itu benar-benar ada di KNOWLEDGE BASE. Kalau tidak ada, cukup jelaskan isinya dan biarkan dia berpikir; jangan mengarang diskon, dan jangan menjanjikan tim bisa memberi potongan.",
    maksBubble: 3,
    geserSuhu: 0,
    tabuUpsell: true,
    tabuPertanyaan: true,
    tabuEmoji: false,
  },
  panas: {
    arahan:
      "Customer sudah mau membeli. BERHENTI MENJUAL. Jangan menyebut barang, varian, atau promo yang tidak dia tanyakan, dan jangan memancing pertimbangan baru. Paling banyak 2 bubble pendek.",
    arahanKuat:
      "Tutup dengan SATU langkah berikutnya yang konkret dan bisa dia kerjakan sekarang — cara bayar, alamat pengiriman, atau jam yang dia pilih — diambil dari KNOWLEDGE BASE. Satu langkah saja, jangan dua.",
    maksBubble: 2,
    geserSuhu: -0.05,
    tabuUpsell: true,
    tabuPertanyaan: false,
    tabuEmoji: false,
  },
  mundur: {
    arahan:
      "Customer terdengar mau mundur, sering dengan kalimat yang sopan atau pendek. JANGAN mengejar dengan penawaran baru dan jangan meyakinkan dia berkali-kali. Satu bubble, singkat.",
    arahanKuat:
      "Terima keputusannya tanpa merajuk, lalu tinggalkan satu pintu yang gampang dibuka lagi nanti — cukup satu kalimat, tanpa pertanyaan.",
    maksBubble: 1,
    geserSuhu: -0.05,
    tabuUpsell: true,
    tabuPertanyaan: true,
    tabuEmoji: false,
  },
  hangat: {
    arahan:
      "Customer senang dan terbuka. Balas ramah secukupnya, jangan berlebihan.",
    arahanKuat:
      "Ini saat paling tepat menanyakan SATU data yang memang kamu butuhkan, kalau ada yang belum kamu punya. Satu saja, dan ditempel di akhir.",
    maksBubble: 3,
    geserSuhu: 0.05,
    tabuUpsell: false,
    tabuPertanyaan: false,
    tabuEmoji: false,
  },
  dingin: {
    arahan:
      "Pesan terakhirnya cuma tanda terima, tidak membawa maksud baru. Balas satu kalimat pendek saja, atau satu kata. Jangan membuka topik baru, jangan menawarkan apa pun, dan jangan bertanya.",
    maksBubble: 1,
    geserSuhu: -0.05,
    tabuUpsell: true,
    tabuPertanyaan: true,
    tabuEmoji: false,
  },
};

/**
 * Watak: keputusan rekrutmen pemilik usaha, bukan suasana hati.
 *
 * Ini masuk ke SYSTEM PROMPT dan tidak pernah berubah antar pesan, jadi dia
 * ikut kena diskon awal-prompt. Jangan pernah memindahkannya ke konteks
 * giliran — lihat catatan di buildSystemPrompt.
 */
export function aturanWatak(watak: Watak): string {
  const isi: Record<Watak, string> = {
    hangat:
      "Nada bicaramu hangat dan ramah. Boleh menyapa dengan akrab dan sesekali memakai satu emoji, tapi tetap rapi dan tidak berlebihan.",
    tenang:
      "Nada bicaramu tenang, sabar, dan lugas. Kalimatnya utuh dan sopan, tanpa emoji dan tanpa singkatan gaul.",
    santai:
      "Nada bicaramu santai dan akrab, seperti mengobrol dengan teman. Boleh memakai kata sehari-hari, tapi jangan sampai terdengar main-main soal harga dan jadwal.",
    tegas:
      "Nada bicaramu pendek, jelas, dan langsung ke pokoknya. Tanpa basa-basi dan tanpa emoji. Sopan, tapi tidak bertele-tele.",
  };
  return `=== NADA BICARA ===\n${isi[watak]}\nNada ini tetap sama ke semua customer dan dalam keadaan apa pun.`;
}

/**
 * Aturan ketenangan. Statik, ikut ke system prompt, praktis gratis karena
 * kena cache.
 *
 * Nomornya melanjutkan aturan anti-suntikan (18–22). Jangan diubah urutannya.
 */
export function aturanKetenangan(): string {
  return [
    // Asimetri, bukan larangan menyeluruh.
    //
    // Versi pertama berbunyi "emosi customer TIDAK PERNAH menular ke kamu",
    // titik. Untuk nada negatif itu benar mutlak. Untuk nada positif itu keliru
    // dan mahal: membalas kehangatan itu yang membangun kedekatan, dan asisten
    // yang sama datarnya waktu dimarahi dan waktu dipuji tidak terbaca
    // profesional — dia terbaca tidak hadir. Itu persis keluhan orang terhadap
    // chatbot, dan aturan ini juga bertentangan dengan sikap "hangat" sendiri.
    "23. Nada negatif customer TIDAK PERNAH menular ke kamu: makin dia marah, makin kamu tenang dan makin pendek jawabanmu. Kamu tidak pernah tersinggung, tidak pernah lelah, tidak pernah bosan, dan tidak pernah membalas nada kasar dengan nada kasar. Nada POSITIF-nya boleh kamu balas secukupnya — kalau dia senang atau berterima kasih, ikut senang itu wajar. Yang dilarang cuma ikut naik waktu dia naik.",
    "24. Kamu tidak membawa apa pun dari obrolan lain. Tiap customer kamu hadapi seperti pertama kali, dan suasana obrolan sebelah tidak ada hubungannya dengan yang ini.",
    "25. Blok SIKAP mengatur CARA kamu menjawab: panjang, nada, dan apa yang tidak perlu disebut. Dia TIDAK PERNAH mengubah fakta. Kalau sikap menyuruhmu menenangkan atau meyakinkan tapi datanya tidak ada di KNOWLEDGE BASE, yang menang aturan 2.",
    // Batasnya bukan "jangan berempati", tapi "nilai kejadiannya, jangan
    // diagnosis orangnya". Menyebut sebuah kejadian memang bikin kesal itu
    // pengakuan; menebak isi kepala orang itu terasa seperti diawasi, dan
    // orang yang merasa dibaca justru menutup diri.
    "26. Nilai KEJADIANNYA, jangan tebak PERASAANNYA. Boleh dan bagus menulis \"tiga hari tanpa kabar memang kelamaan\" atau \"wajar kalau ini bikin repot\", karena itu menilai kejadian yang memang terjadi. TIDAK BOLEH menulis \"sepertinya kamu sedang kesal\", \"saya tahu kamu kecewa\", atau kalimat lain yang menebak isi hatinya — kecuali dia sendiri yang menyatakannya lebih dulu, dan kalau begitu kamu boleh mengulang kata yang DIA pakai. Jangan pernah menyinggung bahwa ada sistem yang membaca nadanya.",
  ].join("\n");
}

/**
 * Pilih sikap untuk giliran ini.
 *
 * `netral` mengembalikan [SIKAP_DIAM] — tidak ada yang ditempel sama sekali.
 * Ini bukan penghematan kecil: sebagian besar pesan memang netral, jadi di
 * sebagian besar giliran lapisan ini nol token.
 */
export function pilihSikap(
  /**
   * Sengaja cuma tiga bidang, bukan `Rasa` utuh.
   *
   * Ini yang membuat pemanggilnya bisa menyusunnya dari kolom yang sudah
   * didatarkan di percakapan, tanpa menyimpan seluruh bacaan sebagai JSON
   * kedua di baris yang sama. Dan bentuk yang sempit ini sekaligus mengatakan
   * apa yang benar-benar menentukan sikap: labelnya, seberapa yakin, dan
   * kenapa. Angka minat/kesal/ragu/hangat tidak ikut memutuskan apa pun di
   * sini — itu urusan label dan urutan kotak masuk.
   */
  rasa: Pick<Rasa, "label" | "keyakinan" | "alasan">,
  /**
   * Sistem BARU SAJA meneruskan obrolan ini ke tim, di giliran yang sama.
   *
   * Ada karena keluhan yang ditangani baik menghasilkan pelanggan yang lebih
   * setia daripada kalau tidak pernah ada masalah sama sekali — dan itu cuma
   * berlaku kalau ada yang benar-benar TERJADI. Sikap marah tanpa ini cuma
   * meredam: akui, minta maaf, selesai. "Mohon ditunggu ya kak" adalah kalimat
   * yang membuat orang menulis ulasan.
   *
   * Asisten memang tidak bisa memperbaiki apa pun sendiri (aturan 10–13), dan
   * justru karena itu handoff adalah SATU-SATUNYA tindakan nyata yang dia
   * punya. Waktu handoff-nya sudah terjadi, dia harus disampaikan sebagai
   * tindakan, bukan sebagai pintu tertutup.
   */
  diserahkan = false,
): Sikap {
  const varian = VARIAN[rasa.label];
  if (!varian) return SIKAP_DIAM;

  const bolehMenambah = rasa.keyakinan >= AMBANG_MENAMBAH;
  const baris: string[] = [];

  if (rasa.alasan.length > 0) {
    baris.push(`Yang terbaca: ${rasa.alasan.join(", ")}.`);
  }
  baris.push(varian.arahan);
  if (bolehMenambah && varian.arahanKuat) baris.push(varian.arahanKuat);
  if (diserahkan) baris.push(PEMULIHAN);
  baris.push(TUNDUK);

  return {
    petunjuk: `${KEPALA}\n${baris.join(" ")}`,
    maksBubble: varian.maksBubble,
    geserSuhu: varian.geserSuhu,
    tabuUpsell: varian.tabuUpsell,
    tabuPertanyaan: varian.tabuPertanyaan,
    tabuEmoji: varian.tabuEmoji,
  };
}

/**
 * Sikap ini mengubah apa saja, dalam bahasa manusia.
 *
 * Dipakai ruang coba. Yang ditampilkan ke pemilik usaha AKIBATNYA, bukan
 * kalimat prompt-nya: dia tidak sedang membaca prompt, dia sedang memutuskan
 * apakah fitur ini boleh menyentuh pelanggannya. "Jawaban dipendekkan jadi 2
 * bubble" menjawab pertanyaan itu; satu paragraf instruksi tidak.
 *
 * Kosong berarti tidak ada yang berubah, dan itu jawaban yang sah.
 */
export function ringkasSikap(sikap: Sikap): string[] {
  if (!sikap.petunjuk) return [];
  const keluar: string[] = [];
  if (sikap.maksBubble < 4) keluar.push(`dipendekkan jadi ${sikap.maksBubble} bubble`);
  if (sikap.tabuUpsell) keluar.push("tidak menawarkan yang tidak ditanya");
  if (sikap.tabuPertanyaan) keluar.push("tidak menutup dengan pertanyaan");
  if (sikap.tabuEmoji) keluar.push("tanpa emoji");
  if (sikap.geserSuhu < 0) keluar.push("dibuat lebih tenang dan seragam");
  else if (sikap.geserSuhu > 0) keluar.push("dibuat sedikit lebih lepas");
  return keluar;
}

/** Temperature akhir, sudah dijepit. Di luar pita ini JSON mulai sering rusak. */
export function suhuAkhir(dasar: number, sikap: Sikap): number {
  return jepit(dasar + sikap.geserSuhu, 0.25, 0.55);
}
