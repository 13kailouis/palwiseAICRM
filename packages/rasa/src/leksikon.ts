/**
 * Leksikon chat jualan Indonesia.
 *
 * Ditulis dari nol, TIDAK diambil dari leksikon mesin afektif aslinya. Yang di
 * sana kosakata teman curhat — sedih, kesepian, rindu, bangga — dan tidak satu
 * pun kata itu muncul di chat toko. Yang muncul: "kok mahal", "ready ga",
 * "transfer kemana", "kok lama", "ga jadi deh".
 *
 * TIGA HAL YANG MEMBEDAKAN INI DARI DAFTAR KATA BIASA
 *
 * 1. FRASA DULU, BARU KATA. "kok lama" bukan "lama". "ga jadi" bukan "jadi".
 *    "makasih deh" itu penolakan, bukan terima kasih. Daftar kata tunggal
 *    membaca ketiganya terbalik, dan terbalik lebih buruk daripada tidak tahu.
 *
 * 2. YANG KATANYA NETRAL TAPI ARTINYA KESAL. "yaudah", "terserah", "oke deh",
 *    "gapapa kok" — ini yang paling sering ditulis pembeli Indonesia yang
 *    sedang kecewa tapi sungkan, dan ini juga yang paling sering luput. Justru
 *    ini yang paling mahal: orang yang menulis "yaudah" hampir tidak pernah
 *    kembali, dan tidak pernah menjelaskan kenapa.
 *
 * 3. NIAT BELI BUKAN EMOSI. "transfer kemana ya" itu isyarat paling kuat yang
 *    bisa diberikan seorang pembeli, dan secara emosi dia datar. Karena itu
 *    niat dihitung di jalur sendiri lewat `tanda: "minat"`, tidak lewat PAD.
 *    Memaksakannya ke valensi bikin dua-duanya salah.
 *
 * Angkanya: `v` valensi -1..1, `a` gairah -1..1 (0 = tenang), `d` kuasa -1..1.
 * Kuasa itu yang memisahkan marah dari takut: dua-duanya tidak enak dan
 * bergairah tinggi, yang membedakan cuma siapa yang merasa pegang kendali.
 */

export type Tanda =
  /** Isyarat mau beli. Bukan emosi — dihitung terpisah. */
  | "minat"
  /** Kaget harga, mau nawar, mau mikir dulu. */
  | "ragu"
  /**
   * Tidak sanggup, dan sungkan mengatakannya.
   *
   * DIPISAH DARI "ragu" pada 16 Agustus 2026, dan ini pemisahan yang paling
   * menentukan di seluruh berkas.
   *
   * Ragu itu menimbang: dia mampu, tapi belum yakin barangnya sepadan. Yang
   * menolongnya alasan dan pembanding. Malu itu ancaman-muka: dia mau, tapi
   * tidak sanggup, dan yang paling ditakutinya bukan kehilangan barangnya —
   * tapi ketahuan tidak mampu. Yang menolongnya jalan keluar yang tidak
   * mengharuskannya mengakui apa pun.
   *
   * Perlakuan yang benar untuk ragu MELUKAI yang malu: menyebut ulang
   * angkanya, menanyakan berapa budgetnya, atau menawarkan yang lebih murah
   * sambil menyebut alasannya — ketiganya mengumumkan bahwa dia tidak mampu.
   *
   * Dan dia hampir tidak pernah punya katanya sendiri. Orang tidak mengetik
   * "saya malu". Dia mengetik "oh gitu ya kak", lalu hilang. Karena itu
   * separuh pengenalannya datang dari PERILAKU, bukan dari daftar ini: pesan
   * yang mendadak memendek tepat sesudah harganya disebut.
   */
  | "malu"
  /** Tidak sabar, merasa didiamkan. */
  | "desak"
  /** Ada yang merugikan dia: rusak, belum sampai, uangnya nyangkut. */
  | "komplain"
  /** Tuduhan atau ancaman. Ini yang wajib dipegang manusia. */
  | "keras"
  /** Puas, akrab, berterima kasih. */
  | "hangat"
  /** Mundur. Sering ditulis sopan, dan itu yang bikin luput. */
  | "batal";

export interface Isyarat {
  v: number;
  a: number;
  d?: number;
  tanda?: Tanda;
  /** 1..3, hanya untuk tanda "minat". 3 = tinggal bayar. */
  bobot?: number;
}

/**
 * Frasa. Dicocokkan pada teks yang sudah dinormalkan, YANG PANJANG DULU.
 *
 * Urutan panjang itu wajib: "ga jadi pesan" harus menang atas "jadi pesan",
 * kalau tidak pembatalan terbaca sebagai pemesanan. Pengurutannya dilakukan
 * sekali di [FRASA_URUT], bukan diandalkan pada urutan pengetikan di sini.
 */
export const FRASA: Record<string, Isyarat> = {
  // ── niat beli ───────────────────────────────────────────────────────────────
  // Bobot 3 = tidak ada tafsir lain selain mau bayar.
  "transfer kemana": { v: 0.3, a: 0.3, tanda: "minat", bobot: 3 },
  "transfer ke mana": { v: 0.3, a: 0.3, tanda: "minat", bobot: 3 },
  "cara bayarnya": { v: 0.3, a: 0.3, tanda: "minat", bobot: 3 },
  "cara bayar": { v: 0.3, a: 0.3, tanda: "minat", bobot: 3 },
  "cara pesannya": { v: 0.3, a: 0.3, tanda: "minat", bobot: 3 },
  "cara ordernya": { v: 0.3, a: 0.3, tanda: "minat", bobot: 3 },
  "nomor rekening": { v: 0.25, a: 0.25, tanda: "minat", bobot: 3 },
  "no rekening": { v: 0.25, a: 0.25, tanda: "minat", bobot: 3 },
  "no rek": { v: 0.25, a: 0.25, tanda: "minat", bobot: 3 },
  rekeningnya: { v: 0.25, a: 0.25, tanda: "minat", bobot: 3 },
  "saya ambil": { v: 0.4, a: 0.4, tanda: "minat", bobot: 3 },
  "aku ambil": { v: 0.4, a: 0.4, tanda: "minat", bobot: 3 },
  "mau ambil": { v: 0.4, a: 0.4, tanda: "minat", bobot: 3 },
  "saya pesan": { v: 0.4, a: 0.4, tanda: "minat", bobot: 3 },
  "mau pesan": { v: 0.4, a: 0.4, tanda: "minat", bobot: 3 },
  "mau pesen": { v: 0.4, a: 0.4, tanda: "minat", bobot: 3 },
  "mau order": { v: 0.4, a: 0.4, tanda: "minat", bobot: 3 },
  "jadi pesan": { v: 0.4, a: 0.4, tanda: "minat", bobot: 3 },
  "oke deal": { v: 0.5, a: 0.5, tanda: "minat", bobot: 3 },
  "sudah transfer": { v: 0.35, a: 0.3, tanda: "minat", bobot: 3 },
  "udah transfer": { v: 0.35, a: 0.3, tanda: "minat", bobot: 3 },
  "sudah tf": { v: 0.35, a: 0.3, tanda: "minat", bobot: 3 },
  "bukti transfer": { v: 0.35, a: 0.3, tanda: "minat", bobot: 3 },
  "alamat saya": { v: 0.3, a: 0.25, tanda: "minat", bobot: 3 },
  "kirim ke alamat": { v: 0.3, a: 0.25, tanda: "minat", bobot: 3 },
  "totalnya berapa": { v: 0.25, a: 0.3, tanda: "minat", bobot: 3 },
  "total semuanya": { v: 0.25, a: 0.3, tanda: "minat", bobot: 3 },

  // Bobot 2 = sudah menimbang barang tertentu.
  "masih ready": { v: 0.2, a: 0.25, tanda: "minat", bobot: 2 },
  "masih ada": { v: 0.2, a: 0.25, tanda: "minat", bobot: 2 },
  "masih tersedia": { v: 0.2, a: 0.25, tanda: "minat", bobot: 2 },
  "stoknya masih": { v: 0.2, a: 0.25, tanda: "minat", bobot: 2 },
  "minta katalog": { v: 0.2, a: 0.2, tanda: "minat", bobot: 2 },
  "lihat katalog": { v: 0.2, a: 0.2, tanda: "minat", bobot: 2 },
  "ada ukuran": { v: 0.2, a: 0.2, tanda: "minat", bobot: 2 },
  "warna apa aja": { v: 0.2, a: 0.2, tanda: "minat", bobot: 2 },
  "ongkirnya berapa": { v: 0.2, a: 0.25, tanda: "minat", bobot: 2 },
  "bisa cod": { v: 0.2, a: 0.25, tanda: "minat", bobot: 2 },
  "kapan bisa dikirim": { v: 0.15, a: 0.3, tanda: "minat", bobot: 2 },
  "bisa dikirim hari ini": { v: 0.15, a: 0.4, tanda: "minat", bobot: 2 },
  "bisa dipakai kapan": { v: 0.15, a: 0.25, tanda: "minat", bobot: 2 },
  "jadwalnya kapan": { v: 0.15, a: 0.25, tanda: "minat", bobot: 2 },
  "bisa booking": { v: 0.25, a: 0.3, tanda: "minat", bobot: 2 },

  // Bobot 1 = baru bertanya.
  "berapa harganya": { v: 0.1, a: 0.2, tanda: "minat", bobot: 1 },
  "harganya berapa": { v: 0.1, a: 0.2, tanda: "minat", bobot: 1 },
  "berapa harga": { v: 0.1, a: 0.2, tanda: "minat", bobot: 1 },
  "mau tanya": { v: 0.1, a: 0.15, tanda: "minat", bobot: 1 },
  "boleh tanya": { v: 0.1, a: 0.15, tanda: "minat", bobot: 1 },

  // ── ragu dan tawar ──────────────────────────────────────────────────────────
  // Kuasa negatif: orang yang kaget harga sedang merasa tidak mampu, bukan
  // sedang menuntut. Bedanya menentukan sikap: yang ini butuh alasan dan
  // pilihan, bukan permintaan maaf.
  "kok mahal": { v: -0.5, a: 0.35, d: -0.2, tanda: "ragu" },
  "mahal banget": { v: -0.55, a: 0.4, d: -0.2, tanda: "ragu" },
  "mahal amat": { v: -0.55, a: 0.4, d: -0.2, tanda: "ragu" },
  "kemahalan": { v: -0.55, a: 0.35, d: -0.2, tanda: "ragu" },
  "kok segitu": { v: -0.45, a: 0.35, d: -0.2, tanda: "ragu" },
  "ada diskon": { v: -0.2, a: 0.25, d: -0.1, tanda: "ragu" },
  "ada promo": { v: -0.15, a: 0.25, d: -0.1, tanda: "ragu" },
  "boleh nego": { v: -0.2, a: 0.3, d: -0.1, tanda: "ragu" },
  "nego dong": { v: -0.2, a: 0.3, d: -0.1, tanda: "ragu" },
  "kurangin dong": { v: -0.25, a: 0.3, d: -0.1, tanda: "ragu" },
  "murahin dong": { v: -0.25, a: 0.3, d: -0.1, tanda: "ragu" },
  "bisa kurang": { v: -0.2, a: 0.25, d: -0.1, tanda: "ragu" },
  "ada yang lebih murah": { v: -0.3, a: 0.25, d: -0.2, tanda: "ragu" },
  // "budget" dipindah ke kelompok malu di bawah. Orang yang menyebut budgetnya
  // sendiri tidak sedang menawar — dia sedang mengaku tidak sanggup, dan itu
  // butuh perlakuan yang berbeda. Lihat catatan di tanda "malu".
  "kalau ambil banyak": { v: -0.1, a: 0.25, d: -0.05, tanda: "ragu" },
  "harga grosir": { v: -0.05, a: 0.25, tanda: "ragu" },
  "pikir pikir dulu": { v: -0.3, a: -0.1, d: -0.2, tanda: "ragu" },
  "pikir dulu": { v: -0.3, a: -0.1, d: -0.2, tanda: "ragu" },
  "nanti saya kabari": { v: -0.3, a: -0.15, d: -0.15, tanda: "ragu" },
  "nanti dikabari": { v: -0.3, a: -0.15, d: -0.15, tanda: "ragu" },
  "tanya suami dulu": { v: -0.2, a: -0.05, d: -0.3, tanda: "ragu" },
  "tanya istri dulu": { v: -0.2, a: -0.05, d: -0.3, tanda: "ragu" },
  "tanya bos dulu": { v: -0.2, a: -0.05, d: -0.3, tanda: "ragu" },
  "diskusi dulu": { v: -0.2, a: -0.05, d: -0.25, tanda: "ragu" },
  "bandingkan dulu": { v: -0.35, a: 0.05, d: -0.1, tanda: "ragu" },
  "bandingin dulu": { v: -0.35, a: 0.05, d: -0.1, tanda: "ragu" },
  "lihat lihat dulu": { v: -0.25, a: -0.15, d: -0.15, tanda: "ragu" },
  "liat liat dulu": { v: -0.25, a: -0.15, d: -0.15, tanda: "ragu" },

  // ── malu: tidak sanggup, dan sungkan mengatakannya ──────────────────────────
  // Kuasa SANGAT negatif dan gairah RENDAH. Itu yang memisahkannya dari ragu
  // (kuasa agak negatif) dan dari kesal (gairah tinggi, kuasa positif).
  //
  // Perhatikan "maaf": pembeli yang MINTA MAAF karena tidak jadi membeli itu
  // isyarat malu yang hampir tidak pernah keliru. Dia sedang meminta maaf
  // karena tidak sanggup, dan tidak ada satu pun alasan lain seseorang minta
  // maaf kepada penjual.
  "budget saya": { v: -0.35, a: -0.15, d: -0.55, tanda: "malu" },
  "di luar budget": { v: -0.45, a: -0.15, d: -0.6, tanda: "malu" },
  "belum ada rejeki": { v: -0.4, a: -0.25, d: -0.6, tanda: "malu" },
  "belum ada rezeki": { v: -0.4, a: -0.25, d: -0.6, tanda: "malu" },
  "belum ada budget": { v: -0.4, a: -0.2, d: -0.6, tanda: "malu" },
  "belum sanggup": { v: -0.45, a: -0.2, d: -0.65, tanda: "malu" },
  "belum mampu": { v: -0.45, a: -0.2, d: -0.65, tanda: "malu" },
  "gak sanggup": { v: -0.45, a: -0.2, d: -0.65, tanda: "malu" },
  "ga kuat": { v: -0.4, a: -0.2, d: -0.6, tanda: "malu" },
  "nabung dulu": { v: -0.35, a: -0.25, d: -0.55, tanda: "malu" },
  "kumpulin dulu": { v: -0.35, a: -0.25, d: -0.55, tanda: "malu" },
  "nunggu gajian": { v: -0.3, a: -0.2, d: -0.5, tanda: "malu" },
  "kalau ada rejeki": { v: -0.35, a: -0.25, d: -0.55, tanda: "malu" },
  "kalau ada rezeki": { v: -0.35, a: -0.25, d: -0.55, tanda: "malu" },
  "kapan kapan aja": { v: -0.35, a: -0.3, d: -0.5, tanda: "malu" },
  // "maaf kak" dan "maaf ya kak" SENGAJA TIDAK ADA di sini.
  //
  // Pembeli yang minta maaf karena tidak sanggup memang isyarat malu yang kuat,
  // tapi di Indonesia "maaf kak" jauh lebih sering cuma pembuka sopan sebelum
  // bertanya — dan sebelum komplain. Memasukkannya berarti "maaf kak mau tanya
  // harganya" terbaca sebagai orang yang tidak mampu, dan itu memicu sikap yang
  // menghindari menyebut harga tepat waktu dia menanyakannya.
  //
  // Bentuk yang benar-benar menandakan malu itu permintaan maaf yang berdiri
  // sendiri SESUDAH harga disebut, dan itu ditangkap lewat perilaku
  // (`setelahAngka` di baca.ts), bukan lewat kata.
  "maaf merepotkan": { v: -0.35, a: -0.15, d: -0.6, tanda: "malu" },
  "maaf ngerepotin": { v: -0.35, a: -0.15, d: -0.6, tanda: "malu" },
  "cuma nanya": { v: -0.3, a: -0.15, d: -0.5, tanda: "malu" },
  "cuma tanya tanya": { v: -0.3, a: -0.15, d: -0.5, tanda: "malu" },
  // Tiga ini SENGAJA tanpa tanda apa pun, cuma bawa arah PAD-nya.
  //
  // "Oh gitu ya kak" sendirian memang tidak berarti apa-apa — itu tanda terima
  // biasa, dan membacanya sebagai "tidak sanggup" itu mengarang. Yang membuatnya
  // berarti bukan kata-katanya tapi LETAKNYA: tepat sesudah harga disebut, dan
  // lebih pendek dari pesan-pesan dia sebelumnya. Dua hal itu ditangkap sinyal
  // perilaku `setelahAngka`, dan barulah gabungannya melewati ambang.
  //
  // Ini bentuk paling murni dari prinsip di berkas ini: yang tidak punya kata
  // harus dikenali dari perilaku, bukan dipaksa punya kata.
  "oh gitu ya": { v: -0.3, a: -0.3, d: -0.4 },
  "oh begitu ya": { v: -0.3, a: -0.3, d: -0.4 },
  "ooh gitu": { v: -0.3, a: -0.3, d: -0.4 },

  // ── tidak sabar ─────────────────────────────────────────────────────────────
  // Kuasa POSITIF: dia sedang menuntut, bukan memelas. Ini yang memisahkannya
  // dari "ragu" walau valensinya sama-sama negatif.
  "kok lama": { v: -0.5, a: 0.55, d: 0.35, tanda: "desak" },
  "lama banget": { v: -0.5, a: 0.55, d: 0.35, tanda: "desak" },
  "lama amat": { v: -0.5, a: 0.55, d: 0.35, tanda: "desak" },
  "dari tadi": { v: -0.45, a: 0.5, d: 0.3, tanda: "desak" },
  "dari kemarin": { v: -0.5, a: 0.5, d: 0.3, tanda: "desak" },
  "belum dibalas": { v: -0.55, a: 0.55, d: 0.35, tanda: "desak" },
  "belum dibales": { v: -0.55, a: 0.55, d: 0.35, tanda: "desak" },
  "ga dibalas": { v: -0.6, a: 0.6, d: 0.35, tanda: "desak" },
  "ga dibales": { v: -0.6, a: 0.6, d: 0.35, tanda: "desak" },
  "gak dibales": { v: -0.6, a: 0.6, d: 0.35, tanda: "desak" },
  "tidak dibalas": { v: -0.6, a: 0.6, d: 0.35, tanda: "desak" },
  "masih nunggu": { v: -0.45, a: 0.45, d: 0.25, tanda: "desak" },
  "nunggu terus": { v: -0.5, a: 0.5, d: 0.3, tanda: "desak" },
  "ditunggu ya": { v: -0.25, a: 0.4, d: 0.3, tanda: "desak" },
  "tolong dibalas": { v: -0.4, a: 0.5, d: 0.3, tanda: "desak" },
  "gimana ini": { v: -0.45, a: 0.5, d: 0.3, tanda: "desak" },
  "gimana sih": { v: -0.55, a: 0.6, d: 0.4, tanda: "desak" },
  "gmn ini": { v: -0.45, a: 0.5, d: 0.3, tanda: "desak" },
  "ada orangnya": { v: -0.35, a: 0.45, d: 0.25, tanda: "desak" },
  "ada yang jaga": { v: -0.35, a: 0.45, d: 0.25, tanda: "desak" },
  "kok didiamkan": { v: -0.6, a: 0.55, d: 0.3, tanda: "desak" },
  "udah berapa hari": { v: -0.6, a: 0.5, d: 0.3, tanda: "desak" },
  "sudah berapa hari": { v: -0.6, a: 0.5, d: 0.3, tanda: "desak" },
  "buru buru": { v: -0.2, a: 0.55, d: 0.2, tanda: "desak" },

  // ── komplain ────────────────────────────────────────────────────────────────
  "belum sampai": { v: -0.6, a: 0.45, d: 0.1, tanda: "komplain" },
  "blm sampai": { v: -0.6, a: 0.45, d: 0.1, tanda: "komplain" },
  "belum nyampe": { v: -0.6, a: 0.45, d: 0.1, tanda: "komplain" },
  "ga sampai": { v: -0.65, a: 0.5, d: 0.1, tanda: "komplain" },
  "salah kirim": { v: -0.7, a: 0.55, d: 0.2, tanda: "komplain" },
  "salah barang": { v: -0.7, a: 0.55, d: 0.2, tanda: "komplain" },
  "barangnya rusak": { v: -0.75, a: 0.55, d: 0.2, tanda: "komplain" },
  "sudah rusak": { v: -0.7, a: 0.5, d: 0.15, tanda: "komplain" },
  "ga sesuai": { v: -0.65, a: 0.5, d: 0.2, tanda: "komplain" },
  "gak sesuai": { v: -0.65, a: 0.5, d: 0.2, tanda: "komplain" },
  "tidak sesuai": { v: -0.65, a: 0.5, d: 0.2, tanda: "komplain" },
  "beda sama fotonya": { v: -0.7, a: 0.5, d: 0.2, tanda: "komplain" },
  "minta refund": { v: -0.75, a: 0.55, d: 0.35, tanda: "komplain" },
  "minta ganti": { v: -0.6, a: 0.5, d: 0.3, tanda: "komplain" },
  "uang saya kembali": { v: -0.8, a: 0.6, d: 0.4, tanda: "komplain" },
  "kembalikan uang": { v: -0.8, a: 0.6, d: 0.4, tanda: "komplain" },
  "balikin uang": { v: -0.8, a: 0.6, d: 0.4, tanda: "komplain" },
  "uang saya": { v: -0.6, a: 0.5, d: 0.3, tanda: "komplain" },
  "saya kecewa": { v: -0.75, a: 0.4, d: 0.1, tanda: "komplain" },
  "kecewa banget": { v: -0.8, a: 0.45, d: 0.15, tanda: "komplain" },
  "ga profesional": { v: -0.7, a: 0.55, d: 0.35, tanda: "komplain" },
  "tidak profesional": { v: -0.7, a: 0.55, d: 0.35, tanda: "komplain" },
  "udah bayar tapi": { v: -0.75, a: 0.55, d: 0.25, tanda: "komplain" },
  "sudah bayar tapi": { v: -0.75, a: 0.55, d: 0.25, tanda: "komplain" },
  "sudah bayar belum": { v: -0.75, a: 0.55, d: 0.25, tanda: "komplain" },
  "dibatalkan sepihak": { v: -0.8, a: 0.6, d: 0.3, tanda: "komplain" },
  "parah banget": { v: -0.75, a: 0.6, d: 0.35, tanda: "komplain" },
  "kok gini": { v: -0.6, a: 0.5, d: 0.25, tanda: "komplain" },
  "gak bener": { v: -0.6, a: 0.5, d: 0.3, tanda: "komplain" },

  // ── keras: tuduhan dan ancaman ──────────────────────────────────────────────
  // Ini yang wajib dipegang manusia, dan wajib ditangkap kode, bukan cuma
  // diserahkan ke model.
  "saya laporkan": { v: -0.85, a: 0.7, d: 0.6, tanda: "keras" },
  "lapor polisi": { v: -0.9, a: 0.75, d: 0.6, tanda: "keras" },
  "lapor ke polisi": { v: -0.9, a: 0.75, d: 0.6, tanda: "keras" },
  "bawa ke polisi": { v: -0.9, a: 0.75, d: 0.6, tanda: "keras" },
  "ranah hukum": { v: -0.9, a: 0.7, d: 0.6, tanda: "keras" },
  "saya tuntut": { v: -0.9, a: 0.75, d: 0.6, tanda: "keras" },
  "saya viralkan": { v: -0.85, a: 0.75, d: 0.6, tanda: "keras" },
  "tak viralin": { v: -0.85, a: 0.75, d: 0.6, tanda: "keras" },
  "penipuan": { v: -0.85, a: 0.7, d: 0.5, tanda: "keras" },
  "tipu tipu": { v: -0.85, a: 0.7, d: 0.5, tanda: "keras" },
  "toko abal abal": { v: -0.8, a: 0.65, d: 0.5, tanda: "keras" },

  // ── hangat ──────────────────────────────────────────────────────────────────
  "makasih banyak": { v: 0.65, a: 0.1, d: 0.1, tanda: "hangat" },
  "terima kasih banyak": { v: 0.65, a: 0.1, d: 0.1, tanda: "hangat" },
  "terima kasih": { v: 0.55, a: 0.05, d: 0.1, tanda: "hangat" },
  "makasih kak": { v: 0.6, a: 0.1, d: 0.1, tanda: "hangat" },
  "baik banget": { v: 0.7, a: 0.2, d: 0.15, tanda: "hangat" },
  "ramah banget": { v: 0.7, a: 0.2, d: 0.15, tanda: "hangat" },
  "sabar banget": { v: 0.65, a: 0.05, d: 0.1, tanda: "hangat" },
  "puas banget": { v: 0.8, a: 0.35, d: 0.25, tanda: "hangat" },
  "sesuai ekspektasi": { v: 0.7, a: 0.2, d: 0.2, tanda: "hangat" },
  "cepat banget": { v: 0.65, a: 0.35, d: 0.2, tanda: "hangat" },
  "langganan terus": { v: 0.75, a: 0.3, d: 0.25, tanda: "hangat" },
  "sukses selalu": { v: 0.7, a: 0.2, d: 0.15, tanda: "hangat" },
  "sehat selalu": { v: 0.7, a: 0.15, d: 0.15, tanda: "hangat" },
  "oke siap": { v: 0.4, a: 0.2, d: 0.15, tanda: "hangat" },
  "siap kak": { v: 0.4, a: 0.2, d: 0.15, tanda: "hangat" },

  // ── batal, dan versi sopannya ───────────────────────────────────────────────
  // BAGIAN INI YANG PALING BERNILAI DAN PALING GAMPANG LUPUT.
  //
  // Pembeli Indonesia jarang bilang "saya tidak jadi karena kemahalan". Dia
  // bilang "yaudah", "makasih deh", "oke deh". Kata-katanya netral atau bahkan
  // positif, dan daftar kata biasa akan menghitungnya sebagai pelanggan senang
  // — persis pada pesan terakhir sebelum dia hilang selamanya.
  "ga jadi": { v: -0.5, a: -0.1, d: -0.1, tanda: "batal" },
  "gak jadi": { v: -0.5, a: -0.1, d: -0.1, tanda: "batal" },
  "nggak jadi": { v: -0.5, a: -0.1, d: -0.1, tanda: "batal" },
  "tidak jadi": { v: -0.5, a: -0.1, d: -0.1, tanda: "batal" },
  "batal aja": { v: -0.55, a: 0, d: 0, tanda: "batal" },
  "batalkan saja": { v: -0.55, a: 0, d: 0, tanda: "batal" },
  "makasih deh": { v: -0.4, a: -0.2, d: -0.1, tanda: "batal" },
  "terima kasih deh": { v: -0.4, a: -0.2, d: -0.1, tanda: "batal" },
  "ga dulu deh": { v: -0.4, a: -0.2, d: -0.1, tanda: "batal" },
  "gak dulu": { v: -0.4, a: -0.2, d: -0.1, tanda: "batal" },
  "lain kali aja": { v: -0.4, a: -0.2, d: -0.1, tanda: "batal" },
  "besok besok aja": { v: -0.4, a: -0.2, d: -0.1, tanda: "batal" },
  "cari yang lain": { v: -0.6, a: 0.1, d: 0.1, tanda: "batal" },
  "di tempat lain": { v: -0.55, a: 0.1, d: 0.1, tanda: "batal" },
  "udah dapet yang lain": { v: -0.6, a: 0, d: 0.1, tanda: "batal" },
  "sudah dapat yang lain": { v: -0.6, a: 0, d: 0.1, tanda: "batal" },
  "ga usah deh": { v: -0.5, a: -0.05, d: -0.05, tanda: "batal" },
  "gausah deh": { v: -0.5, a: -0.05, d: -0.05, tanda: "batal" },
  // Pasif-agresif. Valensi dalam, gairah RENDAH — itu bedanya dari marah, dan
  // itu juga kenapa dia butuh sikap yang lain: orang ini tidak mau diyakinkan,
  // dia mau diakui.
  "ya udah": { v: -0.5, a: -0.25, d: -0.2, tanda: "batal" },
  "yaudah": { v: -0.5, a: -0.25, d: -0.2, tanda: "batal" },
  "ya sudah": { v: -0.5, a: -0.25, d: -0.2, tanda: "batal" },
  "oke deh": { v: -0.35, a: -0.25, d: -0.15, tanda: "batal" },
  "yaudalah": { v: -0.55, a: -0.25, d: -0.2, tanda: "batal" },
  "terserah": { v: -0.6, a: -0.15, d: -0.1, tanda: "batal" },
  "gapapa kok": { v: -0.35, a: -0.25, d: -0.2, tanda: "batal" },
  "ga papa kok": { v: -0.35, a: -0.25, d: -0.2, tanda: "batal" },
  "gpp kok": { v: -0.35, a: -0.25, d: -0.2, tanda: "batal" },
  "ga apa apa": { v: -0.25, a: -0.2, d: -0.15 },
  "sayangnya": { v: -0.4, a: -0.05, d: -0.1 },
};

/** Kata tunggal. Dicocokkan setelah frasa, dan hanya pada token yang belum terpakai. */
export const KATA: Record<string, Isyarat> = {
  // niat
  gas: { v: 0.4, a: 0.5, tanda: "minat", bobot: 3 },
  deal: { v: 0.45, a: 0.45, tanda: "minat", bobot: 3 },
  checkout: { v: 0.35, a: 0.4, tanda: "minat", bobot: 3 },
  order: { v: 0.25, a: 0.3, tanda: "minat", bobot: 2 },
  cod: { v: 0.2, a: 0.25, tanda: "minat", bobot: 2 },
  dp: { v: 0.3, a: 0.3, tanda: "minat", bobot: 3 },
  booking: { v: 0.25, a: 0.3, tanda: "minat", bobot: 2 },
  ready: { v: 0.15, a: 0.25, tanda: "minat", bobot: 2 },
  stok: { v: 0.1, a: 0.2, tanda: "minat", bobot: 1 },
  ongkir: { v: 0.1, a: 0.2, tanda: "minat", bobot: 2 },
  invoice: { v: 0.2, a: 0.25, tanda: "minat", bobot: 2 },
  nota: { v: 0.2, a: 0.25, tanda: "minat", bobot: 2 },
  qris: { v: 0.25, a: 0.25, tanda: "minat", bobot: 3 },
  tf: { v: 0.25, a: 0.25, tanda: "minat", bobot: 2 },

  // ragu
  mahal: { v: -0.5, a: 0.3, d: -0.2, tanda: "ragu" },
  diskon: { v: -0.15, a: 0.25, d: -0.1, tanda: "ragu" },
  nego: { v: -0.2, a: 0.3, d: -0.1, tanda: "ragu" },
  duh: { v: -0.35, a: 0.3, d: -0.25, tanda: "ragu" },
  waduh: { v: -0.4, a: 0.35, d: -0.25, tanda: "ragu" },
  aduh: { v: -0.4, a: 0.35, d: -0.25, tanda: "ragu" },
  hm: { v: -0.2, a: -0.15, d: -0.15, tanda: "ragu" },
  ragu: { v: -0.35, a: 0.15, d: -0.3, tanda: "ragu" },
  bingung: { v: -0.35, a: 0.3, d: -0.35, tanda: "ragu" },

  // desak
  woy: { v: -0.5, a: 0.7, d: 0.45, tanda: "desak" },
  woi: { v: -0.5, a: 0.7, d: 0.45, tanda: "desak" },
  halo: { v: 0, a: 0.1 },
  min: { v: -0.05, a: 0.2 },

  // komplain
  kecewa: { v: -0.7, a: 0.4, d: 0.1, tanda: "komplain" },
  komplain: { v: -0.6, a: 0.5, d: 0.3, tanda: "komplain" },
  refund: { v: -0.7, a: 0.5, d: 0.35, tanda: "komplain" },
  retur: { v: -0.5, a: 0.4, d: 0.2, tanda: "komplain" },
  rusak: { v: -0.65, a: 0.45, d: 0.15, tanda: "komplain" },
  cacat: { v: -0.65, a: 0.45, d: 0.15, tanda: "komplain" },
  bocor: { v: -0.6, a: 0.45, d: 0.1, tanda: "komplain" },
  sobek: { v: -0.6, a: 0.45, d: 0.1, tanda: "komplain" },
  penyok: { v: -0.55, a: 0.4, d: 0.1, tanda: "komplain" },
  telat: { v: -0.55, a: 0.45, d: 0.2, tanda: "komplain" },
  molor: { v: -0.55, a: 0.45, d: 0.2, tanda: "komplain" },
  zonk: { v: -0.6, a: 0.45, d: 0.15, tanda: "komplain" },

  // keras
  penipu: { v: -0.85, a: 0.7, d: 0.55, tanda: "keras" },
  nipu: { v: -0.85, a: 0.7, d: 0.55, tanda: "keras" },
  menipu: { v: -0.85, a: 0.7, d: 0.55, tanda: "keras" },
  scam: { v: -0.85, a: 0.7, d: 0.55, tanda: "keras" },
  somasi: { v: -0.9, a: 0.7, d: 0.6, tanda: "keras" },
  bangsat: { v: -0.9, a: 0.85, d: 0.6, tanda: "keras" },
  bajingan: { v: -0.9, a: 0.85, d: 0.6, tanda: "keras" },
  goblok: { v: -0.85, a: 0.8, d: 0.55, tanda: "keras" },
  tolol: { v: -0.85, a: 0.8, d: 0.55, tanda: "keras" },
  bego: { v: -0.8, a: 0.75, d: 0.5, tanda: "keras" },
  kampret: { v: -0.7, a: 0.7, d: 0.45, tanda: "keras" },
  brengsek: { v: -0.85, a: 0.8, d: 0.55, tanda: "keras" },
  sialan: { v: -0.8, a: 0.75, d: 0.5, tanda: "keras" },
  asu: { v: -0.85, a: 0.8, d: 0.55, tanda: "keras" },
  jancok: { v: -0.85, a: 0.85, d: 0.55, tanda: "keras" },

  // hangat
  makasih: { v: 0.5, a: 0.05, d: 0.1, tanda: "hangat" },
  thanks: { v: 0.5, a: 0.05, d: 0.1, tanda: "hangat" },
  thx: { v: 0.45, a: 0.05, d: 0.1, tanda: "hangat" },
  tengkyu: { v: 0.5, a: 0.1, d: 0.1, tanda: "hangat" },
  mantap: { v: 0.6, a: 0.35, d: 0.2, tanda: "hangat" },
  mantul: { v: 0.6, a: 0.35, d: 0.2, tanda: "hangat" },
  keren: { v: 0.55, a: 0.35, d: 0.2, tanda: "hangat" },
  bagus: { v: 0.5, a: 0.2, d: 0.15, tanda: "hangat" },
  puas: { v: 0.65, a: 0.25, d: 0.2, tanda: "hangat" },
  rekomen: { v: 0.65, a: 0.3, d: 0.2, tanda: "hangat" },
  recommended: { v: 0.65, a: 0.3, d: 0.2, tanda: "hangat" },
  amin: { v: 0.5, a: 0.1, d: 0.05, tanda: "hangat" },
  cocok: { v: 0.5, a: 0.2, d: 0.15, tanda: "hangat" },
  suka: { v: 0.55, a: 0.25, d: 0.15, tanda: "hangat" },

  // umum
  marah: { v: -0.6, a: 0.6, d: 0.4 },
  kesal: { v: -0.55, a: 0.55, d: 0.3 },
  kesel: { v: -0.55, a: 0.55, d: 0.3 },
  sedih: { v: -0.6, a: -0.1, d: -0.35 },
  capek: { v: -0.4, a: -0.15, d: -0.25 },
  maaf: { v: -0.05, a: 0.05, d: -0.15 },
};

/**
 * Umpatan yang di Indonesia sering cuma seruan, bukan kemarahan.
 *
 * "anjir keren banget" itu pujian. Memasukkannya ke daftar `keras` berarti
 * pelanggan yang sedang senang dilempar ke manusia sebagai ancaman, dan
 * pemilik tokonya kehilangan kepercayaan pada seluruh fitur ini dalam sehari.
 * Jadi yang diambil cuma gairahnya, valensinya nol.
 */
export const SERUAN = new Set([
  "anjir", "anjay", "anjrit", "njir", "buset", "busett", "gila", "gilak",
  "astaga", "ya ampun", "waw", "wow", "widih", "wih", "hah", "loh", "lah",
]);

export const PENGUAT = new Set([
  "banget", "bgt", "bngt", "bet", "sangat", "amat", "parah", "poll", "pol",
  "sekali", "bener", "beneran", "super", "kelewat", "terlalu", "kebangetan",
]);

/**
 * Negasi. Membalik valensi isyarat 1–2 kata SESUDAHNYA.
 *
 * "belum" ikut, dan itu bukan negasi biasa: "belum sampai" dan "belum dibalas"
 * sudah punya frasanya sendiri, jadi yang tersisa di sini bentuk seperti "belum
 * cocok". "jangan" tidak ikut membalik — "jangan lama lama" itu desakan, bukan
 * kebalikan dari "lama".
 */
export const NEGASI = new Set([
  "tidak", "tak", "gak", "ga", "nggak", "enggak", "engga", "kga", "kaga",
  "bukan", "gk", "blm", "belum", "kurang",
]);

/** Pesan yang isinya cuma ini = tanda terima, bukan minat dan bukan hangat. */
export const TANDA_TERIMA = new Set([
  "ok", "oke", "okee", "okey", "okay", "y", "ya", "iya", "iy", "sip", "siap",
  "noted", "nice", "hm", "hmm", "he", "hehe", "wkwk", "wkwkwk", "ok sip",
  "baik", "yoi", "yup", "yes", "yaa", "nggih", "inggih",
]);

/**
 * Emoji. Di WhatsApp Indonesia ini sering satu-satunya nada yang dikirim, dan
 * daftar kata yang mengabaikannya kehilangan sinyal paling jelas di layar.
 *
 * 🙏 sengaja positif: di sini artinya terima kasih atau memohon, bukan sedih.
 * 🙄 dan 😑 sengaja negatif berkuasa: itu sindiran, dan sindiran hampir selalu
 * mendahului pelanggan yang pergi diam-diam.
 */
export const EMOJI: Record<string, Isyarat> = {
  "😊": { v: 0.5, a: 0.15, tanda: "hangat" },
  "😁": { v: 0.6, a: 0.4, tanda: "hangat" },
  "😄": { v: 0.6, a: 0.4, tanda: "hangat" },
  "😃": { v: 0.6, a: 0.4, tanda: "hangat" },
  "🥰": { v: 0.75, a: 0.3, tanda: "hangat" },
  "😍": { v: 0.75, a: 0.45, tanda: "hangat" },
  "❤": { v: 0.7, a: 0.25, tanda: "hangat" },
  "👍": { v: 0.45, a: 0.15, tanda: "hangat" },
  "🙏": { v: 0.45, a: 0.1, tanda: "hangat" },
  "🔥": { v: 0.55, a: 0.5 },
  "💯": { v: 0.6, a: 0.4, tanda: "hangat" },
  "🤩": { v: 0.7, a: 0.6, tanda: "hangat" },
  "😆": { v: 0.55, a: 0.45 },
  "😅": { v: 0.05, a: 0.3, d: -0.25 },
  "🤔": { v: -0.15, a: 0.15, d: -0.15, tanda: "ragu" },
  "😐": { v: -0.35, a: -0.2, d: -0.05, tanda: "batal" },
  "😑": { v: -0.5, a: -0.15, d: 0.15, tanda: "batal" },
  "🙄": { v: -0.55, a: 0.25, d: 0.3, tanda: "batal" },
  "😞": { v: -0.6, a: -0.1, d: -0.35, tanda: "komplain" },
  "😔": { v: -0.55, a: -0.15, d: -0.35, tanda: "komplain" },
  "😢": { v: -0.65, a: 0.1, d: -0.4, tanda: "komplain" },
  "😭": { v: -0.7, a: 0.4, d: -0.4, tanda: "komplain" },
  "🥺": { v: -0.3, a: 0.15, d: -0.5 },
  "😤": { v: -0.6, a: 0.6, d: 0.4, tanda: "desak" },
  "😠": { v: -0.75, a: 0.7, d: 0.5, tanda: "keras" },
  "😡": { v: -0.85, a: 0.8, d: 0.55, tanda: "keras" },
  "🤬": { v: -0.9, a: 0.85, d: 0.6, tanda: "keras" },
  "💢": { v: -0.7, a: 0.7, d: 0.45, tanda: "desak" },
  "👎": { v: -0.6, a: 0.4, d: 0.3, tanda: "komplain" },
};

/** Frasa terpanjang dulu — lihat catatan di [FRASA]. */
export const FRASA_URUT: [string, Isyarat][] = Object.entries(FRASA).sort(
  (a, b) => b[0].length - a[0].length,
);
