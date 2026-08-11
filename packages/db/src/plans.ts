/**
 * Definisi paket harga.
 *
 * Patokan biaya: Meta TIDAK menagih service conversation (chat yang dimulai
 * customer, dalam window 24 jam). Jalur QR/Baileys juga nol biaya per pesan.
 * Jadi COGS per balasan praktis = token LLM saja, sekitar Rp 15-40 pakai
 * Gemini Flash + RAG. Cekat.AI menjual Rp 1.499.000 / 15.000 balasan
 * (sekitar Rp 100 per balasan), jadi ruang margin kita lebar.
 *
 * ATURAN: fitur yang ditulis di sini harus benar-benar sudah jalan di aplikasi.
 * Jangan menambah baris untuk fitur yang masih rencana.
 */

export type PlanId = "free" | "starter" | "growth" | "pro";

/**
 * Kemampuan yang dikunci per paket.
 *
 * Sebelum ini tidak ada satu pun fitur yang benar-benar terkunci. Yang dibatasi
 * cuma jumlah nomor, asisten, dan catatan. Akibatnya halaman harga menjanjikan
 * pembagian yang tidak pernah ditegakkan: pengguna gratis tetap dapat semuanya.
 * Itu bocor pendapatan sekaligus janji yang tidak benar.
 *
 * Daftar di sini adalah SATU-SATUNYA sumber kebenaran. Jangan menulis
 * `plan.id === "growth"` di tempat lain, karena begitu ada paket baru,
 * pengecekan yang tersebar itu pasti ada yang terlewat.
 */
export type Fitur =
  /** Membaca foto dan pesan suara yang dikirim pelanggan. */
  | "bacaMedia"
  /** Mengirim foto produk dari galeri ke pelanggan. */
  | "kirimMedia"
  /** Menyapa duluan: yang menghilang, yang sudah beli, dan ajakan beli lagi. */
  | "sapaOtomatis"
  /** Jadwal jam kerja tim. */
  | "jamKerja";

/**
 * Membaca foto dan voice note ikut paket gratis, dan itu keputusan sadar.
 *
 * Dulu dia mulai dari Starter, dengan alasan token gambar dan suara jauh lebih
 * mahal daripada teks. Itu benar secara perbandingan dan menyesatkan secara
 * angka: di Flash-Lite satu foto sekitar Rp 5 dan voice note setengah menit
 * sekitar Rp 3,5, sementara 51 balasan gratis sudah menghabiskan sekitar
 * Rp 816. Yang dihemat dengan menguncinya kira-kira Rp 150 sebulan per akun.
 *
 * Yang dibayar untuk penghematan itu jauh lebih mahal. Paket gratis itu
 * etalase, dan fitur yang boleh dicabut dari etalase cuma yang ketidakhadirannya
 * tidak bikin produknya kelihatan rusak. Baca lampiran gagal di ujian itu:
 * terukur dua kali di akun sungguhan, pesan PERTAMA seorang pelanggan berupa
 * foto, dan asistennya menjawab "pesanmu kosong". Orang yang menyimpulkan
 * asisten ini bego di hari pertama tidak akan pernah sampai ke halaman harga.
 *
 * Yang membatasi pemakaian tetap jatah balasannya. Satu balasan cuma membawa
 * SATU lampiran (lihat `gabungTertunda` di worker), jadi 51 balasan berarti
 * paling banyak 51 lampiran sebulan, tanpa perlu penghitung kedua di layar.
 * Yang menjaga sisi biayanya batas durasi per pesan, dua menit, berlaku untuk
 * semua paket.
 *
 * `kirimMedia` SENGAJA tetap berbayar. Mengirim foto produk itu yang menjual,
 * bukan yang bikin asisten kelihatan waras.
 */
const FITUR_GRATIS: Fitur[] = ["bacaMedia"];
const FITUR_STARTER: Fitur[] = [...FITUR_GRATIS, "kirimMedia"];
const FITUR_GROWTH: Fitur[] = [...FITUR_STARTER, "sapaOtomatis", "jamKerja"];

const FITUR_PAKET: Record<PlanId, readonly Fitur[]> = {
  free: FITUR_GRATIS,
  starter: FITUR_STARTER,
  growth: FITUR_GROWTH,
  pro: FITUR_GROWTH,
};

/** Nama fitur untuk ditampilkan ke pengguna. */
export const NAMA_FITUR: Record<Fitur, string> = {
  bacaMedia: "Membaca foto dan pesan suara",
  kirimMedia: "Mengirim foto produk",
  sapaOtomatis: "Sapaan otomatis",
  jamKerja: "Jam kerja tim",
};

/** Semua fitur yang boleh dipakai sebuah paket. */
export function fiturPaket(planId: string): Fitur[] {
  const id = (planId as PlanId) in PLANS ? (planId as PlanId) : "free";
  return [...FITUR_PAKET[id]];
}

/** Nama paket termurah untuk tiap fitur, siap dikirim ke komponen tampilan. */
export function paketMinimalTiapFitur(): Record<Fitur, string> {
  const keluar = {} as Record<Fitur, string>;
  for (const f of Object.keys(NAMA_FITUR) as Fitur[]) {
    keluar[f] = paketMinimal(f).name;
  }
  return keluar;
}

export function bolehPakai(planId: string, fitur: Fitur): boolean {
  return FITUR_PAKET[(planId as PlanId) in PLANS ? (planId as PlanId) : "free"].includes(
    fitur,
  );
}

/** Paket termurah yang sudah punya fitur ini. Dipakai untuk kalimat ajakan naik paket. */
export function paketMinimal(fitur: Fitur): Plan {
  return (
    SEMUA_PAKET.find((p) => FITUR_PAKET[p.id].includes(fitur)) ?? PLANS.pro
  );
}

/** Kalimat siap pakai waktu sesuatu tertahan paket. */
export function pesanTerkunci(fitur: Fitur, planSekarang: string): string {
  const perlu = paketMinimal(fitur);
  return (
    `${NAMA_FITUR[fitur]} belum termasuk di paket ${getPlan(planSekarang).name}. ` +
    `Ada mulai paket ${perlu.name}.`
  );
}

/**
 * Jatah balasan paket gratis.
 *
 * Ditarik keluar jadi tetapan sendiri karena angkanya muncul di enam tempat:
 * kartu paket, halaman jualan, halaman pengembalian dana, info bisnis akun
 * bantuan, dan kabar penurunan paket dari worker. Dulu diketik ulang di
 * masing-masing, dan itu jenis kesalahan yang paling sulit ketahuan: begitu
 * satu diubah, layar yang lain tetap menjanjikan angka lama, dan yang membaca
 * tidak punya cara tahu mana yang benar.
 *
 * Diturunkan dari 100 ke 51 pada 8 Agustus 2026. Segini cukup untuk sekitar
 * selusin obrolan sungguhan, jadi dia betul-betul alat MENCOBA, bukan alat
 * dipakai. Itu memang yang diinginkan: paket gratis yang cukup untuk menjalankan
 * toko kecil tidak akan pernah jadi pelanggan berbayar.
 */
export const BALASAN_GRATIS = 51;

export interface Plan {
  id: PlanId;
  name: string;
  pricePerMonth: number;
  aiCredits: number;
  maxChannels: number;
  maxAgents: number;
  maxKnowledgeSources: number;
  features: string[];
  highlight?: boolean;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Coba Gratis",
    pricePerMonth: 0,
    // Sengaja bukan sepersekian hari, supaya pemilik toko sempat melihat
    // asistennya menjawab pelanggan asli, tapi juga tidak cukup untuk
    // menjalankan toko dari sini. Angkanya di [BALASAN_GRATIS].
    aiCredits: BALASAN_GRATIS,
    maxChannels: 1,
    maxAgents: 1,
    maxKnowledgeSources: 10,
    // Daftar ini sengaja menyebut CRM, janji temu, dan ringkasan AI, karena
    // paket gratis MEMANG mendapat ketiganya. Tidak ada satu pun kunci paket
    // untuk mereka di kode.
    //
    // Dulu tiga baris itu tidak disebut di sini dan "Data pelanggan tersimpan
    // rapi" cuma muncul di Starter, jadi halaman harganya terbaca seolah CRM
    // baru ada kalau bayar. Itu bohong ke arah sebaliknya, dan bahayanya sama:
    // orang yang mencoba gratis lalu menemukan CRM-nya jalan akan bertanya apa
    // lagi yang ditulis tidak benar di halaman ini.
    features: [
      // Diturunkan dari tetapannya, JANGAN diketik ulang. Kartu paket dan
      // jatah yang benar-benar ditegakkan wajib menyebut angka yang sama.
      `${BALASAN_GRATIS} balasan per bulan`,
      "1 nomor WhatsApp",
      "Isi harga, layanan, dan aturan usahamu",
      // Batas dua menitnya ikut disebut, bukan disembunyikan.
      //
      // Ini fitur yang paling sering kepakai di pesan PERTAMA pelanggan, dan
      // batas yang tidak diumumkan lebih menjengkelkan daripada batas yang
      // kecil. Angkanya diturunkan dari MAKS_DETIK_MEDIA di worker; kalau
      // batasnya diubah, kalimat ini wajib ikut.
      "Asisten membaca foto dan mendengar voice note sampai 2 menit",
      "Kotak masuk, bisa kamu ambil alih kapan saja",
      "Data pelanggan, janji temu, dan ringkasan AI terisi sendiri",
      // Batasnya disebut di SEMUA kartu, termasuk yang gratis.
      //
      // Dulu cuma Starter dan Growth yang menyebutnya, jadi paket gratis punya
      // dinding yang tidak pernah diberitahukan: orang menulis catatan
      // kesebelas, menekan simpan, lalu baru tahu ada batas 10. Batas yang
      // tidak diumumkan lebih menjengkelkan daripada batas yang kecil, karena
      // yang hilang bukan cuma fiturnya tapi pekerjaan yang sudah diketik.
      "Info bisnis sampai 10 catatan",
      "Tanpa kartu kredit, tanpa batas waktu",
    ],
  },
  starter: {
    id: "starter",
    name: "Starter",
    pricePerMonth: 199_000,
    aiCredits: 3_000,
    maxChannels: 1,
    maxAgents: 1,
    maxKnowledgeSources: 20,
    // Memakai pola "Semua yang ada di ..." seperti Growth dan Pro, bukan
    // mengulang isi paket gratis satu per satu. Mengulangnya bikin dua kartu
    // bersebelahan terlihat mirip, dan yang membaca jadi tidak menemukan apa
    // sebenarnya yang dia bayar.
    features: [
      "Semua yang ada di Coba Gratis",
      "3.000 balasan per bulan",
      // Bukan cuma foto. Galeri menerima JPG, PNG, WebP, MP4, dan PDF, dan
      // worker mengirim PDF sebagai dokumen WhatsApp, bukan gambar. Menulis
      // "foto produk" saja bikin orang mengira daftar harga PDF dan katalognya
      // tidak bisa dikirim, padahal bisa.
      "Asisten bisa mengirim sendiri foto, video, dan berkas PDF",
      "Info bisnis sampai 20 catatan",
    ],
  },
  growth: {
    id: "growth",
    name: "Growth",
    pricePerMonth: 499_000,
    aiCredits: 15_000,
    maxChannels: 3,
    maxAgents: 5,
    maxKnowledgeSources: 200,
    highlight: true,
    features: [
      "3 nomor WhatsApp",
      "15.000 balasan per bulan",
      "Semua yang ada di Starter",
      "Tiap nomor bisa punya asisten sendiri",
      // Satu kalimat untuk satu kemampuan yang sama di kode (fitur
      // "sapaOtomatis"), supaya tidak ada janji yang tidak ada penegaknya.
      "Sapa duluan: yang menghilang, yang sudah beli, dan pengingat sebelum janji temu",
      "Atur jam kerja tim",
      "Info bisnis sampai 200 catatan",
      // "Laporan percakapan" dibuang dari sini pada 1 Agustus 2026. Fiturnya
      // memang tidak pernah ada, jadi itu janji kosong di halaman harga.
      // Jangan menambahkannya lagi sebelum halamannya benar-benar jadi.
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    pricePerMonth: 999_000,
    /**
     * Diturunkan dari 60.000 ke 30.000 pada 8 Agustus 2026.
     *
     * Bukan untuk pelit. Dengan 60.000, Pro memberi EMPAT kali jatah Growth
     * untuk DUA kali harganya, jadi harga per balasannya Rp 17 sementara Growth
     * Rp 33. Akibatnya paket termahal justru yang margin per balasannya paling
     * tipis, dan itu kebalikan dari yang seharusnya: kalau biaya AI naik, Pro
     * yang rugi paling dulu dan paling dalam.
     *
     * Dengan 30.000, harga per balasannya jadi Rp 33, sama dengan Growth, dan
     * pembalikannya hilang. Pro tetap dijual pada kemampuannya (10 nomor, 20
     * asisten, 1.000 catatan, dilayani duluan), bukan pada satuan yang lebih
     * murah. Itu cara yang benar menjual paket teratas.
     *
     * Yang dipotong jatah, BUKAN harga dinaikkan. Rp 199.000 lawan Rp 1.499.000
     * milik Cekat.AI itu satu-satunya pembeda Palwise; menaikkan harga memakan
     * pembeda itu, memotong jatah tidak menyentuhnya sama sekali. Dan 30.000
     * balasan sebulan itu masih 1.000 sehari, jauh di atas pemakaian yang masuk
     * akal untuk sepuluh nomor.
     *
     * Dikerjakan sekarang KARENA belum ada pelanggan berbayar. Memotong jatah
     * hari ini tidak menyakiti siapa pun; memotongnya setelah ada tiga puluh
     * pelanggan berarti mengumumkan penurunan ke orang yang sudah membayar.
     */
    aiCredits: 30_000,
    maxChannels: 10,
    maxAgents: 20,
    maxKnowledgeSources: 1000,
    features: [
      "10 nomor WhatsApp",
      // Diturunkan dari angkanya, JANGAN diketik ulang. Kartu harga dan jatah
      // yang benar-benar ditegakkan wajib menyebut angka yang sama.
      "30.000 balasan per bulan",
      "Semua yang ada di Growth",
      // Pro TIDAK tanpa batas, dan angkanya harus disebut sendiri.
      //
      // Tanpa baris ini, "Semua yang ada di Growth" membuat pembacanya
      // menyimpulkan Pro juga 200 catatan, padahal 1.000. Kartu termahal yang
      // terlihat sama saja dengan yang di bawahnya itu kehilangan alasan untuk
      // dibeli, dan sekaligus bikin orang mengira "tanpa batas" padahal bukan.
      "Info bisnis sampai 1.000 catatan",
      "Kami bantu pasang dan siapkan dari awal",
      "Kendala kamu dilayani duluan",
    ],
  },
};

/** Paket berbayar saja, untuk halaman harga. */
export const PLAN_LIST: Plan[] = [PLANS.starter, PLANS.growth, PLANS.pro];

/** Termasuk paket gratis, untuk halaman ganti paket di dalam aplikasi. */
export const SEMUA_PAKET: Plan[] = [
  PLANS.free,
  PLANS.starter,
  PLANS.growth,
  PLANS.pro,
];

export function getPlan(id: string): Plan {
  return PLANS[id as PlanId] ?? PLANS.free;
}

/** Jatah harian khusus ruang coba, terpisah dari kuota balasan pelanggan. */
export const JATAH_RUANG_COBA_HARIAN = 30;

export function formatIDR(value: number): string {
  return "Rp " + value.toLocaleString("id-ID");
}

/** Harga rata-rata per balasan, dipakai di halaman perbandingan. */
export function pricePerReply(plan: Plan): number {
  return Math.round(plan.pricePerMonth / plan.aiCredits);
}

/** Apa yang berubah kalau sebuah workspace pindah paket. */
export interface AkibatPindahPaket {
  turun: boolean;
  /** Nomor WhatsApp yang akan dimatikan karena lewat jatah. */
  nomorDimatikan: number;
  /** Asisten yang lewat batas. Tetap ada, cuma tidak bisa ditambah lagi. */
  asistenLewatBatas: number;
  /** Catatan info bisnis yang lewat batas. */
  catatanLewatBatas: number;
  /** Fitur yang dipunya paket sekarang tapi tidak ada di paket tujuan. */
  fiturHilang: Fitur[];
  /** Jatah balasan yang menyusut. Null kalau tidak menyusut. */
  balasanMenyusut: { dari: number; ke: number } | null;
  /** Ada sesuatu yang benar-benar hilang, jadi layak dikonfirmasi dulu. */
  perluDikonfirmasi: boolean;
}

/**
 * Hitung apa yang hilang sebelum orangnya menekan tombol pindah paket.
 *
 * Ada karena tombol "Pindah ke Coba Gratis" dulu langsung berlaku dalam satu
 * klik tanpa memberi tahu apa pun. Yang paling merugikan bukan fiturnya
 * berkurang, tapi caranya berkurang: nomor kedua dan ketiga berhenti melayani
 * pelanggan tanpa satu pun pemberitahuan, dan pemiliknya baru sadar setelah
 * ada yang mengeluh chatnya tidak dibalas.
 *
 * Fungsi murni, jadi kalimat yang dipajang di layar dan tindakan yang benar
 * benar dikerjakan sesudah tombolnya ditekan dihitung dari sumber yang sama.
 * Kalau nanti ada batas baru, tambahkan di sini supaya dia otomatis ikut
 * diumumkan, bukan cuma ditegakkan diam-diam.
 *
 * Nomor yang dipertahankan adalah yang TERLAMA, sama dengan aturan di
 * `dalamJatahPaket` milik worker. Dua tempat itu harus sepakat, kalau tidak
 * layar menjanjikan nomor A yang mati padahal yang mati nomor B.
 */
export function akibatPindahPaket(
  dariId: string,
  keId: string,
  pakai: { nomor: number; asisten: number; catatan: number },
): AkibatPindahPaket {
  const dari = getPlan(dariId);
  const ke = getPlan(keId);

  const nomorDimatikan = Math.max(0, pakai.nomor - ke.maxChannels);
  const asistenLewatBatas = Math.max(0, pakai.asisten - ke.maxAgents);
  const catatanLewatBatas = Math.max(0, pakai.catatan - ke.maxKnowledgeSources);

  const fiturTujuan = new Set(fiturPaket(ke.id));
  const fiturHilang = fiturPaket(dari.id).filter((f) => !fiturTujuan.has(f));

  const balasanMenyusut =
    ke.aiCredits < dari.aiCredits
      ? { dari: dari.aiCredits, ke: ke.aiCredits }
      : null;

  return {
    turun: ke.pricePerMonth < dari.pricePerMonth,
    nomorDimatikan,
    asistenLewatBatas,
    catatanLewatBatas,
    fiturHilang,
    balasanMenyusut,
    perluDikonfirmasi:
      nomorDimatikan > 0 ||
      asistenLewatBatas > 0 ||
      catatanLewatBatas > 0 ||
      fiturHilang.length > 0 ||
      balasanMenyusut !== null,
  };
}

/** Akibat pindah paket sebagai kalimat siap pajang. */
export function kalimatAkibat(akibat: AkibatPindahPaket): string[] {
  const baris: string[] = [];

  if (akibat.nomorDimatikan > 0) {
    baris.push(
      `${akibat.nomorDimatikan} nomor WhatsApp langsung berhenti melayani pelanggan. Yang dipertahankan nomor yang paling lama dipasang.`,
    );
  }
  if (akibat.balasanMenyusut) {
    baris.push(
      `Jatah balasan turun dari ${akibat.balasanMenyusut.dari.toLocaleString("id-ID")} jadi ${akibat.balasanMenyusut.ke.toLocaleString("id-ID")} per bulan.`,
    );
  }
  for (const f of akibat.fiturHilang) {
    baris.push(`${NAMA_FITUR[f]} berhenti jalan.`);
  }
  if (akibat.catatanLewatBatas > 0) {
    baris.push(
      `Catatan info bisnismu ${akibat.catatanLewatBatas} lebih banyak dari jatah paket baru. Yang sudah ada tetap dipakai, tapi kamu tidak bisa menambah sampai jumlahnya turun.`,
    );
  }
  if (akibat.asistenLewatBatas > 0) {
    baris.push(
      `Asistenmu ${akibat.asistenLewatBatas} lebih banyak dari jatah paket baru. Yang sudah ada tetap jalan, tapi kamu tidak bisa menambah lagi.`,
    );
  }

  return baris;
}
