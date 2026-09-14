import type { Metadata } from "next";
import type { NamaIkon } from "@/components/Ikon";

/**
 * Isi halaman jualan: satu versi umum di "/", dan satu versi per bidang usaha
 * di alamat pendek seperti "/klinik" atau "/dealer".
 *
 * KERANGKANYA SATU, ISINYA BANYAK. Halaman jualan yang menyebut "cocok untuk
 * semua usaha" tidak memanggil siapa pun, tapi memecah kodenya jadi sembilan
 * halaman berarti sembilan tempat yang harus diingat tiap kali ada perbaikan.
 * Jadi susunan, harga, jaminan, dan tanya jawab umumnya ada sekali di
 * `HalamanJualan.tsx`, dan yang berbeda per bidang cuma yang ada di sini:
 * judul, contoh chat, hitungan, contoh Palwise AI, gambar-gambar produk, dan
 * pertanyaan khas bidangnya.
 *
 * Tiga aturan yang berlaku untuk tiap baris di berkas ini:
 *
 * 1. TIDAK ADA ANGKA KARANGAN SOAL ORANG LAIN. Harga, nama, dan percakapan di
 *    contoh adalah ilustrasi dan ditandai begitu. Tidak ada jumlah pelanggan,
 *    testimoni, atau hasil penjualan.
 * 2. TIDAK MENJANJIKAN YANG TIDAK DIKERJAKAN. Contoh chat wajib patuh pada
 *    BATASAN preset bidangnya: klinik tidak memberi saran medis, dealer tidak
 *    menghitung cicilan resmi, jadwal selalu "dicatat lalu dipastikan tim".
 *    Telepon suara BELUM ada di produk, jadi tidak disebut di mana pun.
 * 3. NAMA PAKET TIDAK DIKETIK. Fitur berbayar disebut "paket yang memuatnya
 *    ada di kartu harga", karena nama paket di sini tidak ikut berubah waktu
 *    fiturnya dipindah paket.
 */

export type PesanContoh = {
  dari: "pelanggan" | "asisten";
  teks: string;
  jam: string;
  foto?: { src: string; alt: string };
};

export type ChatContoh = {
  nama: string;
  pesan: PesanContoh[];
  /** Pemisah "1 pesan belum dibaca" muncul tepat sebelum pesan ke berapa. */
  belumDibaca: number;
  catatan: string;
};

export type ContohTanyaItem = {
  label: string;
  ikon: NamaIkon;
  tanya: string;
  jawab: string;
  pelanggan?: string[];
  draf?: { untuk: string; teks: string };
  angka?: string[];
  petunjuk: string;
};

export type IstilahHitung = {
  /** "tokomu", "klinikmu", dipakai di kalimat "pakai angka tokomu". */
  usaha: string;
  /** Yang lepas: "order", "kunjungan", "unit". */
  satuan: string;
  jadi: string;
  nilai: string;
  nilaiAwal: number;
  nilaiMaks: number;
  langkahNilai: number;
  jadiAwal: number;
};

export type SumberInfo = { judul: string; asal: string; potongan: number; siap: boolean };
export type JanjiContoh = { nama: string; untuk: string; kapan: string; pasti: boolean };
export type SapaContoh = {
  judul: string;
  baris: { hari: string; teks: string; kirim: boolean }[];
  catatan: string;
};
export type RasaContoh = { pesan: string; santai: string; nunggu: string };

export interface IsiJualan {
  /** "umum" untuk halaman depan, selain itu sama dengan alamatnya. */
  id: string;
  /** Preset asisten yang dipakai bidang ini. Null untuk halaman umum. */
  presetId: string | null;
  nama: string;
  /** Label pilihan contoh chat di halaman depan: "Klinik", "Hotel & villa". */
  namaPendek: string;
  ikon: NamaIkon;
  meta: { judul: string; ringkas: string };
  hero: { lencana: string; judul: string; judulAbu: string; sub: string };
  chat: ChatContoh;
  hitung: IstilahHitung;
  tanyaAi: ContohTanyaItem[];
  sorotanJudul: string;
  sorotan: { info: string; janjiTab: string; janji: string; sapaTab: string; sapa: string };
  rasa: RasaContoh;
  info: SumberInfo[];
  janji: JanjiContoh[];
  sapa: SapaContoh;
  langkahInfo: { body: string; pendek: string };
  /** Pertanyaan khas bidangnya, ditaruh di atas tanya jawab umum. */
  tanyaJawab: { t: string; j: string }[];
  penutup: string;
}

const DARI_AI_LAIN: SumberInfo = {
  judul: "Dari ChatGPT",
  asal: "Dipindahkan dari AI lain",
  potongan: 0,
  siap: false,
};

const PETUNJUK_DRAF = "Baca drafnya, minta revisi, lalu kirim setelah kamu setujui.";
const PETUNJUK_CEK = "Temukan yang perlu perhatian dari percakapan yang tercatat.";
const PETUNJUK_ANGKA = "Tanya kondisi usahamu dengan bahasa sehari-hari, dari data yang tercatat.";

export const JUALAN_UMUM: IsiJualan = {
  id: "umum",
  presetId: null,
  nama: "Semua usaha",
  namaPendek: "Toko",
  ikon: "chat",
  meta: {
    judul: "Palwise — Layani lebih banyak. Urus bisnis lebih tenang.",
    ringkas: "AI untuk membalas WhatsApp pelanggan, merapikan percakapan, dan membantu pemilik bisnis mengambil langkah berikutnya. Mulai gratis, tanpa kartu kredit.",
  },
  hero: {
    lencana: "Rekan kerja AI untuk bisnismu",
    judul: "Layani lebih banyak.",
    judulAbu: "Urus bisnis lebih tenang.",
    sub: "AI yang membantu membalas WhatsApp pelanggan, merapikan percakapan, dan menyiapkan langkah berikutnya. Semua dalam satu ruang kerja. Kendali tetap di tanganmu.",
  },
  chat: {
    nama: "Bu Ratna",
    belumDibaca: 4,
    catatan:
      "Percakapan ini terjadi jam setengah dua belas malam, waktu tokonya sudah tutup dan pemiliknya sudah tidur.",
    pesan: [
      { dari: "pelanggan", teks: "Halo kak, arabika gayo masih ada?", jam: "23.41" },
      {
        dari: "asisten",
        teks: "Halo kak! 👋 Masih ada. Arabika Gayo 200gr Rp 85.000, rasanya floral dan agak citrus. Cocok buat V60 atau tubruk.",
        jam: "23.41",
      },
      { dari: "pelanggan", teks: "Kalau kirim ke Bandung ongkirnya berapa ya", jam: "23.42" },
      {
        dari: "asisten",
        teks: "Kami kirimnya dari Bandung kak, jadi buat area Bandung bisa COD. Kalau belanjanya di atas Rp 300.000 gratis ongkir.",
        jam: "23.42",
      },
      {
        dari: "pelanggan",
        teks: "Kalau yang ini namanya apa",
        jam: "23.43",
        foto: { src: "/arabika-toraja.jpg", alt: "Biji kopi arabika Toraja yang dikirim pelanggan" },
      },
      {
        dari: "asisten",
        teks: "Itu Arabika Toraja kak, Rp 92.000 per 200gr. Rasanya lebih ke cokelat dan rempah. Mau saya catat pesanannya?",
        jam: "23.43",
      },
    ],
  },
  hitung: {
    usaha: "usahamu",
    satuan: "order",
    jadi: "Dari yang dibales cepat, yang jadi beli",
    nilai: "Rata-rata sekali belanja",
    nilaiAwal: 150_000,
    nilaiMaks: 2_000_000,
    langkahNilai: 10_000,
    jadiAwal: 10,
  },
  tanyaAi: [
    {
      label: "Cek pelanggan",
      ikon: "pelanggan",
      tanya: "Siapa yang perlu aku balas?",
      jawab: "Maya menunggu kepastian ukuran. Raka ingin tahu jadwal pengiriman.",
      pelanggan: ["Maya · Tanya ukuran 39", "Raka · Menunggu jadwal kirim"],
      petunjuk: PETUNJUK_CEK,
    },
    {
      label: "Siapkan draf",
      ikon: "kirim",
      tanya: "Bantu follow up Maya, yang santai aja.",
      jawab: "Maya terakhir menanyakan sepatu ukuran 39. Ini drafnya:",
      draf: {
        untuk: "Maya",
        teks: "Halo Maya, masih mau lanjut cari sepatu ukuran 39? Kalau ada yang ingin ditanyakan dulu, kabari ya 🙂",
      },
      petunjuk: PETUNJUK_DRAF,
    },
    {
      label: "Kabar bisnis",
      ikon: "ringkasan",
      tanya: "Berapa pelanggan yang chat hari ini?",
      jawab: "Ada 8 pelanggan yang chat hari ini di data Palwise.",
      angka: ["8 pelanggan", "3 baru pertama chat"],
      petunjuk: "Tanya kondisi bisnis dengan bahasa sehari-hari, dari data yang tersedia.",
    },
  ],
  sorotanJudul: "Bukan cuma bales. Dia ngurusin jualannya.",
  sorotan: {
    info: "Harga, stok, dan jadwal cuma dari yang kamu isi. Yang dia nggak tahu, dilempar ke kamu.",
    janjiTab: "Janji temu kecatat",
    janji: "Jam yang disepakati di chat langsung masuk daftar. Kamu tinggal mastiin.",
    sapaTab: "Pembeli lama balik",
    sapa: "Disapa lagi pas kira-kira kopinya udah abis atau mobilnya waktunya servis.",
  },
  rasa: {
    pesan: "Halo kak, kopi arabika gayo masih ada?",
    santai: "Halo kak! 👋 Masih ada ya, yang 200gr Rp 85.000. Mau sekalian saya bantu hitung ongkirnya?",
    nunggu: "Maaf ya kak, 22 menit tanpa kabar itu kelamaan. Arabika Gayo 200gr masih ada, Rp 85.000.",
  },
  info: [
    { judul: "Katalog & harga", asal: "Ditempel manual", potongan: 14, siap: true },
    { judul: "Halaman produk tokomu", asal: "Dibaca dari website", potongan: 26, siap: true },
    { judul: "Aturan retur & ongkir", asal: "Ditempel manual", potongan: 6, siap: true },
    DARI_AI_LAIN,
  ],
  // Sengaja tiga bidang berbeda dalam satu gambar: klinik, properti, dan
  // meeting online. Satu contoh saja bikin bidang lain merasa gambar ini bukan
  // tentang mereka, padahal mesinnya sama persis.
  janji: [
    { nama: "Bu Ratna", untuk: "kontrol gigi dengan dokter Rina", kapan: "Hari ini jam 14.00", pasti: true },
    { nama: "Pak Anwar", untuk: "survei unit tipe 36", kapan: "Besok jam 09.30", pasti: true },
    { nama: "Pak Arif", untuk: "meeting online lewat Google Meet", kapan: "Sabtu jam 10.00", pasti: false },
  ],
  sapa: {
    judul: "Tanya kabar & ajak beli lagi",
    baris: [
      { hari: "Hari ke-0", teks: "Pesanan selesai, paket dikirim", kirim: false },
      { hari: "Hari ke-3", teks: "“Paketnya sudah sampai kak? Kopinya cocok?”", kirim: true },
      { hari: "Hari ke-30", teks: "“Kira-kira kopinya sudah habis ya kak? Mau saya siapkan lagi?”", kirim: true },
    ],
    catatan: "Dua jalur terpisah. Yang satu memastikan pelanggan puas, yang satu membawanya belanja lagi.",
  },
  langkahInfo: {
    body: "Ceritakan bisnismu ke Palwise AI. Periksa cara bicara dan info yang dia susun, lalu simpan. Daftar harga atau alamat website juga bisa jadi sumber informasi.",
    pendek: "Ceritakan bisnismu ke Palwise AI, periksa hasilnya, lalu simpan.",
  },
  tanyaJawab: [],
  penutup: "Chat yang masuk malam ini, biar dia yang jawab",
};

const KLINIK: IsiJualan = {
  id: "klinik",
  presetId: "klinik",
  nama: "Klinik & kecantikan",
  namaPendek: "Klinik",
  ikon: "klinik",
  meta: {
    judul: "Palwise untuk klinik: asisten WhatsApp yang bales pasien 24 jam",
    ringkas:
      "Pertanyaan tarif perawatan dan jadwal di WhatsApp dibales dalam hitungan detik, pakai info klinikmu sendiri. Permintaan jadwal tercatat untuk dipastikan tim, tanpa saran medis. Mulai gratis.",
  },
  hero: {
    lencana: "Resepsionis WhatsApp untuk klinik",
    judul: "Ada yang tanya harga perawatan lewat WhatsApp jam 10 malam.",
    judulAbu: "Besok paginya, dia udah booking di klinik lain.",
    sub: "Palwise pakai AI buat bales tiap chat WhatsApp klinikmu dalam hitungan detik, pakai tarif dan jadwal praktik yang kamu isi. Permintaan jadwal tercatat rapi, tim kamu tinggal mastiin.",
  },
  chat: {
    nama: "Kak Nadia",
    belumDibaca: 4,
    catatan: "Ilustrasi chat klinik. Tarif dan jadwalnya contoh. Asisten tidak memberi saran medis.",
    pesan: [
      { dari: "pelanggan", teks: "Kak, facial acne berapa ya? Jerawat saya lagi banyak", jam: "22.07" },
      {
        dari: "asisten",
        teks: "Halo kak! Facial Acne Rp 250.000, sekitar 60 menit. Kondisi jerawatnya nanti diperiksa langsung sama dokter ya kak, biar perawatannya pas.",
        jam: "22.07",
      },
      { dari: "pelanggan", teks: "Bisa hari Sabtu?", jam: "22.08" },
      {
        dari: "asisten",
        teks: "Hari Sabtu klinik buka jam 09.00 sampai 15.00 kak. Mau jam berapa? Saya catat dulu, nanti tim kami mengabari kepastiannya.",
        jam: "22.08",
      },
      { dari: "pelanggan", teks: "Jam 10 pagi ya kak, atas nama Nadia", jam: "22.09" },
      {
        dari: "asisten",
        teks: "Siap kak Nadia, permintaan Facial Acne hari Sabtu jam 10.00 sudah saya catat. Tim kami mengabari setelah jadwalnya dipastikan ya.",
        jam: "22.09",
      },
    ],
  },
  hitung: {
    usaha: "klinikmu",
    satuan: "kunjungan",
    jadi: "Dari yang dibales cepat, yang jadi datang",
    nilai: "Rata-rata sekali perawatan",
    nilaiAwal: 350_000,
    nilaiMaks: 5_000_000,
    langkahNilai: 25_000,
    jadiAwal: 15,
  },
  tanyaAi: [
    {
      label: "Cek pasien",
      ikon: "pelanggan",
      tanya: "Siapa yang perlu aku balas?",
      jawab: "Nadia menunggu kepastian jadwal Sabtu jam 10. Pak Hendra bercerita soal keluhan setelah perawatan, ini perlu kamu yang jawab.",
      pelanggan: ["Nadia · Facial Acne, Sabtu 10.00", "Pak Hendra · Keluhan setelah perawatan"],
      petunjuk: PETUNJUK_CEK,
    },
    {
      label: "Siapkan draf",
      ikon: "kirim",
      tanya: "Bantu kabari Nadia, jadwalnya aman.",
      jawab: "Nadia minta Facial Acne hari Sabtu jam 10.00. Ini drafnya:",
      draf: {
        untuk: "Nadia",
        teks: "Halo kak Nadia, jadwal Facial Acne hari Sabtu jam 10.00 sudah kami pastikan ya. Mohon datang 10 menit lebih awal untuk pendaftaran. Sampai ketemu 🙂",
      },
      petunjuk: PETUNJUK_DRAF,
    },
    {
      label: "Kabar klinik",
      ikon: "ringkasan",
      tanya: "Minggu ini ada berapa janji?",
      jawab: "Ada 11 janji temu minggu ini, 3 masih belum kamu pastikan.",
      angka: ["11 janji temu", "3 belum dipastikan"],
      petunjuk: PETUNJUK_ANGKA,
    },
  ],
  sorotanJudul: "Bukan cuma bales. Dia jagain jadwal pasienmu.",
  sorotan: {
    info: "Tarif dan jadwal praktik cuma dari yang kamu isi. Soal kondisi tubuh, dilempar ke tim.",
    janjiTab: "Jadwal pasien kecatat",
    janji: "Jam yang diminta di chat langsung masuk daftar. Tim kamu tinggal mastiin.",
    sapaTab: "Pasien balik kontrol",
    sapa: "Ditanya kabarnya setelah perawatan, lalu diingetin pas kira-kira waktunya kontrol.",
  },
  rasa: {
    pesan: "Kak, facial acne berapa?",
    santai: "Halo kak! Facial Acne Rp 250.000, sekitar 60 menit. Mau sekalian saya catat jadwalnya?",
    nunggu: "Maaf sudah menunggu kak. Facial Acne Rp 250.000, sekitar 60 menit.",
  },
  info: [
    { judul: "Daftar perawatan & tarif", asal: "Ditempel manual", potongan: 18, siap: true },
    { judul: "Jadwal praktik dokter", asal: "Ditempel manual", potongan: 7, siap: true },
    { judul: "Halaman layanan klinik", asal: "Dibaca dari website", potongan: 24, siap: true },
    DARI_AI_LAIN,
  ],
  janji: [
    { nama: "Bu Ratna", untuk: "kontrol gigi dengan dokter Rina", kapan: "Hari ini jam 14.00", pasti: true },
    { nama: "Pak Hendra", untuk: "konsultasi perawatan lanjutan", kapan: "Besok jam 16.30", pasti: true },
    { nama: "Kak Nadia", untuk: "Facial Acne", kapan: "Sabtu jam 10.00", pasti: false },
  ],
  sapa: {
    judul: "Tanya kabar & ajak kontrol",
    baris: [
      { hari: "Hari ke-0", teks: "Perawatan selesai", kirim: false },
      { hari: "Hari ke-2", teks: "“Gimana kulitnya setelah facial kemarin kak? Ada yang mau ditanyakan?”", kirim: true },
      { hari: "Hari ke-30", teks: "“Kak, sudah sebulan sejak perawatan terakhir. Mau saya catat jadwal lanjutannya?”", kirim: true },
    ],
    catatan: "Tanpa saran medis. Kalau ada keluhan, dia minta maaf dan langsung meneruskannya ke tim.",
  },
  langkahInfo: {
    body: "Tulis daftar perawatan, tarif, dan jadwal praktik. Tambah aturan daftar dan batal, lalu periksa cara dia bicara ke pasien.",
    pendek: "Tulis perawatan, tarif, dan jadwal praktik, lalu periksa hasilnya.",
  },
  tanyaJawab: [
    {
      t: "Dia bisa kasih saran medis?",
      j: "Nggak, dan itu sengaja. Pertanyaan soal kondisi tubuh, obat, atau hasil pemeriksaan selalu dijawab perlu dicek langsung sama tenaga ahlinya, lalu diteruskan ke tim kamu. Yang dia jawab cuma layanan, tarif, jadwal, dan cara daftar.",
    },
    {
      t: "Bisa langsung booking slot dokter?",
      j: "Belum. Palwise nggak tersambung ke kalender atau sistem klinikmu. Dia mencatat hari dan jam yang diminta pasien, lalu tim kamu yang memastikan. Yang belum dipastikan ditandai, bukan dianggap beres.",
    },
    {
      t: "Pasien bisa diingetin sebelum jadwalnya?",
      j: "Bisa. Jadwal yang sudah kamu pastikan bisa diingatkan otomatis sebelum harinya. Paket yang memuat pengingat ini tertulis di kartu harga di bawah.",
    },
  ],
  penutup: "Pasien yang chat malam ini, biar dia yang jawab",
};

const DEALER: IsiJualan = {
  id: "dealer",
  presetId: "otomotif",
  nama: "Dealer & bengkel",
  namaPendek: "Dealer",
  ikon: "mobil",
  meta: {
    judul: "Palwise untuk dealer & bengkel: sales WhatsApp yang bales chat 24 jam",
    ringkas:
      "Pertanyaan harga, DP, promo, dan jadwal servis di WhatsApp dibales dalam hitungan detik, pakai info dealermu sendiri. Permintaan test drive dan servis tercatat untuk sales dan bengkelmu. Mulai gratis.",
  },
  hero: {
    lencana: "Sales WhatsApp untuk dealer & bengkel",
    judul: "Ada yang tanya DP mobil lewat WhatsApp pas sales lagi libur.",
    judulAbu: "Senin pagi, dia udah SPK di dealer sebelah.",
    sub: "Palwise pakai AI buat bales tiap chat WhatsApp dealer dan bengkelmu dalam hitungan detik, pakai harga, promo, dan jadwal servis yang kamu isi. Yang minta test drive atau servis tercatat, sales kamu tinggal lanjut.",
  },
  chat: {
    nama: "Pak Bayu",
    belumDibaca: 4,
    catatan:
      "Ilustrasi chat dealer. Harga, promo, dan DP-nya contoh. Cicilan dan persetujuan leasing tetap dari sales.",
    pesan: [
      { dari: "pelanggan", teks: "Sore kak, tipe E matic harga OTR Bandung berapa?", jam: "16.20" },
      {
        dari: "asisten",
        teks: "Selamat sore Pak! Tipe E CVT harga OTR Bandung Rp 198.500.000. Bulan ini ada potongan Rp 5.000.000 untuk pembelian kredit.",
        jam: "16.20",
      },
      { dari: "pelanggan", teks: "DP paling rendah berapa ya?", jam: "16.21" },
      {
        dari: "asisten",
        teks: "DP mulai Rp 20.000.000 lewat leasing rekanan kami, Pak. Angka cicilan dan persetujuannya nanti dihitung resmi sama sales ya, biar pasti.",
        jam: "16.21",
      },
      { dari: "pelanggan", teks: "Bisa test drive hari Minggu?", jam: "16.23" },
      {
        dari: "asisten",
        teks: "Bisa Pak. Mau jam berapa? Saya catat dulu permintaannya, nanti sales kami menghubungi Bapak untuk memastikan jadwalnya.",
        jam: "16.23",
      },
    ],
  },
  hitung: {
    usaha: "dealermu",
    satuan: "transaksi",
    jadi: "Dari yang dibales cepat, yang jadi datang atau SPK",
    nilai: "Rata-rata untung per transaksi",
    nilaiAwal: 1_500_000,
    nilaiMaks: 30_000_000,
    langkahNilai: 250_000,
    jadiAwal: 5,
  },
  tanyaAi: [
    {
      label: "Cek calon pembeli",
      ikon: "pelanggan",
      tanya: "Siapa yang perlu aku balas?",
      jawab: "Pak Bayu minta test drive hari Minggu. Bu Wulan nanya estimasi biaya ganti kampas rem, ini perlu dicek mekanik.",
      pelanggan: ["Pak Bayu · Test drive tipe E, Minggu", "Bu Wulan · Estimasi ganti kampas rem"],
      petunjuk: PETUNJUK_CEK,
    },
    {
      label: "Siapkan draf",
      ikon: "kirim",
      tanya: "Bantu kabari Pak Bayu, test drive Minggu jam 10 bisa.",
      jawab: "Pak Bayu minta test drive tipe E CVT hari Minggu. Ini drafnya:",
      draf: {
        untuk: "Pak Bayu",
        teks: "Selamat pagi Pak Bayu, test drive tipe E CVT hari Minggu jam 10.00 sudah kami siapkan ya. Mohon bawa SIM A. Sampai ketemu di showroom 🙂",
      },
      petunjuk: PETUNJUK_DRAF,
    },
    {
      label: "Kabar showroom",
      ikon: "ringkasan",
      tanya: "Minggu ini berapa yang minta test drive?",
      jawab: "Ada 6 permintaan test drive minggu ini, 2 belum kamu pastikan.",
      angka: ["6 test drive", "2 belum dipastikan"],
      petunjuk: PETUNJUK_ANGKA,
    },
  ],
  sorotanJudul: "Bukan cuma bales. Dia jagain calon pembeli sampai showroom.",
  sorotan: {
    info: "Harga, promo, dan skema DP cuma dari yang kamu isi. Cicilan resmi dilempar ke sales.",
    janjiTab: "Test drive & servis kecatat",
    janji: "Hari dan jam yang diminta di chat langsung masuk daftar. Sales atau bengkel tinggal mastiin.",
    sapaTab: "Pelanggan balik servis",
    sapa: "Ditanya kabar setelah servis, lalu disapa lagi pas kira-kira waktunya servis berkala.",
  },
  rasa: {
    pesan: "Kak, DP paling rendah berapa?",
    santai: "Selamat sore Pak! DP mulai Rp 20.000.000 lewat leasing rekanan. Mau sekalian saya catat untuk test drive?",
    nunggu: "Maaf menunggu lama Pak. DP mulai Rp 20.000.000, cicilan resminya dihitung sales.",
  },
  info: [
    { judul: "Harga OTR & promo bulan ini", asal: "Ditempel manual", potongan: 16, siap: true },
    { judul: "Paket servis berkala", asal: "Diambil dari berkas PDF", potongan: 12, siap: true },
    { judul: "Skema DP leasing rekanan", asal: "Ditempel manual", potongan: 5, siap: true },
    DARI_AI_LAIN,
  ],
  janji: [
    { nama: "Bu Wulan", untuk: "servis berkala 20.000 km", kapan: "Hari ini jam 13.00", pasti: true },
    { nama: "Pak Dimas", untuk: "ambil unit dan serah terima", kapan: "Besok jam 15.00", pasti: true },
    { nama: "Pak Bayu", untuk: "test drive tipe E CVT", kapan: "Minggu jam 10.00", pasti: false },
  ],
  sapa: {
    judul: "Tanya kabar & ajak servis lagi",
    baris: [
      { hari: "Hari ke-0", teks: "Servis berkala selesai", kirim: false },
      { hari: "Hari ke-3", teks: "“Gimana mobilnya setelah servis kemarin Pak? Ada yang terasa beda?”", kirim: true },
      { hari: "Bulan ke-6", teks: "“Pak, sudah sekitar 6 bulan sejak servis terakhir. Mau saya catat jadwal servis berikutnya?”", kirim: true },
    ],
    catatan: "Palwise tidak tersambung ke sistem bengkel. Waktunya diperkirakan dari servis yang tercatat di chat.",
  },
  langkahInfo: {
    body: "Tulis harga OTR, promo, skema DP, dan paket servis. Tentukan kapan chat dilempar ke sales, lalu periksa cara dia bicara.",
    pendek: "Tulis harga, promo, skema DP, dan paket servis, lalu periksa hasilnya.",
  },
  tanyaJawab: [
    {
      t: "Dia bisa hitung cicilan dan jamin leasing disetujui?",
      j: "Nggak. Dia cuma menyebut skema DP dan promo yang kamu tulis. Simulasi cicilan resmi, persetujuan leasing, dan nego harga selalu dilempar ke sales kamu.",
    },
    {
      t: "Satu dealer punya banyak sales, bisa?",
      j: "Satu akun bisa pegang beberapa nomor, dan tiap nomor boleh punya sales sendiri. Begitu sales ikut ngetik di sebuah chat, asistennya langsung diam di chat itu.",
    },
    {
      t: "Bisa ingetin pelanggan servis berkala?",
      j: "Bisa lewat ajakan balik: pelanggan yang pernah servis disapa lagi pas kira-kira waktunya. Palwise tidak tersambung ke sistem bengkelmu, jadi patokannya servis yang tercatat di chat. Paket yang memuatnya tertulis di kartu harga.",
    },
  ],
  penutup: "Yang nanya DP malam ini, biar dia yang jawab",
};

const PROPERTI: IsiJualan = {
  id: "properti",
  presetId: "properti",
  nama: "Properti",
  namaPendek: "Properti",
  ikon: "properti",
  meta: {
    judul: "Palwise untuk properti: sales WhatsApp yang bales calon pembeli 24 jam",
    ringkas:
      "Pertanyaan tipe unit, harga, dan lokasi di WhatsApp dibales dalam hitungan detik, pakai info proyekmu sendiri. Yang serius diarahkan ke jadwal survei. Mulai gratis.",
  },
  hero: {
    lencana: "Sales WhatsApp untuk properti",
    judul: "Calon pembeli tanya unit lewat WhatsApp jam 9 malam.",
    judulAbu: "Minggu depannya, dia udah survei di proyek sebelah.",
    sub: "Palwise pakai AI buat bales tiap chat WhatsApp dari iklanmu dalam hitungan detik, pakai harga, tipe unit, dan lokasi yang kamu isi. Yang serius diarahkan ke jadwal survei, sales kamu tinggal ketemu.",
  },
  chat: {
    nama: "Pak Rizal",
    belumDibaca: 4,
    catatan: "Ilustrasi chat properti. Harga dan lokasinya contoh. KPR dan bunga tetap dihitung tim.",
    pesan: [
      { dari: "pelanggan", teks: "Kak, yang tipe 36/72 masih ada?", jam: "21.32" },
      {
        dari: "asisten",
        teks: "Selamat malam Pak! Tipe 36/72 masih ada, harga mulai Rp 489.000.000. Lokasinya 10 menit dari pintu tol. Rumahnya untuk ditinggali atau investasi Pak?",
        jam: "21.32",
      },
      { dari: "pelanggan", teks: "Ditinggali. Bisa KPR?", jam: "21.34" },
      {
        dari: "asisten",
        teks: "Bisa Pak, lewat bank rekanan kami. Bunga dan persetujuan KPR nanti dihitung langsung sama tim kami ya, biar angkanya pasti.",
        jam: "21.34",
      },
      { dari: "pelanggan", teks: "Sabtu bisa lihat rumah contohnya?", jam: "21.35" },
      {
        dari: "asisten",
        teks: "Bisa Pak, rumah contoh buka Sabtu 09.00 sampai 16.00. Mau jam berapa? Saya catat dulu, nanti tim kami menghubungi Bapak untuk memastikan.",
        jam: "21.35",
      },
    ],
  },
  hitung: {
    usaha: "proyekmu",
    satuan: "unit",
    jadi: "Dari yang dibales cepat, yang jadi survei lalu beli",
    nilai: "Rata-rata komisi atau untung per unit",
    nilaiAwal: 10_000_000,
    nilaiMaks: 200_000_000,
    langkahNilai: 1_000_000,
    jadiAwal: 2,
  },
  tanyaAi: [
    {
      label: "Cek calon pembeli",
      ikon: "pelanggan",
      tanya: "Siapa yang perlu aku balas?",
      jawab: "Pak Rizal minta survei hari Sabtu. Bu Tika minta simulasi KPR, ini perlu kamu yang hitung.",
      pelanggan: ["Pak Rizal · Survei tipe 36/72, Sabtu", "Bu Tika · Minta simulasi KPR"],
      petunjuk: PETUNJUK_CEK,
    },
    {
      label: "Siapkan draf",
      ikon: "kirim",
      tanya: "Bantu kabari Pak Rizal, survei Sabtu jam 10 bisa.",
      jawab: "Pak Rizal mau lihat rumah contoh tipe 36/72 hari Sabtu. Ini drafnya:",
      draf: {
        untuk: "Pak Rizal",
        teks: "Selamat pagi Pak Rizal, kunjungan rumah contoh tipe 36/72 hari Sabtu jam 10.00 sudah kami catat. Nanti saya temani langsung di lokasi ya Pak. Sampai ketemu 🙂",
      },
      petunjuk: PETUNJUK_DRAF,
    },
    {
      label: "Kabar proyek",
      ikon: "ringkasan",
      tanya: "Bulan ini berapa yang minta survei?",
      jawab: "Ada 9 permintaan survei bulan ini, 3 belum kamu pastikan.",
      angka: ["9 permintaan survei", "3 belum dipastikan"],
      petunjuk: PETUNJUK_ANGKA,
    },
  ],
  sorotanJudul: "Bukan cuma bales. Dia bawa calon pembeli sampai survei.",
  sorotan: {
    info: "Tipe unit, harga, dan lokasi cuma dari yang kamu isi. KPR dan nego dilempar ke kamu.",
    janjiTab: "Jadwal survei kecatat",
    janji: "Hari survei yang diminta di chat langsung masuk daftar. Kamu tinggal mastiin.",
    sapaTab: "Yang ragu disapa lagi",
    sapa: "Yang udah survei ditanya kesannya, tanpa didesak buru-buru beli.",
  },
  rasa: {
    pesan: "Kak, tipe 36/72 masih ada?",
    santai: "Selamat malam Pak! Masih ada, mulai Rp 489.000.000. Untuk ditinggali atau investasi?",
    nunggu: "Maaf menunggu Pak. Tipe 36/72 masih ada, mulai Rp 489.000.000.",
  },
  info: [
    { judul: "Daftar tipe unit & harga", asal: "Ditempel manual", potongan: 20, siap: true },
    { judul: "Brosur proyek", asal: "Diambil dari berkas PDF", potongan: 15, siap: true },
    { judul: "Syarat KPR bank rekanan", asal: "Ditempel manual", potongan: 6, siap: true },
    DARI_AI_LAIN,
  ],
  janji: [
    { nama: "Bu Tika", untuk: "konsultasi KPR lewat Google Meet", kapan: "Hari ini jam 19.00", pasti: true },
    { nama: "Pak Anwar", untuk: "survei unit tipe 45", kapan: "Besok jam 09.30", pasti: true },
    { nama: "Pak Rizal", untuk: "survei rumah contoh tipe 36/72", kapan: "Sabtu jam 10.00", pasti: false },
  ],
  sapa: {
    judul: "Tanya kesan setelah survei",
    baris: [
      { hari: "Hari ke-0", teks: "Survei rumah contoh", kirim: false },
      { hari: "Hari ke-2", teks: "“Gimana kesannya setelah lihat rumah contoh kemarin Pak? Ada yang mau ditanyakan?”", kirim: true },
      { hari: "Bulan ke-2", teks: "“Pak, ada unit baru dibuka di cluster yang Bapak suka. Mau saya kirim brosurnya?”", kirim: true },
    ],
    catatan: "Nggak mendesak. Keputusan properti butuh waktu, jadi sapaannya jarang dan sopan.",
  },
  langkahInfo: {
    body: "Tulis tipe unit, harga, lokasi, dan syarat KPR. Unggah brosur, lalu tentukan kapan chat dilempar ke sales.",
    pendek: "Tulis tipe unit, harga, lokasi, dan syarat KPR, lalu periksa hasilnya.",
  },
  tanyaJawab: [
    {
      t: "Leads dari iklan saya banyak yang cuma nanya, gimana?",
      j: "Justru itu yang dia pegang. Tiap chat dijawab dalam hitungan detik, dia nanya kebutuhannya, dan yang serius diarahkan ke jadwal survei. Chat masuk diurutkan dari yang paling perlu kamu pegang.",
    },
    {
      t: "Dia bisa janjiin KPR disetujui?",
      j: "Nggak. Dia dilarang menjanjikan persetujuan KPR, angka bunga, atau ketersediaan unit tertentu tanpa dipastikan tim. Pertanyaan soal itu langsung dilempar ke kamu.",
    },
    {
      t: "Bisa kirim brosur dan denah?",
      j: "Bisa. Unggah brosur, denah, atau foto unit sekali, lalu dia yang kirim pas ada yang minta. Paket yang memuat fitur ini tertulis di kartu harga.",
    },
  ],
  penutup: "Calon pembeli yang chat malam ini, biar dia yang jawab",
};

const KURSUS: IsiJualan = {
  id: "kursus",
  presetId: "kursus",
  nama: "Kursus & pelatihan",
  namaPendek: "Kursus",
  ikon: "kursus",
  meta: {
    judul: "Palwise untuk kursus: sales WhatsApp yang bales calon peserta 24 jam",
    ringkas:
      "Pertanyaan program, biaya, dan jadwal kelas di WhatsApp dibales dalam hitungan detik, pakai info lembagamu sendiri. Permintaan trial tercatat untuk dipastikan tim. Mulai gratis.",
  },
  hero: {
    lencana: "Sales WhatsApp untuk kursus & pelatihan",
    judul: "Orang tua tanya biaya kursus lewat WhatsApp jam 9 malam.",
    judulAbu: "Besoknya, anaknya udah daftar di tempat lain.",
    sub: "Palwise pakai AI buat bales tiap chat WhatsApp lembagamu dalam hitungan detik, pakai program, biaya, dan jadwal yang kamu isi. Permintaan trial tercatat rapi, tim kamu tinggal mastiin.",
  },
  chat: {
    nama: "Kak Maya",
    belumDibaca: 4,
    catatan: "Ilustrasi chat kursus. Nama dan biayanya contoh. Permintaan trial tetap dipastikan tim.",
    pesan: [
      { dari: "pelanggan", teks: "Kak, kursus Inggris buat anak 9 tahun berapa?", jam: "20.41" },
      {
        dari: "asisten",
        teks: "Halo kak! Kelas anak usia 7 sampai 12 tahun Rp 400.000 per bulan, 8 pertemuan. Pendaftaran Rp 100.000 dan modul Rp 75.000 per semester.",
        jam: "20.41",
      },
      { dari: "pelanggan", teks: "Boleh coba dulu sebelum daftar?", jam: "20.42" },
      {
        dari: "asisten",
        teks: "Boleh satu kali trial gratis kak. Ingin mengajukan hari apa? Tim kami cek jadwalnya dulu.",
        jam: "20.42",
      },
      { dari: "pelanggan", teks: "Sabtu pagi bisa? Nama anak saya Dira.", jam: "20.43" },
      {
        dari: "asisten",
        teks: "Permintaan trial Dira hari Sabtu pagi saya catat ya. Tim kami mengabari setelah mengecek jadwal pengajar.",
        jam: "20.43",
      },
    ],
  },
  hitung: {
    usaha: "lembagamu",
    satuan: "pendaftaran",
    jadi: "Dari yang dibales cepat, yang jadi daftar",
    nilai: "Biaya daftar plus bulan pertama",
    nilaiAwal: 500_000,
    nilaiMaks: 5_000_000,
    langkahNilai: 50_000,
    jadiAwal: 10,
  },
  tanyaAi: [
    {
      label: "Cek calon peserta",
      ikon: "pelanggan",
      tanya: "Siapa yang perlu aku balas?",
      jawab: "Maya menunggu kepastian trial. Raka ingin tahu biaya kelas dewasa.",
      pelanggan: ["Maya · Trial Sabtu belum dipastikan", "Raka · Menanyakan biaya kelas dewasa"],
      petunjuk: PETUNJUK_CEK,
    },
    {
      label: "Siapkan draf",
      ikon: "kirim",
      tanya: "Bantu balas Maya, jadwal trial-nya masih aku cek.",
      jawab: "Maya meminta trial Bahasa Inggris anak hari Sabtu. Ini drafnya:",
      draf: {
        untuk: "Maya",
        teks: "Halo Kak Maya, permintaan trial Bahasa Inggris anak hari Sabtu sudah kami catat. Jadwalnya masih kami cek dengan tim pengajar. Kami kabari setelah ada kepastian ya 🙂",
      },
      petunjuk: PETUNJUK_DRAF,
    },
    {
      label: "Kabar pendaftaran",
      ikon: "ringkasan",
      tanya: "Berapa orang yang chat hari ini?",
      jawab: "Ada 8 orang yang chat hari ini, termasuk 3 kontak baru.",
      angka: ["8 orang chat", "3 kontak baru"],
      petunjuk: "Jumlah chat belum berarti jumlah peserta yang mendaftar.",
    },
  ],
  sorotanJudul: "Bukan cuma bales. Dia bawa calon peserta sampai daftar.",
  sorotan: {
    info: "Program, biaya, dan jadwal cuma dari yang kamu isi. Permintaan khusus dilempar ke tim.",
    janjiTab: "Permintaan trial kecatat",
    janji: "Hari trial yang diminta di chat masuk daftar. Tim kamu tinggal mastiin.",
    sapaTab: "Peserta lanjut level",
    sapa: "Ditanya kabar setelah kelas pertama, lalu ditawari program lanjutan pas waktunya.",
  },
  rasa: {
    pesan: "Kak, biaya kelas Inggris anak berapa?",
    santai: "Halo kak! Kelas anak Rp 400.000 per bulan, 8 pertemuan. Pendaftaran Rp 100.000 dan modul Rp 75.000 per semester.",
    nunggu: "Maaf sudah menunggu kak. Kelas anak Rp 400.000 per bulan, pendaftaran Rp 100.000, modul Rp 75.000.",
  },
  info: [
    { judul: "Program & biaya kursus", asal: "Ditempel manual", potongan: 14, siap: true },
    { judul: "Halaman program lembaga", asal: "Dibaca dari website", potongan: 26, siap: true },
    { judul: "Aturan trial & pendaftaran", asal: "Ditempel manual", potongan: 6, siap: true },
    DARI_AI_LAIN,
  ],
  janji: [
    { nama: "Bu Ratna", untuk: "trial kelas Bahasa Inggris anak", kapan: "Hari ini jam 14.00", pasti: true },
    { nama: "Pak Anwar", untuk: "konsultasi program IELTS", kapan: "Besok jam 09.30", pasti: true },
    { nama: "Pak Arif", untuk: "trial kelas dewasa lewat Google Meet", kapan: "Sabtu jam 10.00", pasti: false },
  ],
  sapa: {
    judul: "Tanya kabar & tawarkan lanjutan",
    baris: [
      { hari: "Minggu ke-1", teks: "Kelas pertama selesai", kirim: false },
      { hari: "Hari ke-3", teks: "“Gimana kelas pertamanya kak? Ada yang perlu disesuaikan?”", kirim: true },
      { hari: "Bulan ke-3", teks: "“Kak, periode kelas Dira sebentar lagi selesai. Mau saya kirim info program lanjutannya?”", kirim: true },
    ],
    catatan: "Nggak menilai kemampuan murid dan nggak menjanjikan hasil belajar.",
  },
  langkahInfo: {
    body: "Tulis program, biaya, jumlah pertemuan, jadwal umum, dan aturan trial. Lalu periksa cara dia bicara ke orang tua murid.",
    pendek: "Tulis program, biaya, jadwal, dan aturan trial, lalu periksa hasilnya.",
  },
  tanyaJawab: [
    {
      t: "Bisa langsung memastikan slot trial atau kelas?",
      j: "Belum. Palwise mencatat permintaan jadwal, tapi tidak memeriksa kapasitas kelas atau kalender pengajar. Tim kamu yang memastikan, dan yang belum dipastikan ditandai.",
    },
    {
      t: "Yang chat kebanyakan orang tua, cocok?",
      j: "Cocok. Cara bicaranya bisa diatur sabar dan jelas, tanpa istilah yang rumit. Dia juga dilarang menilai kemampuan murid atau menjanjikan hasil belajar.",
    },
  ],
  penutup: "Orang tua yang chat malam ini, biar dia yang jawab",
};

const SERVIS: IsiJualan = {
  id: "servis",
  presetId: "servis",
  nama: "Jasa & servis",
  namaPendek: "Servis",
  ikon: "servis",
  meta: {
    judul: "Palwise untuk jasa & servis: sales WhatsApp yang bales order 24 jam",
    ringkas:
      "Pertanyaan tarif, area, dan jadwal kunjungan di WhatsApp dibales dalam hitungan detik, pakai info usahamu sendiri. Permintaan jadwal tercatat untuk dipastikan tim. Mulai gratis.",
  },
  hero: {
    lencana: "Sales WhatsApp untuk jasa & servis",
    judul: "AC pelanggan mati, dia chat WhatsApp kamu jam 8 malam.",
    judulAbu: "Nggak dibales, dia langsung panggil tukang sebelah.",
    sub: "Palwise pakai AI buat bales tiap chat WhatsApp usaha servismu dalam hitungan detik, pakai tarif dan area layanan yang kamu isi. Permintaan kunjungan tercatat rapi, tim kamu tinggal atur teknisinya.",
  },
  chat: {
    nama: "Bu Lina",
    belumDibaca: 4,
    catatan: "Ilustrasi chat jasa servis. Tarif dan areanya contoh. Biaya perbaikan tetap dari teknisi.",
    pesan: [
      { dari: "pelanggan", teks: "Mas, AC saya nggak dingin. Cuci AC 1 PK berapa?", jam: "20.12" },
      {
        dari: "asisten",
        teks: "Halo Bu! Cuci AC 0,5 sampai 1 PK Rp 75.000 per unit, sekitar 45 menit. Kalau ternyata perlu isi freon, teknisi kami cek dulu dan kabari biayanya sebelum dikerjakan.",
        jam: "20.12",
      },
      { dari: "pelanggan", teks: "Rumah saya di Cimahi, bisa?", jam: "20.13" },
      {
        dari: "asisten",
        teks: "Bisa Bu, untuk Cimahi ongkos panggilnya Rp 25.000. Mau dijadwalkan hari apa?",
        jam: "20.13",
      },
      { dari: "pelanggan", teks: "Besok pagi bisa?", jam: "20.14" },
      {
        dari: "asisten",
        teks: "Saya catat dulu ya Bu, besok pagi di Cimahi. Tim kami mengabari setelah teknisinya dipastikan kosong.",
        jam: "20.14",
      },
    ],
  },
  hitung: {
    usaha: "usahamu",
    satuan: "order",
    jadi: "Dari yang dibales cepat, yang jadi order",
    nilai: "Rata-rata sekali kunjungan",
    nilaiAwal: 250_000,
    nilaiMaks: 3_000_000,
    langkahNilai: 25_000,
    jadiAwal: 20,
  },
  tanyaAi: [
    {
      label: "Cek order",
      ikon: "pelanggan",
      tanya: "Siapa yang perlu aku balas?",
      jawab: "Bu Lina minta jadwal cuci AC besok pagi di Cimahi. Pak Joko komplain AC-nya bocor lagi setelah dicuci.",
      pelanggan: ["Bu Lina · Cuci AC, besok pagi", "Pak Joko · Komplain, masih garansi"],
      petunjuk: PETUNJUK_CEK,
    },
    {
      label: "Siapkan draf",
      ikon: "kirim",
      tanya: "Bantu kabari Bu Lina, teknisi datang jam 9.",
      jawab: "Bu Lina minta cuci AC 1 PK besok pagi di Cimahi. Ini drafnya:",
      draf: {
        untuk: "Bu Lina",
        teks: "Halo Bu Lina, teknisi kami datang besok jam 09.00 untuk cuci AC 1 PK ya. Ongkos panggil Cimahi Rp 25.000. Mohon area AC-nya dikosongkan dulu 🙏",
      },
      petunjuk: PETUNJUK_DRAF,
    },
    {
      label: "Kabar order",
      ikon: "ringkasan",
      tanya: "Hari ini berapa order masuk?",
      jawab: "Ada 12 permintaan kunjungan hari ini, 4 belum dijadwalkan.",
      angka: ["12 permintaan", "4 belum dijadwalkan"],
      petunjuk: PETUNJUK_ANGKA,
    },
  ],
  sorotanJudul: "Bukan cuma bales. Dia ngumpulin order buat teknisimu.",
  sorotan: {
    info: "Tarif, area, dan garansi cuma dari yang kamu isi. Biaya perbaikan dilempar ke teknisi.",
    janjiTab: "Jadwal kunjungan kecatat",
    janji: "Hari dan jam yang diminta di chat masuk daftar. Kamu tinggal atur teknisinya.",
    sapaTab: "Pelanggan balik servis",
    sapa: "Ditanya hasilnya setelah dikerjakan, lalu diingetin pas kira-kira waktunya servis rutin.",
  },
  rasa: {
    pesan: "Mas, cuci AC 1 PK berapa?",
    santai: "Halo Bu! Cuci AC 1 PK Rp 75.000 per unit, sekitar 45 menit. Mau dijadwalkan hari apa?",
    nunggu: "Maaf lama nunggu Bu. Cuci AC 1 PK Rp 75.000 per unit.",
  },
  info: [
    { judul: "Daftar layanan & tarif", asal: "Ditempel manual", potongan: 14, siap: true },
    { judul: "Area layanan & ongkos panggil", asal: "Ditempel manual", potongan: 5, siap: true },
    { judul: "Aturan garansi", asal: "Ditempel manual", potongan: 4, siap: true },
    DARI_AI_LAIN,
  ],
  janji: [
    { nama: "Pak Joko", untuk: "cek AC bocor, klaim garansi", kapan: "Hari ini jam 13.00", pasti: true },
    { nama: "Bu Sinta", untuk: "cuci 6 unit AC kantor", kapan: "Sabtu jam 08.00", pasti: true },
    { nama: "Bu Lina", untuk: "cuci AC 1 PK di Cimahi", kapan: "Besok jam 09.00", pasti: false },
  ],
  sapa: {
    judul: "Tanya hasil & ajak servis rutin",
    baris: [
      { hari: "Hari ke-0", teks: "Cuci AC selesai", kirim: false },
      { hari: "Hari ke-3", teks: "“AC-nya sudah dingin lagi Bu? Kalau ada kendala, kabari ya.”", kirim: true },
      { hari: "Bulan ke-3", teks: "“Bu, sudah sekitar 3 bulan sejak cuci AC terakhir. Mau saya catat jadwal berikutnya?”", kirim: true },
    ],
    catatan: "Keluhan setelah pengerjaan langsung diteruskan ke tim, bukan dijawab sendiri.",
  },
  langkahInfo: {
    body: "Tulis layanan, tarif, area, dan aturan garansi. Tentukan apa yang harus dicek teknisi dulu, lalu periksa hasilnya.",
    pendek: "Tulis layanan, tarif, area, dan garansi, lalu periksa hasilnya.",
  },
  tanyaJawab: [
    {
      t: "Dia bisa nebak biaya perbaikan?",
      j: "Nggak, dan itu sengaja. Sebelum barangnya dilihat teknisi, dia cuma menyebut biaya kunjungan atau pengecekan yang kamu tulis. Perkiraan biaya perbaikan dilempar ke tim.",
    },
    {
      t: "Bisa ngatur jadwal teknisi?",
      j: "Belum. Dia mencatat hari, jam, dan alamat yang diminta pelanggan. Siapa teknisi yang berangkat tetap kamu yang atur, lalu pelanggannya bisa dikabari lewat chat yang sama.",
    },
  ],
  penutup: "Order yang masuk malam ini, biar dia yang jawab",
};

const KATERING: IsiJualan = {
  id: "katering",
  presetId: "makanan",
  nama: "Katering & makanan",
  namaPendek: "Katering",
  ikon: "kopi",
  meta: {
    judul: "Palwise untuk katering: sales WhatsApp yang bales pesanan 24 jam",
    ringkas:
      "Pertanyaan menu, harga per porsi, dan tanggal acara di WhatsApp dibales dalam hitungan detik, pakai info usahamu sendiri. Pesanan dirinci, tanggalnya dipastikan tim. Mulai gratis.",
  },
  hero: {
    lencana: "Sales WhatsApp untuk katering",
    judul: "Ada yang pesan nasi box lewat WhatsApp jam 10 malam.",
    judulAbu: "Besoknya, dia udah deal sama katering sebelah.",
    sub: "Palwise pakai AI buat bales tiap chat WhatsApp kateringmu dalam hitungan detik, pakai menu, harga per porsi, dan area antar yang kamu isi. Pesanannya dirinci sampai total, tanggalnya tim kamu yang mastiin.",
  },
  chat: {
    nama: "Bu Endah",
    belumDibaca: 4,
    catatan: "Ilustrasi chat katering. Menu dan harganya contoh. Tanggal pesanan tetap dipastikan tim.",
    pesan: [
      { dari: "pelanggan", teks: "Kak, nasi box buat pengajian 100 orang tanggal 21 bisa?", jam: "22.03" },
      {
        dari: "asisten",
        teks: "Halo Bu! Nasi box paket ayam bakar Rp 32.000 per porsi, paket rendang Rp 38.000. Untuk tanggal 21 saya cek dulu ke dapur ya Bu, biar pasti.",
        jam: "22.03",
      },
      { dari: "pelanggan", teks: "Yang ayam bakar aja. Antar ke Depok bisa?", jam: "22.05" },
      {
        dari: "asisten",
        teks: "Bisa Bu, antar ke Depok gratis untuk pesanan di atas 50 porsi.",
        jam: "22.05",
      },
      { dari: "pelanggan", teks: "Oke, jam 11 siang ya", jam: "22.06" },
      {
        dari: "asisten",
        teks: "Saya rinci ya Bu: 100 nasi box ayam bakar, totalnya Rp 3.200.000, antar ke Depok jam 11.00 tanggal 21. Tim kami kabari kepastian tanggalnya setelah dicek dapur.",
        jam: "22.06",
      },
    ],
  },
  hitung: {
    usaha: "kateringmu",
    satuan: "pesanan",
    jadi: "Dari yang dibales cepat, yang jadi pesan",
    nilai: "Rata-rata nilai sekali pesanan",
    nilaiAwal: 1_500_000,
    nilaiMaks: 20_000_000,
    langkahNilai: 100_000,
    jadiAwal: 15,
  },
  tanyaAi: [
    {
      label: "Cek pesanan",
      ikon: "pelanggan",
      tanya: "Siapa yang perlu aku balas?",
      jawab: "Bu Endah nunggu kepastian 100 nasi box tanggal 21. Pak Rudi nanya menu tanpa kacang, ini perlu kamu yang jawab.",
      pelanggan: ["Bu Endah · 100 nasi box, tanggal 21", "Pak Rudi · Menu tanpa kacang"],
      petunjuk: PETUNJUK_CEK,
    },
    {
      label: "Siapkan draf",
      ikon: "kirim",
      tanya: "Bantu kabari Bu Endah, tanggal 21 aman.",
      jawab: "Bu Endah pesan 100 nasi box ayam bakar tanggal 21. Ini drafnya:",
      draf: {
        untuk: "Bu Endah",
        teks: "Halo Bu Endah, pesanan 100 nasi box ayam bakar untuk tanggal 21 jam 11.00 sudah kami pastikan ya. Totalnya Rp 3.200.000. Terima kasih 🙏",
      },
      petunjuk: PETUNJUK_DRAF,
    },
    {
      label: "Kabar dapur",
      ikon: "ringkasan",
      tanya: "Minggu ini ada berapa pesanan?",
      jawab: "Ada 7 pesanan tercatat minggu ini, 2 tanggalnya belum kamu pastikan.",
      angka: ["7 pesanan", "2 belum dipastikan"],
      petunjuk: PETUNJUK_ANGKA,
    },
  ],
  sorotanJudul: "Bukan cuma bales. Dia ngerinci pesanan sampai total.",
  sorotan: {
    info: "Menu, harga per porsi, dan area antar cuma dari yang kamu isi. Soal alergi, dilempar ke kamu.",
    janjiTab: "Tanggal pesanan kecatat",
    janji: "Tanggal dan jam antar yang disepakati di chat masuk daftar. Kamu tinggal mastiin ke dapur.",
    sapaTab: "Pelanggan pesan lagi",
    sapa: "Ditanya rasanya setelah acara, lalu disapa lagi pas kira-kira ada acara berikutnya.",
  },
  rasa: {
    pesan: "Kak, nasi box ayam bakar berapa?",
    santai: "Halo Bu! Paket ayam bakar Rp 32.000 per porsi. Untuk acara tanggal berapa dan berapa porsi?",
    nunggu: "Maaf menunggu Bu. Paket ayam bakar Rp 32.000 per porsi.",
  },
  info: [
    { judul: "Menu & harga per porsi", asal: "Ditempel manual", potongan: 22, siap: true },
    { judul: "Area antar & minimal pesan", asal: "Ditempel manual", potongan: 5, siap: true },
    { judul: "Katalog menu", asal: "Diambil dari berkas PDF", potongan: 9, siap: true },
    DARI_AI_LAIN,
  ],
  janji: [
    { nama: "Pak Rudi", untuk: "tumpeng untuk syukuran kantor", kapan: "Besok jam 10.00", pasti: true },
    { nama: "Mbak Sari", untuk: "tes rasa menu pernikahan", kapan: "Sabtu jam 14.00", pasti: true },
    { nama: "Bu Endah", untuk: "antar 100 nasi box ke Depok", kapan: "Tgl 21 jam 11.00", pasti: false },
  ],
  sapa: {
    judul: "Tanya rasa & ajak pesan lagi",
    baris: [
      { hari: "Hari ke-0", teks: "Pesanan diantar", kirim: false },
      { hari: "Hari ke-1", teks: "“Gimana acaranya kemarin Bu? Makanannya cocok?”", kirim: true },
      { hari: "Bulan ke-2", teks: "“Bu, kalau ada acara lagi bulan ini, mau saya kirim menu terbarunya?”", kirim: true },
    ],
    catatan: "Keluhan soal makanan langsung diteruskan ke tim, bukan dijawab sendiri.",
  },
  langkahInfo: {
    body: "Tulis menu, harga per porsi, minimal pesan, dan area antar. Tentukan kapan tanggal harus dicek ke dapur, lalu periksa hasilnya.",
    pendek: "Tulis menu, harga per porsi, dan area antar, lalu periksa hasilnya.",
  },
  tanyaJawab: [
    {
      t: "Dia bisa langsung terima pesanan untuk tanggal tertentu?",
      j: "Dia mencatat dan merinci pesanannya sampai total, tapi dilarang memastikan tanggal yang belum disetujui tim. Kapasitas dapur tetap kamu yang cek.",
    },
    {
      t: "Kalau pelanggan tanya soal alergi?",
      j: "Dia nggak akan menjamin makanan bebas bahan tertentu kalau itu nggak tertulis di info usahamu. Pertanyaan alergi dan menu khusus langsung dilempar ke kamu.",
    },
  ],
  penutup: "Pesanan yang masuk malam ini, biar dia yang jawab",
};

const TOKO: IsiJualan = {
  id: "toko",
  presetId: "toko",
  nama: "Toko & jualan online",
  namaPendek: "Toko",
  ikon: "fashion",
  meta: {
    judul: "Palwise untuk toko online: sales WhatsApp yang bales chat 24 jam",
    ringkas:
      "Pertanyaan ukuran, stok, dan ongkir di WhatsApp dibales dalam hitungan detik, pakai daftar harga tokomu sendiri. Yang mau pesan langsung dirinci totalnya. Mulai gratis.",
  },
  hero: {
    lencana: "Sales WhatsApp untuk toko online",
    judul: "Ada yang nanya ukuran lewat WhatsApp jam 11 malam.",
    judulAbu: "Besoknya, dia udah checkout di toko sebelah.",
    sub: "Palwise pakai AI buat bales tiap chat WhatsApp tokomu dalam hitungan detik, pakai harga, stok, dan ongkir yang kamu isi. Yang udah mau pesan langsung dirinci totalnya, tanpa nambah admin.",
  },
  chat: {
    nama: "Kak Dinda",
    belumDibaca: 4,
    catatan: "Ilustrasi chat toko. Nama, harga, dan stoknya contoh.",
    pesan: [
      { dari: "pelanggan", teks: "Kak, kemeja linen yang krem ukuran L masih ada?", jam: "23.14" },
      {
        dari: "asisten",
        teks: "Halo kak! Kemeja Linen Krem ukuran L masih ada 3, harganya Rp 189.000. Lingkar dadanya 108 cm ya kak.",
        jam: "23.14",
      },
      { dari: "pelanggan", teks: "Kalau kirim ke Surabaya ongkirnya berapa?", jam: "23.15" },
      {
        dari: "asisten",
        teks: "Ke Surabaya pakai JNE reguler Rp 18.000, sampai 2 sampai 3 hari. Belanja di atas Rp 350.000 gratis ongkir kak.",
        jam: "23.15",
      },
      { dari: "pelanggan", teks: "Ambil 2 ya, L sama M", jam: "23.16" },
      {
        dari: "asisten",
        teks: "Siap kak, ukuran M juga masih ada. Saya rinci ya: 2 Kemeja Linen Krem (L dan M), totalnya Rp 378.000, ongkir gratis. Mau transfer BCA atau QRIS?",
        jam: "23.16",
      },
    ],
  },
  hitung: {
    usaha: "tokomu",
    satuan: "order",
    jadi: "Dari yang dibales cepat, yang jadi beli",
    nilai: "Rata-rata sekali belanja",
    nilaiAwal: 200_000,
    nilaiMaks: 2_000_000,
    langkahNilai: 10_000,
    jadiAwal: 8,
  },
  tanyaAi: [
    {
      label: "Cek pembeli",
      ikon: "pelanggan",
      tanya: "Siapa yang perlu aku balas?",
      jawab: "Dinda nunggu nomor rekening untuk bayar. Yoga nanya bisa COD atau nggak.",
      pelanggan: ["Dinda · Siap bayar 2 kemeja", "Yoga · Tanya COD Bekasi"],
      petunjuk: PETUNJUK_CEK,
    },
    {
      label: "Siapkan draf",
      ikon: "kirim",
      tanya: "Bantu follow up Yoga, santai aja.",
      jawab: "Yoga terakhir nanya COD untuk celana chino. Ini drafnya:",
      draf: {
        untuk: "Yoga",
        teks: "Halo kak Yoga, celana chino yang kemarin masih ada ya. Untuk Bekasi belum bisa COD, tapi ongkirnya cuma Rp 12.000. Mau saya bantu pesankan? 🙂",
      },
      petunjuk: PETUNJUK_DRAF,
    },
    {
      label: "Kabar toko",
      ikon: "ringkasan",
      tanya: "Berapa yang chat hari ini?",
      jawab: "Ada 14 pelanggan yang chat hari ini, 5 di antaranya baru pertama kali.",
      angka: ["14 pelanggan", "5 baru pertama chat"],
      petunjuk: PETUNJUK_ANGKA,
    },
  ],
  sorotanJudul: "Bukan cuma bales. Dia ngurusin jualannya.",
  sorotan: {
    info: "Harga, ukuran, dan stok cuma dari yang kamu isi. Yang nggak ketemu, dilempar ke kamu.",
    janjiTab: "Jadwal ambil kecatat",
    janji: "Yang janjian ambil di toko atau COD langsung masuk daftar. Kamu tinggal mastiin.",
    sapaTab: "Pembeli lama balik",
    sapa: "Ditanya paketnya udah sampai, lalu diajak belanja lagi pas kira-kira waktunya.",
  },
  rasa: {
    pesan: "Kak, kemeja linen L masih ada?",
    santai: "Halo kak! Masih ada 3, harganya Rp 189.000. Mau sekalian saya cek ongkirnya?",
    nunggu: "Maaf ya kak, kelamaan nunggu. Kemeja linen L masih ada, Rp 189.000.",
  },
  info: [
    { judul: "Daftar harga & stok", asal: "Ditempel dari Excel", potongan: 42, siap: true },
    { judul: "Tabel ukuran", asal: "Diambil dari berkas PDF", potongan: 8, siap: true },
    { judul: "Aturan tukar & ongkir", asal: "Ditempel manual", potongan: 6, siap: true },
    DARI_AI_LAIN,
  ],
  janji: [
    { nama: "Bu Sari", untuk: "ambil pesanan di toko", kapan: "Hari ini jam 16.00", pasti: true },
    { nama: "Kak Yoga", untuk: "COD di depan stasiun", kapan: "Besok jam 12.00", pasti: true },
    { nama: "Mbak Rani", untuk: "ambil 20 kemeja pesanan kantor", kapan: "Sabtu jam 10.00", pasti: false },
  ],
  sapa: {
    judul: "Tanya kabar & ajak beli lagi",
    baris: [
      { hari: "Hari ke-0", teks: "Pesanan dikirim", kirim: false },
      { hari: "Hari ke-4", teks: "“Paketnya udah sampai kak? Ukurannya pas?”", kirim: true },
      { hari: "Hari ke-45", teks: "“Kak, kemeja linen warna baru udah datang. Mau saya kirim fotonya?”", kirim: true },
    ],
    catatan: "Dua jalur terpisah. Yang satu memastikan pelanggan puas, yang satu membawanya belanja lagi.",
  },
  langkahInfo: {
    body: "Tempel daftar harga dan stok, bisa langsung dari Excel. Tambah tabel ukuran dan aturan ongkir, lalu periksa hasilnya.",
    pendek: "Tempel daftar harga, stok, dan ongkir, lalu periksa hasilnya.",
  },
  tanyaJawab: [
    {
      t: "Barang saya ratusan, dia bingung nggak?",
      j: "Nggak. Tulis satu baris satu barang, walaupun jadi ratusan baris, dan dia nyari per baris. Barang yang nggak ketemu dijawab \"saya cek dulu ke tim\", bukan dijawab habis.",
    },
    {
      t: "Pelanggan kirim foto barang, dia ngerti?",
      j: "Ngerti. Foto yang dikirim pelanggan dibaca, lalu dicocokkan sama daftar barangmu. Voice note sampai 2 menit juga dibaca, termasuk di paket gratis.",
    },
  ],
  penutup: "Yang nanya stok malam ini, biar dia yang jawab",
};

const SEKOLAH: IsiJualan = {
  id: "sekolah",
  presetId: "sekolah",
  nama: "Sekolah & kampus",
  namaPendek: "Sekolah",
  ikon: "catat",
  meta: {
    judul: "Palwise untuk sekolah: asisten WhatsApp untuk penerimaan murid baru",
    ringkas:
      "Pertanyaan gelombang pendaftaran, syarat, dan biaya di WhatsApp dibales dalam hitungan detik, pakai info sekolahmu sendiri. Orang tua langsung tahu langkah berikutnya. Mulai gratis.",
  },
  hero: {
    lencana: "Asisten WhatsApp untuk penerimaan murid baru",
    judul: "Orang tua tanya biaya pendaftaran lewat WhatsApp jam 9 malam.",
    judulAbu: "Minggu depannya, anaknya udah daftar di sekolah lain.",
    sub: "Palwise pakai AI buat bales tiap chat WhatsApp sekolahmu dalam hitungan detik, pakai syarat, biaya, dan jadwal pendaftaran yang kamu isi. Orang tua langsung tahu langkah berikutnya, tim pendaftaranmu nggak kewalahan.",
  },
  chat: {
    nama: "Bu Ani",
    belumDibaca: 4,
    catatan: "Ilustrasi chat penerimaan murid. Biaya dan jadwalnya contoh. Hasil seleksi tidak pernah dijawab asisten.",
    pesan: [
      { dari: "pelanggan", teks: "Assalamualaikum, pendaftaran SD kelas 1 masih buka?", jam: "21.05" },
      {
        dari: "asisten",
        teks: "Waalaikumsalam Bu! Gelombang 2 pendaftaran SD dibuka sampai 30 November. Syaratnya usia minimal 6 tahun per Juli dan fotokopi akta kelahiran.",
        jam: "21.05",
      },
      { dari: "pelanggan", teks: "Biaya masuknya berapa ya?", jam: "21.07" },
      {
        dari: "asisten",
        teks: "Uang pangkal Rp 8.500.000 dan SPP Rp 750.000 per bulan, Bu. Kalau mau tanya soal cicilan uang pangkal, nanti dijelaskan langsung oleh tim pendaftaran ya.",
        jam: "21.07",
      },
      { dari: "pelanggan", teks: "Bisa lihat sekolahnya dulu?", jam: "21.08" },
      {
        dari: "asisten",
        teks: "Bisa Bu, kunjungan sekolah tiap Sabtu jam 09.00. Mau saya catat untuk Sabtu ini? Nanti tim pendaftaran mengabari.",
        jam: "21.08",
      },
    ],
  },
  hitung: {
    usaha: "sekolahmu",
    satuan: "pendaftar",
    jadi: "Dari yang dibales cepat, yang jadi mendaftar",
    nilai: "Uang pangkal atau biaya masuk",
    nilaiAwal: 5_000_000,
    nilaiMaks: 50_000_000,
    langkahNilai: 500_000,
    jadiAwal: 5,
  },
  tanyaAi: [
    {
      label: "Cek orang tua",
      ikon: "pelanggan",
      tanya: "Siapa yang perlu aku balas?",
      jawab: "Bu Ani mau kunjungan sekolah Sabtu ini. Pak Hadi nanya keringanan biaya, ini perlu tim pendaftaran.",
      pelanggan: ["Bu Ani · Kunjungan sekolah, Sabtu", "Pak Hadi · Tanya keringanan biaya"],
      petunjuk: PETUNJUK_CEK,
    },
    {
      label: "Siapkan draf",
      ikon: "kirim",
      tanya: "Bantu kabari Bu Ani, kunjungan Sabtu bisa.",
      jawab: "Bu Ani mau kunjungan sekolah untuk pendaftaran SD kelas 1. Ini drafnya:",
      draf: {
        untuk: "Bu Ani",
        teks: "Halo Bu Ani, kunjungan sekolah hari Sabtu jam 09.00 sudah kami catat ya. Silakan langsung ke ruang pendaftaran di gedung depan. Sampai bertemu 🙂",
      },
      petunjuk: PETUNJUK_DRAF,
    },
    {
      label: "Kabar pendaftaran",
      ikon: "ringkasan",
      tanya: "Gelombang 2 ini berapa yang tanya?",
      jawab: "Ada 38 orang tua yang chat soal gelombang 2, 12 minta kunjungan sekolah.",
      angka: ["38 orang tua", "12 minta kunjungan"],
      petunjuk: "Jumlah chat belum berarti jumlah murid yang mendaftar.",
    },
  ],
  sorotanJudul: "Bukan cuma bales. Dia bantu orang tua sampai daftar.",
  sorotan: {
    info: "Gelombang, syarat, dan biaya cuma dari yang kamu isi. Hasil seleksi dilempar ke tim.",
    janjiTab: "Kunjungan & tes kecatat",
    janji: "Jadwal kunjungan atau tes masuk yang diminta di chat masuk daftar. Tim kamu tinggal mastiin.",
    sapaTab: "Orang tua dikabari lagi",
    sapa: "Yang sempat tanya dikabari lagi pas gelombang berikutnya dibuka, tanpa didesak.",
  },
  rasa: {
    pesan: "Pendaftaran SD kelas 1 masih buka?",
    santai: "Halo Bu! Gelombang 2 dibuka sampai 30 November. Untuk SD kelas 1 ya Bu?",
    nunggu: "Maaf menunggu Bu. Gelombang 2 pendaftaran SD masih dibuka sampai 30 November.",
  },
  info: [
    { judul: "Gelombang & syarat pendaftaran", asal: "Ditempel manual", potongan: 12, siap: true },
    { judul: "Rincian biaya per jenjang", asal: "Diambil dari berkas PDF", potongan: 10, siap: true },
    { judul: "Halaman pendaftaran sekolah", asal: "Dibaca dari website", potongan: 18, siap: true },
    DARI_AI_LAIN,
  ],
  janji: [
    { nama: "Pak Hadi", untuk: "konsultasi biaya dengan tim pendaftaran", kapan: "Besok jam 10.00", pasti: true },
    { nama: "Bu Rina", untuk: "tes masuk SMP", kapan: "Senin jam 08.00", pasti: true },
    { nama: "Bu Ani", untuk: "kunjungan sekolah, SD kelas 1", kapan: "Sabtu jam 09.00", pasti: false },
  ],
  sapa: {
    judul: "Kabari gelombang berikutnya",
    baris: [
      { hari: "Oktober", teks: "Tanya biaya, belum daftar", kirim: false },
      { hari: "Hari ke-5", teks: "“Bu, masih ada yang mau ditanyakan soal pendaftaran SD?”", kirim: true },
      { hari: "Januari", teks: "“Bu, gelombang 3 pendaftaran sudah dibuka sampai Maret. Mau saya kirim rincian syaratnya?”", kirim: true },
    ],
    catatan: "Nggak pernah menyebut sisa kuota atau menjanjikan diterima.",
  },
  langkahInfo: {
    body: "Tulis gelombang pendaftaran, syarat berkas, biaya per jenjang, dan jadwal tes. Lalu periksa cara dia bicara ke orang tua.",
    pendek: "Tulis gelombang, syarat, biaya, dan jadwal tes, lalu periksa hasilnya.",
  },
  tanyaJawab: [
    {
      t: "Dia bisa jawab hasil seleksi atau sisa kuota?",
      j: "Nggak. Dia dilarang menjanjikan diterima, menyebut sisa kuota, atau memberi tahu hasil seleksi. Pertanyaan itu, juga soal keringanan biaya, langsung dilempar ke tim pendaftaran.",
    },
    {
      t: "Ramainya cuma pas musim pendaftaran, rugi nggak?",
      j: "Langganannya bulanan dan bisa berhenti kapan aja tanpa denda. Kamu bisa pakai paket besar pas musim pendaftaran, lalu turun ke paket kecil atau gratis di luar musim.",
    },
  ],
  penutup: "Orang tua yang chat malam ini, biar dia yang jawab",
};

const HOTEL: IsiJualan = {
  id: "hotel",
  presetId: "penginapan",
  nama: "Hotel, villa & penginapan",
  namaPendek: "Hotel & villa",
  ikon: "hotel",
  meta: {
    judul: "Palwise untuk hotel & villa: sales WhatsApp yang bales tamu 24 jam",
    ringkas:
      "Pertanyaan harga kamar, fasilitas, dan tanggal menginap di WhatsApp dibales dalam hitungan detik, pakai info penginapanmu sendiri. Permintaan pesan kamar tercatat untuk dipastikan resepsionis. Mulai gratis.",
  },
  hero: {
    lencana: "Sales WhatsApp untuk hotel & villa",
    judul: "Tamu tanya harga kamar lewat WhatsApp jam 11 malam.",
    judulAbu: "Nggak dibales, dia booking hotel sebelah lewat aplikasi.",
    sub: "Palwise pakai AI buat bales tiap chat WhatsApp hotel, villa, atau guest house kamu dalam hitungan detik, pakai harga kamar dan aturan menginap yang kamu isi. Permintaan pesan kamar tercatat rapi, resepsionis tinggal mastiin.",
  },
  // Sengaja keluarga dengan anak kecil dan jemput bandara: dua pertanyaan
  // yang hampir selalu ikut di chat penginapan, dan dua-duanya dijawab dari
  // aturan tertulis. Kamar kosongnya TIDAK pernah dipastikan asisten.
  chat: {
    nama: "Pak Andre",
    belumDibaca: 4,
    catatan:
      "Ilustrasi chat villa. Harga dan tanggalnya contoh. Kamar kosong tetap dipastikan tim, karena Palwise tidak tersambung ke sistem reservasi.",
    pesan: [
      { dari: "pelanggan", teks: "Malam kak, tanggal 20 sampai 22 ada kamar buat 2 dewasa 1 anak?", jam: "23.08" },
      {
        dari: "asisten",
        teks: "Selamat malam Pak! Family Room cocok, maksimal 4 orang dan sudah termasuk sarapan. Harganya Rp 1.100.000 per malam.",
        jam: "23.08",
      },
      { dari: "pelanggan", teks: "Anak saya 5 tahun, kena biaya?", jam: "23.09" },
      {
        dari: "asisten",
        teks: "Anak di bawah 6 tahun gratis Pak, kalau tidur bareng orang tua. Kamar kosongnya saya cek dulu ke tim ya.",
        jam: "23.09",
      },
      { dari: "pelanggan", teks: "Oke. Bisa dijemput dari bandara?", jam: "23.11" },
      {
        dari: "asisten",
        teks: "Bisa Pak, Rp 350.000 sekali jalan. Saya rinci ya: Family Room tanggal 20 sampai 22, 2 malam, Rp 2.200.000, plus jemput bandara. Tim kami kabari kepastian kamar dan cara bayarnya.",
        jam: "23.11",
      },
    ],
  },
  hitung: {
    usaha: "penginapanmu",
    satuan: "booking",
    jadi: "Dari yang dibales cepat, yang jadi menginap",
    nilai: "Rata-rata sekali menginap",
    nilaiAwal: 1_200_000,
    nilaiMaks: 30_000_000,
    langkahNilai: 100_000,
    jadiAwal: 10,
  },
  tanyaAi: [
    {
      label: "Cek tamu",
      ikon: "pelanggan",
      tanya: "Siapa yang perlu aku balas?",
      jawab: "Pak Andre menunggu kepastian Family Room tanggal 20 sampai 22. Bu Sinta minta harga 8 kamar untuk acara kantor, ini perlu kamu yang hitung.",
      pelanggan: ["Pak Andre · Family Room, tgl 20-22", "Bu Sinta · 8 kamar untuk acara kantor"],
      petunjuk: PETUNJUK_CEK,
    },
    {
      label: "Siapkan draf",
      ikon: "kirim",
      tanya: "Bantu kabari Pak Andre, kamarnya aman.",
      jawab: "Pak Andre minta Family Room tanggal 20 sampai 22 plus jemput bandara. Ini drafnya:",
      draf: {
        untuk: "Pak Andre",
        teks: "Selamat pagi Pak Andre, Family Room untuk tanggal 20 sampai 22 sudah kami siapkan ya. Totalnya Rp 2.550.000 termasuk jemput bandara. Rincian DP-nya kami kirim setelah ini 🙏",
      },
      petunjuk: PETUNJUK_DRAF,
    },
    {
      label: "Kabar penginapan",
      ikon: "ringkasan",
      tanya: "Minggu depan berapa yang minta kamar?",
      jawab: "Ada 14 permintaan kamar untuk minggu depan, 5 belum kamu pastikan.",
      angka: ["14 permintaan kamar", "5 belum dipastikan"],
      petunjuk: PETUNJUK_ANGKA,
    },
  ],
  sorotanJudul: "Bukan cuma bales. Dia jagain tamu sampai check-in.",
  sorotan: {
    info: "Harga kamar, fasilitas, dan aturan menginap cuma dari yang kamu isi. Kamar kosong dipastikan tim.",
    janjiTab: "Tanggal menginap kecatat",
    janji: "Tanggal check-in yang diminta di chat langsung masuk daftar. Resepsionis tinggal mastiin.",
    sapaTab: "Tamu balik menginap",
    sapa: "Ditanya kesannya setelah check-out, lalu disapa lagi pas musim liburan berikutnya.",
  },
  rasa: {
    pesan: "Kak, Family Room tanggal 20 masih ada?",
    santai: "Selamat malam kak! Family Room Rp 1.100.000 per malam, sudah termasuk sarapan. Menginap sampai tanggal berapa?",
    nunggu: "Maaf menunggu lama kak. Family Room Rp 1.100.000 per malam, kamar kosongnya saya cek ke tim sekarang.",
  },
  info: [
    { judul: "Tipe kamar & harga per malam", asal: "Ditempel manual", potongan: 16, siap: true },
    { judul: "Aturan menginap & pembatalan", asal: "Ditempel manual", potongan: 8, siap: true },
    { judul: "Halaman kamar di website", asal: "Dibaca dari website", potongan: 22, siap: true },
    DARI_AI_LAIN,
  ],
  janji: [
    { nama: "Bu Sinta", untuk: "lihat tempat untuk acara kantor", kapan: "Hari ini jam 15.00", pasti: true },
    { nama: "Mas Dimas", untuk: "check-in Deluxe Room, 2 malam", kapan: "Besok jam 14.00", pasti: true },
    { nama: "Pak Andre", untuk: "Family Room dan jemput bandara", kapan: "Tgl 20 jam 14.00", pasti: false },
  ],
  sapa: {
    judul: "Tanya kesan & ajak menginap lagi",
    baris: [
      { hari: "Hari ke-0", teks: "Tamu check-out", kirim: false },
      { hari: "Hari ke-1", teks: "“Terima kasih sudah menginap Pak. Ada yang kurang selama di sini?”", kirim: true },
      { hari: "Bulan ke-5", teks: "“Pak, libur akhir tahun sebentar lagi. Mau saya kirim harga kamar untuk Desember?”", kirim: true },
    ],
    catatan: "Keluhan tamu langsung diteruskan ke resepsionis, bukan dijawab sendiri.",
  },
  langkahInfo: {
    body: "Tulis tipe kamar, harga per malam, harga akhir pekan dan musim liburan, fasilitas, jam check-in, dan aturan pembatalan. Lalu periksa cara dia bicara ke tamu.",
    pendek: "Tulis tipe kamar, harga, fasilitas, dan aturan menginap, lalu periksa hasilnya.",
  },
  tanyaJawab: [
    {
      t: "Dia bisa lihat kamar kosong dan langsung konfirmasi booking?",
      j: "Belum. Palwise tidak tersambung ke sistem reservasi atau channel manager. Dia menjawab harga dan fasilitas, merinci tanggal dan totalnya, lalu resepsionis yang memastikan kamarnya. Yang belum dipastikan ditandai, bukan dianggap beres.",
    },
    {
      t: "Harga kamar saya beda tiap tanggal, bisa?",
      j: "Bisa, asal ditulis. Harga hari biasa, akhir pekan, dan musim liburan ditulis per baris, lalu dia menyebut yang sesuai tanggal tamu. Tanggal yang sudah penuh juga ditulis, supaya dia nggak menawarkannya.",
    },
    {
      t: "Kalau tamu mau bayar pakai kartu kredit lewat chat?",
      j: "Dia dilarang meminta nomor kartu, kode OTP, atau foto kartu lewat chat. Cara bayar yang dia sebut cuma yang kamu tulis, dan urusan pembayarannya tetap lewat tim kamu.",
    },
    {
      t: "Cocok untuk villa atau guest house yang kamarnya sedikit?",
      j: "Cocok. Justru yang nggak punya resepsionis jaga malam paling sering telat bales chat. Satu nomor WhatsApp cukup, dan kamu tetap bisa ikut balas kapan saja. Begitu kamu ngetik di sebuah chat, asistennya diam di chat itu.",
    },
  ],
  penutup: "Tamu yang chat malam ini, biar dia yang jawab",
};

const TRAVEL: IsiJualan = {
  id: "travel",
  presetId: "travel",
  nama: "Tour & travel",
  namaPendek: "Travel",
  ikon: "travel",
  meta: {
    judul: "Palwise untuk tour & travel: sales WhatsApp yang bales calon peserta 24 jam",
    ringkas:
      "Pertanyaan paket, jadwal berangkat, dan harga per orang di WhatsApp dibales dalam hitungan detik, pakai info travelmu sendiri. Pendaftaran tercatat rapi untuk dipastikan tim. Mulai gratis.",
  },
  hero: {
    lencana: "Sales WhatsApp untuk tour & travel",
    judul: "Ada yang tanya paket liburan lewat WhatsApp jam 10 malam.",
    judulAbu: "Besoknya, dia udah DP di travel sebelah.",
    sub: "Palwise pakai AI buat bales tiap chat WhatsApp travelmu dalam hitungan detik, pakai paket, jadwal, dan harga yang kamu isi. Yang mau ikut langsung dirinci totalnya, tim kamu tinggal mastiin kursinya.",
  },
  chat: {
    nama: "Kak Laras",
    belumDibaca: 4,
    catatan: "Ilustrasi chat travel. Paket dan harganya contoh. Kursi dan visa tetap dipastikan tim.",
    pesan: [
      { dari: "pelanggan", teks: "Kak, open trip Labuan Bajo bulan Juli masih ada?", jam: "22.14" },
      {
        dari: "asisten",
        teks: "Halo kak! Juli ada keberangkatan tanggal 3, 10, 17, dan 24. Open trip 3 hari 2 malam Rp 3.750.000 per orang, sudah termasuk kapal phinisi, makan, dan tiket taman nasional.",
        jam: "22.14",
      },
      { dari: "pelanggan", teks: "Tiket pesawatnya termasuk?", jam: "22.15" },
      {
        dari: "asisten",
        teks: "Belum kak, tiket pesawat ke Labuan Bajo dipesan sendiri. Rencananya berangkat berapa orang?",
        jam: "22.15",
      },
      { dari: "pelanggan", teks: "Ber-3, yang tanggal 10", jam: "22.16" },
      {
        dari: "asisten",
        teks: "Saya rinci ya kak: open trip Labuan Bajo 10 Juli, 3 orang, totalnya Rp 11.250.000 dengan DP 50 persen. Tim kami kabari kepastian kursinya dulu sebelum kakak transfer.",
        jam: "22.16",
      },
    ],
  },
  hitung: {
    usaha: "travelmu",
    satuan: "peserta",
    jadi: "Dari yang dibales cepat, yang jadi daftar",
    nilai: "Rata-rata untung per peserta",
    nilaiAwal: 500_000,
    nilaiMaks: 10_000_000,
    langkahNilai: 50_000,
    jadiAwal: 8,
  },
  tanyaAi: [
    {
      label: "Cek calon peserta",
      ikon: "pelanggan",
      tanya: "Siapa yang perlu aku balas?",
      jawab: "Laras menunggu kepastian 3 kursi Labuan Bajo tanggal 10 Juli. Pak Yusuf tanya visa Jepang untuk orang tuanya, ini perlu tim yang jawab.",
      pelanggan: ["Laras · Labuan Bajo 10 Juli, 3 orang", "Pak Yusuf · Tanya visa Jepang"],
      petunjuk: PETUNJUK_CEK,
    },
    {
      label: "Siapkan draf",
      ikon: "kirim",
      tanya: "Bantu kabari Laras, 3 kursinya aman.",
      jawab: "Laras daftar open trip Labuan Bajo 10 Juli untuk 3 orang. Ini drafnya:",
      draf: {
        untuk: "Laras",
        teks: "Halo kak Laras, 3 kursi open trip Labuan Bajo tanggal 10 Juli sudah kami amankan ya. DP 50 persen Rp 5.625.000. Setelah DP masuk, kami minta data KTP pesertanya 🙏",
      },
      petunjuk: PETUNJUK_DRAF,
    },
    {
      label: "Kabar keberangkatan",
      ikon: "ringkasan",
      tanya: "Keberangkatan Juli udah berapa yang daftar?",
      jawab: "Ada 23 orang yang minta didaftarkan untuk Juli, 6 belum kamu pastikan.",
      angka: ["23 calon peserta", "6 belum dipastikan"],
      petunjuk: "Jumlah yang minta daftar belum berarti jumlah yang sudah bayar DP.",
    },
  ],
  sorotanJudul: "Bukan cuma bales. Dia bawa calon peserta sampai DP.",
  sorotan: {
    info: "Paket, jadwal, dan harga cuma dari yang kamu isi. Sisa kursi dan visa dilempar ke tim.",
    janjiTab: "Keberangkatan kecatat",
    janji: "Tanggal berangkat dan jumlah orang yang diminta di chat masuk daftar. Kamu tinggal mastiin.",
    sapaTab: "Peserta ikut trip lagi",
    sapa: "Ditanya kesannya setelah pulang, lalu dikabari pas ada paket baru.",
  },
  rasa: {
    pesan: "Kak, open trip Labuan Bajo Juli masih ada?",
    santai: "Halo kak! Juli ada keberangkatan tanggal 3, 10, 17, dan 24, Rp 3.750.000 per orang. Rencananya berapa orang?",
    nunggu: "Maaf menunggu kak. Open trip Labuan Bajo Juli ada, Rp 3.750.000 per orang.",
  },
  info: [
    { judul: "Paket & jadwal keberangkatan", asal: "Ditempel dari Excel", potongan: 24, siap: true },
    { judul: "Itinerary tour Jepang", asal: "Diambil dari berkas PDF", potongan: 11, siap: true },
    { judul: "Aturan DP & pembatalan", asal: "Ditempel manual", potongan: 6, siap: true },
    DARI_AI_LAIN,
  ],
  janji: [
    { nama: "Pak Yusuf", untuk: "konsultasi tour Jepang di kantor", kapan: "Hari ini jam 16.00", pasti: true },
    { nama: "Mbak Tari", untuk: "open trip Bromo, kumpul di Malang", kapan: "Sabtu jam 23.30", pasti: true },
    { nama: "Kak Laras", untuk: "open trip Labuan Bajo, 3 orang", kapan: "10 Juli jam 08.00", pasti: false },
  ],
  sapa: {
    judul: "Tanya kesan & tawarkan trip berikutnya",
    baris: [
      { hari: "Hari ke-0", teks: "Pulang dari Labuan Bajo", kirim: false },
      { hari: "Hari ke-2", teks: "“Gimana trip Labuan Bajo kemarin kak? Ada yang kurang?”", kirim: true },
      { hari: "Bulan ke-4", teks: "“Kak, open trip Raja Ampat baru dibuka untuk Desember. Mau saya kirim itinerary-nya?”", kirim: true },
    ],
    catatan: "Nggak pernah menakut-nakuti kursi mau habis. Keluhan selama perjalanan langsung diteruskan ke tim.",
  },
  langkahInfo: {
    body: "Tulis paket, jadwal keberangkatan, harga per orang, yang sudah dan belum termasuk, serta aturan DP dan pembatalan. Unggah itinerary, lalu periksa hasilnya.",
    pendek: "Tulis paket, jadwal, harga, dan aturan DP, lalu periksa hasilnya.",
  },
  tanyaJawab: [
    {
      t: "Dia bisa jamin kursi aman atau visa disetujui?",
      j: "Nggak. Dia dilarang memastikan kursi, tiket, atau kamar sebelum dipastikan tim, dan dilarang menjamin visa atau jadwal penerbangan. Yang dia kerjakan: menjawab soal paket, merinci totalnya, lalu mencatat pendaftarannya untuk tim.",
    },
    {
      t: "Bisa kirim itinerary dan brosur?",
      j: "Bisa. Unggah itinerary atau brosur sekali, lalu dia yang kirim pas ada yang minta. Paket yang memuat fitur ini tertulis di kartu harga.",
    },
    {
      t: "Dia minta data paspor peserta lewat chat?",
      j: "Nggak di obrolan awal. Data KTP atau paspor diminta tim waktu pendaftaran, supaya data pribadi nggak tersebar di chat yang belum tentu jadi daftar.",
    },
  ],
  penutup: "Yang nanya paket liburan malam ini, biar dia yang jawab",
};

/**
 * Halaman per bidang, urutannya urutan di menu dan kaki halaman.
 *
 * Alamatnya pendek dan langsung di akar ("/klinik", bukan "/untuk/klinik"),
 * atas permintaan pemilik produk: alamat ini yang dibagikan di WhatsApp dan
 * diketik orang dari brosur. Tiap alamat punya folder sendiri di `app/`,
 * BUKAN satu rute dinamis di akar, supaya alamat ngawur tetap 404 dan tidak
 * ada rute yang diam-diam menelan halaman lain.
 */
export const HALAMAN_BIDANG: IsiJualan[] = [
  KLINIK,
  HOTEL,
  TRAVEL,
  DEALER,
  PROPERTI,
  KURSUS,
  SERVIS,
  KATERING,
  TOKO,
  SEKOLAH,
];

export function jualanUntuk(id: string): IsiJualan {
  const isi = HALAMAN_BIDANG.find((h) => h.id === id);
  if (!isi) throw new Error(`Halaman bidang "${id}" tidak ada di lib/jualan.ts`);
  return isi;
}

/** Alamat halaman bidang untuk sebuah preset, atau null kalau belum ada. */
export function halamanPreset(presetId: string): string | null {
  const isi = HALAMAN_BIDANG.find((h) => h.presetId === presetId);
  return isi ? `/${isi.id}` : null;
}

export function metadataJualan(isi: IsiJualan): Metadata {
  const jalur = `/${isi.id}`;
  return {
    title: { absolute: isi.meta.judul },
    description: isi.meta.ringkas,
    alternates: { canonical: jalur },
    openGraph: {
      type: "website",
      locale: "id_ID",
      siteName: "Palwise",
      title: isi.meta.judul,
      description: isi.meta.ringkas,
      url: jalur,
    },
    twitter: { card: "summary_large_image", title: isi.meta.judul, description: isi.meta.ringkas },
  };
}
