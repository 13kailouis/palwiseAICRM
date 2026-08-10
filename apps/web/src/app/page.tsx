import Link from "next/link";
import {
  PLANS,
  SEMUA_PAKET,
  formatIDR,
  paketMinimalTiapFitur,
  pricePerReply,
  type Fitur,
} from "@palwise/db";
import { keApp } from "@/lib/situs";
import { LogoNama } from "@/components/Logo";
import { DataTerstruktur } from "@/components/DataTerstruktur";
import { IDENTITAS, tautanBantuanWa } from "@/lib/identitas";
import { Ikon, type NamaIkon } from "@/components/Ikon";
import { PRESET } from "@/lib/preset";
import { ContohChat } from "@/components/ContohChat";
import {
  MockupDashboard,
  MockupInfoBisnis,
  MockupJanji,
  MockupSapaLagi,
} from "@/components/Mockup";
import { KakiHalaman } from "@/components/HalamanTeks";
import { AjakanBawah } from "@/components/AjakanBawah";

/**
 * HALAMAN INI DIBACA DI HP DULU, BARU DI LAPTOP.
 *
 * Pemilik usaha di Indonesia menjalankan usahanya dari HP, dan halaman ini
 * ditemukan lewat tautan yang dibagikan di WhatsApp. Waktu diukur di layar
 * 375px, seluruh halaman ini setara belasan layar penuh tulisan, dan tulisan
 * yang di laptop terbaca sebagai "penjelasan yang teliti" di HP terbaca
 * sebagai tembok.
 *
 * Jadi di HP yang tampil versi pendeknya, dan yang panjang tetap ada untuk
 * layar lebar. Caranya lewat <Dua>: dua-duanya tertulis di HTML, yang satu
 * disembunyikan CSS. Bukan dengan mengukur lebar layar di JavaScript, karena
 * itu berarti server tidak tahu mana yang akan tampil, dan halamannya berkedip
 * ganti tulisan sesudah dimuat.
 *
 * Yang DIBUANG di HP, bukan cuma dipendekkan: catatan kaki tiap sorotan, isi
 * penjelasan tiap fitur (judulnya sudah kalimat lengkap), contoh pertanyaan
 * tiap bidang usaha, ajakan di tengah halaman (sudah ada tombol nempel di
 * dasar layar), dan separuh daftar "sekarang vs pakai Palwise".
 *
 * Yang DITAMBAH khusus HP: tombol daftar yang nempel di dasar layar, baris
 * pintasan ke bagian penting (di HP menu atas menyembunyikan tautannya), dan
 * kartu harga yang digeser ke samping, bukan ditumpuk empat ke bawah.
 */

/**
 * Tulisan dua ukuran: pendek untuk HP, panjang untuk layar lebar.
 *
 * Keduanya dikirim dalam satu HTML. Itu memang menambah beberapa baris yang
 * tidak terbaca, dan itu harga yang murah dibanding halaman yang isinya baru
 * diputuskan sesudah sampai di browser.
 */
function Dua({
  hp,
  lebar,
  className = "",
}: {
  hp: React.ReactNode;
  lebar: React.ReactNode;
  className?: string;
}) {
  return (
    <>
      <p className={`sm:hidden ${className}`}>{hp}</p>
      <p className={`hidden sm:block ${className}`}>{lebar}</p>
    </>
  );
}

/**
 * Judul fitur menyebut HASILNYA, isinya baru menjelaskan caranya.
 *
 * Pergeseran 8 Agustus 2026: seluruh halaman ini tadinya memposisikan Palwise
 * sebagai ADMIN. Itu keliru sebagai penjualan, bukan cuma sebagai pilihan kata.
 * Admin itu pos biaya, dan orang membeli pos biaya sekecil mungkin lalu
 * membatalkannya begitu ada penghematan. Yang sebenarnya dikerjakan produk ini
 * pekerjaan SALES: menjawab calon pembeli selagi dia masih mau beli, mengejar
 * yang menghilang, mencatat siapa yang hampir jadi. Orang membeli sales
 * sebanyak yang dia mampu, karena sales menghasilkan.
 *
 * Jadi "Data pelanggan terisi sendiri" jadi "Calon pembeli tercatat sendiri",
 * dan seterusnya. Mekaniknya sama persis, yang berubah apa yang dijualnya.
 */
const FEATURES: {
  ikon: NamaIkon;
  title: string;
  body: string;
  /**
   * Fitur yang butuh paket tertentu. Nama paketnya DITURUNKAN dari plans.ts,
   * bukan diketik, supaya tidak bisa berbeda dari yang benar-benar ditegakkan.
   *
   * Kenapa ini wajib ada: dua dari sepuluh fitur di daftar ini cuma jalan mulai
   * paket Growth, dan sebelum ini tidak ada satu pun tanda di halaman jualan.
   * Yang paling merugikan justru "yang tanya lalu hilang, dikejar lagi", karena
   * seluruh halaman ini dijual sebagai SALES dan mengejar yang menghilang itu
   * inti janjinya. Orang yang membeli Starter karena baris itu lalu tidak
   * menemukannya berhak merasa dibohongi, dan dia benar.
   *
   * Ini arah kedua dari "halaman harga bisa berbohong ke dua arah": bukan
   * menjanjikan yang tidak ada, tapi menyembunyikan bahwa yang ada itu berbayar.
   */
  fitur?: Fitur;
}[] = [
  {
    ikon: "qr" as NamaIkon,
    title: "Mulai jualan dalam semenit",
    body: "Buka WhatsApp di HP, scan QR, kelar. Nggak usah daftar ke Meta dan nunggu berhari-hari.",
  },
  {
    ikon: "suara" as NamaIkon,
    title: "Foto dan voice note tetap kejawab",
    body: "Pelanggan kirim foto barang sambil nanya \"ini berapa?\", atau voice note panjang. Dua-duanya dibaca dan dibalas.",
    fitur: "bacaMedia",
  },
  {
    ikon: "kirim" as NamaIkon,
    title: "Katalog dikirim tanpa kamu buka HP",
    body: "Unggah foto barang, katalog, daftar harga PDF, atau QRIS sekali. Pas ada yang minta, dia yang kirim.",
    fitur: "kirimMedia",
  },
  {
    ikon: "kendali" as NamaIkon,
    title: "Kamu masih yang pegang kendali",
    body: "Semua chat di satu layar. Begitu kamu ikut ngetik, dia langsung diam dan minggir.",
  },
  {
    ikon: "catat" as NamaIkon,
    title: "Calon pembeli tercatat sendiri",
    body: "Nama, nomor, dan apa yang dia cari masuk sendiri dari obrolannya, bukan ketimbun di chat.",
  },
  {
    ikon: "sapa" as NamaIkon,
    title: "Yang tanya lalu hilang, dikejar lagi",
    body: "Yang nanya terus diem aja disapa ulang otomatis. Ini yang paling sering nambah closing.",
    fitur: "sapaOtomatis",
  },
  {
    ikon: "kalender" as NamaIkon,
    title: "Nggak ada jadwal yang kelewat",
    body: "Jam yang disepakati di chat tercatat sendiri, dan pelanggannya diingetin sebelum harinya.",
  },
  {
    ikon: "ringkasan" as NamaIkon,
    title: "Chat 80 pesan, kebaca dalam 5 baris",
    body: "Sekali klik: dia mau apa, udah sampai mana, dan nunggu apa dari kamu.",
  },
  {
    ikon: "jam" as NamaIkon,
    title: "Jam kerja kamu yang nentuin",
    body: "Jam buka, chat dipegang tim kamu. Di luar jam itu baru dia yang ambil alih.",
    fitur: "jamKerja",
  },
  {
    ikon: "banyakNomor" as NamaIkon,
    title: "Banyak nomor, banyak cabang",
    body: "Satu akun bisa pegang beberapa nomor, dan tiap nomor boleh punya sales sendiri.",
  },
];

const LANGKAH = [
  {
    ikon: "qr" as NamaIkon,
    judul: "Sambungin nomor kamu",
    body: "Buka WhatsApp di HP, masuk ke Perangkat tertaut, scan QR yang muncul di layar. Sekitar semenit, dan chat lama kamu nggak ke mana-mana.",
    pendek: "Buka WhatsApp, masuk ke Perangkat tertaut, scan QR. Chat lama kamu nggak ke mana-mana.",
  },
  {
    ikon: "info" as NamaIkon,
    judul: "Kasih tahu dia jualan kamu",
    body: "Pilih contoh yang paling deket sama bidangmu, terus tempel daftar harga dan aturanmu. Atau cukup kasih alamat website kamu dan biar dia baca sendiri.",
    pendek: "Tempel daftar harga dan aturanmu, atau kasih alamat website dan biar dia baca sendiri.",
  },
  {
    ikon: "chat" as NamaIkon,
    judul: "Dia mulai jualan",
    body: "Chat yang masuk dibalas pakai harga dan jadwal yang bener, sampai orangnya mau pesan. Kamu tetep lihat semuanya dan bisa ambil alih kapan aja.",
    pendek: "Chat masuk dibalas pakai harga dan jadwal yang bener. Kamu bisa ambil alih kapan aja.",
  },
];

/**
 * Tanya jawab.
 *
 * Urutannya sengaja diubah pada 1 Agustus 2026. Sebelumnya yang paling atas
 * "Nomor WhatsApp saya aman?", dijawab dengan paragraf panjang yang isinya
 * peringatan nomor bisa diblokir Meta. Isinya benar dan tetap harus ada, tapi
 * menaruhnya paling atas berarti hal pertama yang dibaca calon pembeli adalah
 * hal paling menakutkan, tepat sebelum tombol daftar.
 *
 * Sekarang yang mudah dan menenangkan duluan, yang berat tetap ada tapi di
 * tengah. Jawabannya juga dipendekkan: di halaman jualan orang memindai, dan
 * paragraf lima baris di dalam panel lipat praktis tidak terbaca.
 */
const TANYA_JAWAB: { t: string; j: string }[] = [
  {
    t: "Saya harus install apa?",
    j: "Nggak ada. Semuanya jalan di browser. HP kamu cuma dipakai sekali buat scan QR.",
  },
  {
    t: "Bisa berhenti kapan saja?",
    // Angkanya diturunkan dari daftar paket. Kalau diketik di sini, suatu hari
    // jatah yang ditegakkan sistem dan jatah yang dijanjikan halaman ini akan
    // berbeda, dan yang membaca tidak punya cara tahu mana yang benar.
    j: `Bisa, tanpa denda. Langganannya bulanan, dan bulan yang udah kamu bayar tetep jalan sampai tanggal habisnya. Paket gratisnya ${PLANS.free.aiCredits} balasan per bulan, bisa dipakai selamanya.`,
  },
  {
    t: "Pelanggan saya tahu ini dibalas mesin?",
    j: "Kamu yang nentuin. Dia bisa ngaku asisten, bisa juga ngomong sebagai tim usahamu. Saran kami yang pertama: orang jarang keberatan dibalas mesin kalau jawabannya bener.",
  },
  {
    t: "Kalau dia salah jawab gimana?",
    j: "Bisa kejadian, dan kami nggak mau pura-pura nggak. Dia cuma boleh jawab dari info yang kamu masukin, dilarang ngarang harga, stok, dan jadwal, dan yang dia nggak tahu dilempar ke kamu. Tes dulu sepuasnya di halaman Coba dulu sebelum nomor aslimu disambungin.",
  },
  {
    t: "Nomor WhatsApp saya aman?",
    // SARANNYA HARUS SAMA PERSIS dengan yang tertulis di halaman Nomor WhatsApp
    // di dalam dashboard, dan sempat tidak.
    //
    // Dulu di sini cuma "pakai nomor terpisah dulu". Hampir semua orang membaca
    // itu sebagai "beli nomor baru", dan nomor yang baru dibeli JUSTRU yang
    // paling gampang kena batasan Meta karena WhatsApp belum mengenalnya. Jadi
    // halaman jualan mendorong orang ke pilihan yang paling berisiko, dan dia
    // baru diberi tahu kebalikannya sesudah masuk dashboard, sesudah SIM-nya
    // terbeli. Saran yang bertentangan antar layar lebih merugikan daripada
    // saran yang tidak ada, karena yang kedua tidak membuat orang mengeluarkan
    // uang untuk hal yang salah.
    j: "Palwise nyambung lewat Perangkat tertaut, sama kayak WhatsApp Web, jadi chat lama kamu nggak ke mana-mana. Tapi Palwise bukan produk resmi WhatsApp, dan Meta berhak batesin nomor yang dianggap ngelanggar aturan mereka. Palwise cuma bales yang chat duluan dan nggak pernah nyebar pesan, karena itu penyebab paling sering. Kalau nomor itu satu-satunya jalur usahamu, pakai nomor lain yang khusus buat usaha, tapi jangan nomor yang baru banget dibeli: WhatsApp belum kenal nomor baru, jadi malah lebih gampang kena batasan.",
  },
  {
    t: "Data pelanggan saya dipakai buat apa?",
    j: "Cuma buat jalanin sales kamu. Nggak dijual, nggak dipakai ngelatih AI, dan nggak dibaca karyawan kami. Rinciannya ada di kebijakan privasi.",
  },
  {
    t: "Udah dipakai siapa aja?",
    // Pertanyaan ini WAJIB ada dan wajib dijawab jujur.
    //
    // Ini pertanyaan pertama yang muncul di kepala orang yang belum kenal kita,
    // dan halaman yang tidak menjawabnya membuat dia mengarang jawabannya
    // sendiri, biasanya ke arah yang paling buruk. Mengarang angka pemakai juga
    // bukan pilihan: sekali satu angka di halaman ini terbukti karangan, harga
    // dan janji fiturnya ikut kehilangan kepercayaan, dan harga itu satu-satunya
    // pembeda kami.
    //
    // Jadi kelemahannya dijadikan alat jual: yang lain minta kamu percaya
    // testimoni, kami minta kamu tidak percaya siapa pun dan mengetes sendiri.
    j: "Palwise masih baru dan belum punya daftar pelanggan yang bisa kami pajang. Kami juga nggak mau ngarang angka atau testimoni, karena kalau satu aja ketahuan karangan, kamu nggak akan percaya harga kami juga. Yang bisa kami tawarin lebih enak: buka halaman Coba dulu, tanya dia kayak kamu pelanggan, dan lihat sendiri jawabannya bener atau nggak.",
  },
  {
    t: "Bedanya sama platform lain apa?",
    j: "Harganya, dan itu bukan diskon-diskonan. Chat yang dimulai pelanggan nggak ditagih WhatsApp selama dibalas dalam 24 jam, jadi biaya yang bener-bener keluar cuma buat jalanin AI-nya. Itu yang kami tagih. Yang lain nagih kamu sepertujuh lebih mahal buat pekerjaan yang sama.",
  },
];

/**
 * Angka-angka ini semuanya sifat produknya sendiri, BUKAN pengakuan pelanggan.
 *
 * Palwise belum punya pelanggan. Halaman jualan pesaing penuh testimoni, video,
 * dan "dipercaya 3.000+ bisnis", dan itu memang bekerja. Tapi mengarangnya
 * berarti berbohong ke orang yang belum kenal kita, di kalimat pertama yang
 * mereka baca. Begitu ada pelanggan sungguhan yang mau bicara, ganti bagian ini
 * dengan ucapan mereka.
 */
const FAKTA = [
  {
    nilai: "24 jam",
    label: "Calon pembeli dibalas terus, termasuk tengah malam dan hari libur",
    pendek: "Dibales terus, tengah malam juga",
  },
  {
    nilai: "1 menit",
    label: "Dari scan QR sampai dia mulai jualan buat kamu",
    pendek: "Dari scan QR sampai dia jualan",
  },
  // Dibandingkan dengan gaji admin, bukan cuma disebut angkanya sendiri. Rp 33
  // itu tidak berarti apa-apa sampai ditaruh di sebelah biaya yang selama ini
  // orang keluarkan untuk pekerjaan yang sama.
  {
    nilai: "Rp 33",
    label: "Ongkos tiap balasan di paket Growth. Bandingin sama gaji admin sebulan",
    pendek: "Ongkos tiap balasan di paket Growth",
  },
  {
    // Diturunkan dari daftar paket, jangan diketik. Angka di kartu ini dan jatah
    // yang benar-benar ditegakkan sistem wajib sama.
    nilai: String(PLANS.free.aiCredits),
    label: "Balasan gratis tiap bulan, tanpa kartu kredit, tanpa batas waktu",
    pendek: "Balasan gratis tiap bulan",
  },
];

/**
 * Dua kolom yang disandingkan.
 *
 * Kolom kiri sengaja ditulis sebagai KEHILANGAN, bukan sebagai kerepotan.
 * "Chat menumpuk" itu keluhan admin, dan orang tahan hidup dengan repot
 * bertahun-tahun. "Yang tanya udah beli di tempat lain" itu uang yang hilang
 * minggu ini, dan itu yang bikin orang buka dompet.
 */
const CARA_LAMA = [
  "Yang chat jam 11 malam baru kamu lihat besok pagi. Sebagian udah beli di sebelah.",
  "\"Ready nggak kak?\" diketik ulang buat yang keseratus kali hari ini.",
  "Nomor calon pembeli ketimbun di chat, besok udah nggak ketemu lagi.",
  "Yang nanya-nanya terus ngilang ya udah, nggak ada yang ngejar.",
  "Nambah admin berarti nambah gaji, nambah cuti, dan ngajarin dari nol lagi.",
];

const CARA_BARU = [
  "Dibalas dalam hitungan detik, jam berapa pun, tanpa kamu pegang HP.",
  "Harga, jadwal, dan aturan dijawab dari daftar yang kamu isi sendiri.",
  "Nama, nomor, dan apa yang dia cari tercatat sendiri dari obrolannya.",
  "Jadwal yang disepakati di chat masuk daftar, nggak ada yang kelewat.",
  "Yang ngilang dikejar lagi, yang udah beli diajak balik.",
  "Kamu tetep lihat semua chat, dan bisa ambil alih kapan aja.",
];

/**
 * Bidang usaha yang cocok, DITURUNKAN dari daftar preset.
 *
 * Tiap baris memakai contoh pertanyaan yang benar-benar sering masuk di bidang
 * itu, bukan kalimat umum seperti "cocok untuk semua bisnis". Orang mengenali
 * dirinya dari pertanyaan pelanggannya, bukan dari nama kategorinya.
 *
 * Dulu daftarnya diketik ulang di sini, terpisah dari `PRESET`, dan dua daftar
 * untuk satu kebenaran selalu berakhir sama: keduanya sudah sempat berbeda
 * ("Kafe, resto & katering" di sini, "Kafe, restoran & katering" di preset).
 * Yang lebih mahal bukan bedanya, tapi bidang baru yang ditambahkan di preset
 * lalu tidak pernah muncul di halaman jualan karena tidak ada yang ingat ada
 * berkas kedua.
 */
const BIDANG = PRESET.filter((p) => p.diHalamanDepan).map((p) => ({
  ikon: p.ikon,
  nama: p.nama,
  contoh: p.contoh,
}));

const RIVAL_PRICE = 1_499_000;
const RIVAL_CREDITS = 15_000;

/**
 * Satu bagian sorotan: tulisan di satu sisi, gambar produknya di sisi lain,
 * bergantian kiri kanan.
 *
 * Bergantiannya bukan gaya-gayaan. Halaman yang tiap bagiannya berpola sama
 * persis (judul, anak judul, tiga kartu) terasa seperti templat, dan mata
 * berhenti memperhatikan setelah bagian kedua.
 */
function Sorotan({
  judul,
  body,
  bodyHp,
  catatan,
  gambar,
  balik = false,
  latar = false,
}: {
  judul: string;
  body: string;
  /** Versi HP. Isinya sama, kalimat pendukungnya dibuang. */
  bodyHp: string;
  catatan?: string;
  gambar: React.ReactNode;
  balik?: boolean;
  latar?: boolean;
}) {
  return (
    <section className={latar ? "border-y border-ink-200 bg-ink-50/60" : ""}>
      <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
        <div className="grid items-center gap-7 sm:gap-12 lg:grid-cols-2">
          <div className={balik ? "lg:order-2" : ""}>
            <h2 className="text-[22px] font-semibold leading-snug tracking-tight text-ink-950 sm:text-3xl">
              {judul}
            </h2>
            <Dua
              hp={bodyHp}
              lebar={body}
              className="mt-3 text-[15px] leading-relaxed text-ink-600 sm:mt-4 sm:text-lg"
            />
            {/* CATATAN KAKI CUMA DI LAYAR LEBAR.
                Isinya syarat dan pengecualian, dan itu memang perlu ada, tapi
                di HP dia menambah satu paragraf lagi tepat sesudah paragraf
                yang baru saja dibaca. Empat sorotan berarti empat paragraf
                tambahan yang tidak menjual apa pun. Semuanya tetap terjawab di
                bagian tanya jawab, dan yang benar-benar teliti membacanya di
                sana. */}
            {catatan && (
              <p className="mt-5 hidden border-l-2 border-ink-300 pl-4 text-[15px] leading-relaxed text-ink-500 sm:block">
                {catatan}
              </p>
            )}
          </div>
          <div className={`flex justify-center ${balik ? "lg:order-1" : ""}`}>
            {gambar}
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function LandingPage() {
  const growth = PLANS.growth;
  const paketFitur = paketMinimalTiapFitur();

  const COMPARISON: [string, string, string][] = [
    [
      "Harga mulai",
      `${formatIDR(PLANS.starter.pricePerMonth)} per bulan`,
      `${formatIDR(RIVAL_PRICE)} per bulan`,
    ],
    [
      "Harga tiap balasan",
      `${formatIDR(pricePerReply(growth))} (paket Growth)`,
      formatIDR(Math.round(RIVAL_PRICE / RIVAL_CREDITS)),
    ],
    [
      "Sampai bisa dipakai",
      "Scan QR, langsung jalan",
      "Daftar dulu ke Meta, tunggu 1 sampai 3 hari",
    ],
  ];

  return (
    <main className="min-h-screen bg-white">
      {/* Keterangan yang dibaca mesin pencari dan mesin jawaban. Isinya
          diturunkan dari daftar paket dan tanya jawab yang sama dengan yang
          digambar di bawah, jadi tidak mungkin berbeda dari yang dibaca orang. */}
      <DataTerstruktur tanyaJawab={TANYA_JAWAB} />
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-ink-200/70 bg-white/85 backdrop-blur">
        {/* Kepala halaman lebih pendek di HP. Layar HP itu pendek berdiri, dan
            64px yang menempel di atas terus-terusan memakan bagian layar yang
            paling mahal. */}
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:h-16">
          <Link href="/">
            <LogoNama />
          </Link>
          <nav className="flex items-center gap-1 text-sm sm:gap-2">
            <a href="#harga" className="hidden px-3 py-2 text-ink-600 hover:text-ink-900 sm:block">
              Harga
            </a>
            <a href="#fitur" className="hidden px-3 py-2 text-ink-600 hover:text-ink-900 sm:block">
              Fitur
            </a>
            {/* Panduannya ditaruh di menu atas, bukan cuma di kaki halaman.

                Sebagian orang membaca panduan SEBELUM mendaftar, justru untuk
                mengukur apakah dia mampu memasangnya sendiri. Menyembunyikannya
                di kaki halaman berarti yang paling ragu, yang paling butuh
                diyakinkan, tidak pernah menemukannya. */}
            <Link
              href="/panduan"
              className="hidden px-3 py-2 text-ink-600 hover:text-ink-900 sm:block"
            >
              Panduan
            </Link>
            {/* Tombol di sini sengaja garis luar, bukan biru penuh.
                Biru penuhnya dipakai satu kali saja di hero. Kalau dua-duanya
                biru dan terlihat bersamaan, tidak ada yang jadi utama dan
                warnanya berhenti berarti apa-apa. */}
            {/* Tombolnya sama untuk semua orang, TIDAK dibedakan sudah masuk
                atau belum.

                Dulu di sini membaca sesi dari cookie untuk menampilkan "Buka
                dashboard". Satu baris itu memaksa SELURUH halaman jualan
                digambar ulang tiap kali ada yang membukanya, karena halaman
                yang membaca cookie tidak bisa disimpan sebagai halaman jadi.
                Padahal isinya sama persis untuk semua orang.

                Yang dibayar mahal: halaman ini yang paling sering dibuka orang
                asing, dan tiap kunjungan jadi kerja penuh di satu VPS yang juga
                menjalankan mesin WhatsApp dan AI.

                Yang dikorbankan hampir tidak ada: /masuk melempar orang yang
                sudah login langsung ke dashboardnya, jadi yang sudah punya akun
                cuma menekan satu tombol lebih banyak, dan itu pun jarang terjadi
                karena mereka membuka dashboard dari bookmark, bukan dari
                halaman jualan. */}
            <Link
              href={keApp("/masuk")}
              className="tap-aman px-3 py-2 text-ink-600 hover:text-ink-900"
            >
              Masuk
            </Link>
            <Link href={keApp("/daftar")} className="btn-ghost">
              Coba gratis
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pt-9 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="badge bg-brand-50 text-brand-700">
            Sepertujuh harga platform sebelah
          </span>
          {/* JUDULNYA MENJUAL SALES, BUKAN ADMIN.

              Versi sebelumnya "Admin WhatsApp yang tidak pernah tidur, tanpa
              nambah gaji". Metaforanya rapi, tapi menjual barang yang salah.

              Admin itu pos biaya. Orang membeli pos biaya sekecil mungkin, terus
              menawar, dan membatalkannya begitu ada penghematan. Sedangkan yang
              benar-benar dikerjakan produk ini pekerjaan SALES: menjawab calon
              pembeli selagi dia masih mau beli, mengejar yang menghilang,
              mencatat siapa yang hampir jadi. Sales itu pos penghasilan, dan
              orang membeli sales sebanyak yang dia mampu.

              Pergeseran itu juga yang membenarkan seluruh halaman ini: dari
              "chat kamu jadi rapi" ke "yang tanya jadi beli".

              "tanpa nambah gaji" tetap dipertahankan karena di situlah harga
              kami menang, dan "WhatsApp" tetap wajib disebut supaya orang yang
              datang dari pencarian langsung tahu ini kategori apa. */}
          {/* Judulnya menjual HASIL, bukan mekanik.

              "Chat masuk, langsung dijawab" itu menjelaskan cara kerjanya, dan
              cara kerja bukan yang dibeli orang. Yang dibeli itu tidak
              kehilangan pembeli dan tidak nambah gaji. Dua-duanya disebut di
              satu kalimat, dan yang kedua sekaligus jadi pembeda kami: harganya.

              Sengaja tidak memakai "Scale Up Penjualan Anda" seperti tetangga
              sebelah. Itu bahasa kantoran yang tidak dipakai pemilik warung,
              dan janji kenaikan penjualan yang belum bisa kami buktikan ke
              siapa pun. */}
          {/* Pemenggalan barisnya cuma di layar lebar.

              <br /> yang dipaksakan di layar 375px bertabrakan dengan
              pemenggalan alami browser, hasilnya baris yang panjangnya
              loncat-loncat dan judul yang terlihat berantakan justru di
              perangkat tempat sebagian besar orang membukanya. */}
          {/* Judulnya WAJIB menyebut WhatsApp.

              Versi sebelumnya berbunyi "Tambah admin yang tidak pernah tidur,
              tanpa nambah gaji" dan tidak pernah menyebut kategorinya sama
              sekali. Orang yang datang dari pencarian atau dari tautan yang
              dibagikan teman harus membaca sampai paragraf ketiga sebelum tahu
              ini soal WhatsApp, dan sebagian besar tidak akan bertahan
              selama itu.

              "Tambah admin" juga punya bacaan kedua yang salah: di produk
              berlangganan, "tambah admin" terdengar seperti menambah akun
              pengguna untuk timmu, bukan menggantikan pegawai. Kata "Tambah"
              dibuang, kategorinya masuk, metaforanya tetap. */}
          {/* JUDULNYA ASPIRIN, BUKAN VITAMIN. Diubah 9 Agustus 2026.

              Versi sebelumnya "Sales WhatsApp yang gercep 24 jam, tanpa nambah
              gaji". Kalimat itu menyebut apa PRODUKNYA, dan produk itu vitamin:
              bagus kalau punya, gampang ditunda. Orang membeli aspirin, yaitu
              obat untuk sakit yang sudah terasa sekarang.

              Sakitnya pemilik usaha di sini bukan "belum punya sales 24 jam".
              Tidak ada yang bangun pagi merasa kekurangan sales 24 jam. Yang
              betulan terasa: dia tahu ada yang chat semalam, dan dia tahu
              sebagian sudah beli di tempat lain sebelum dia sempat balas. Itu
              uang yang sudah hilang minggu ini, bukan peluang yang belum
              diambil.

              Jadi judulnya sekarang menyebut kejadiannya, bukan produknya.
              Kalimat di bawahnya yang menyebut Palwise dan hasilnya, dan di situ
              "sales" serta "tanpa nambah gaji" tetap ada karena dua-duanya masih
              benar dan "tanpa nambah gaji" itu tempat harga kami menang.

              "WhatsApp" tetap di judul supaya orang yang datang dari pencarian
              atau dari tautan yang dibagikan teman langsung tahu ini kategori
              apa. */}
          {/* Ukurannya turun di HP, bukan cuma ikut lebar.
              36px di layar 375px bikin judul ini jadi empat baris tebal yang
              memenuhi hampir separuh layar pertama, dan tombolnya terdorong ke
              bawah lipatan. Turun ke 30px hasilnya masih judul yang paling
              besar di layar, tapi tombolnya kelihatan tanpa menggulir. */}
          <h1 className="mt-4 text-[1.875rem] font-bold leading-[1.15] tracking-tight text-ink-950 sm:mt-5 sm:text-[3.4rem] sm:leading-[1.08]">
            Ada yang chat WhatsApp kamu jam 11 malam.
            <br className="hidden sm:inline" />{" "}
            <span className="text-ink-500">Besoknya, dia udah beli di sebelah.</span>
          </h1>

          {/* SATU kalimat, bukan dua paragraf.

              Sempat ada dua: satu berisi pertanyaan soal rasa sakitnya, satu
              lagi menyebut tiga fitur sekaligus. Dua-duanya masuk akal
              sendiri-sendiri, tapi digabung dengan judul tiga baris hasilnya
              tembok teks, dan tombolnya terdorong sampai hampir keluar layar.
              Di hero, tiap baris tambahan menunda tombol, dan tombol yang
              tertunda tidak ditekan.

              Yang disisakan cuma yang tidak bisa ditebak dari judulnya: bahwa
              jawabannya benar karena diambil dari info yang dia isi sendiri.
              Rasa sakitnya sudah tersirat di "tidak pernah tidur", dan daftar
              fiturnya memang tempatnya di bawah, bukan di sini.

              KALIMATNYA MENYEBUT PERTANYAAN, BUKAN ISTILAH PRODUK.

              Versi sebelumnya berbunyi "dengan harga dan jadwal yang benar dari
              info usahamu sendiri", dan itu cuma jelas buat yang sudah tahu cara
              kerjanya. Orang yang baru pertama kali mendengar Palwise tidak tahu
              kenapa tiba-tiba disebut harga dan jadwal, tidak tahu apa itu "info
              usahamu" (itu nama halaman di dalam dashboard, bukan kata yang dia
              pakai sehari-hari), dan kalimatnya juga dimulai tanpa subjek
              sehingga dia harus menebak siapa yang membalas siapa.

              Yang dikenali orang seketika bukan istilah produknya, tapi
              pertanyaan yang tiap hari masuk ke HP-nya. Jadi yang disebut
              pertanyaannya.

              SESUDAH JUDULNYA JADI ASPIRIN, kalimat ini yang memikul produknya.
              Judul menyebut sakitnya, kalimat ini menyebut obatnya, dan urutan
              itu yang benar: orang harus mengenali dirinya dulu sebelum dia
              peduli kamu jual apa. */}
          {/* Satu kalimat, dan versinya cuma satu untuk semua layar.
              Yang dibuang "sampai orangnya mau pesan, tanpa nambah orang",
              karena dua-duanya sudah terbaca dari kata "sales" dan "tanpa
              nambah gaji" di kalimat yang sama. Kalimat yang lebih pendek di
              laptop juga bukan kerugian: di hero, tiap baris tambahan menunda
              tombolnya, dan tombol yang tertunda tidak ditekan. */}
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-ink-700 sm:mt-6 sm:text-lg">
            Palwise jadi sales WhatsApp kamu: bales dalam hitungan detik, 24 jam,
            pakai harga dan jadwal yang kamu isi sendiri, tanpa nambah gaji.
          </p>
          {/* Tombolnya selebar layar di HP, bukan dua tombol berdampingan.
              Dua tombol yang membungkus jadi dua baris dengan lebar berbeda
              terbaca sebagai berantakan, dan sasaran selebar layar itu yang
              paling gampang kena jempol. */}
          <div className="mt-6 flex flex-col items-stretch gap-2.5 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-3">
            <Link
              href={keApp("/daftar")}
              className="btn-primary px-6 py-3 text-base sm:w-auto"
            >
              Mulai gratis
            </Link>
            {/* Tombol "chat orangnya" muncul CUMA kalau nomornya sudah diisi.
                Tetangga sebelah menaruhnya sebagai tombol utama, dan itu masuk
                akal: sebagian pemilik usaha di sini tidak percaya mendaftar
                sendiri sebelum bicara dengan manusia. Tapi tombol chat yang
                tidak ada yang membalas jauh lebih merusak daripada tidak ada
                tombolnya, jadi dia menunggu IDENTITAS.waBantuan diisi. */}
            {tautanBantuanWa(
              "Halo, saya mau tanya soal Palwise untuk usaha saya.",
            ) ? (
              <a
                href={
                  tautanBantuanWa(
                    "Halo, saya mau tanya soal Palwise untuk usaha saya.",
                  )!
                }
                target="_blank"
                rel="noreferrer"
                className="btn-ghost px-6 py-3 text-base sm:w-auto"
              >
                Tanya dulu lewat WhatsApp
              </a>
            ) : (
              <a href="#cara" className="btn-ghost px-6 py-3 text-base sm:w-auto">
                Lihat cara kerjanya
              </a>
            )}
          </div>
          <Dua
            hp="Gratis, tanpa kartu kredit. Pasangnya scan QR dari HP kamu."
            lebar="Tanpa kartu kredit. Pasangnya cukup scan QR dari HP kamu, semenit kelar."
            className="mt-4 text-sm text-ink-500"
          />
        </div>

        {/* Wujud produknya ditaruh setinggi mungkin. Orang menilai barang yang
            dilihatnya, bukan barang yang dibacanya. */}
        <div className="relative mt-8 sm:mt-14">
          <div className="absolute inset-x-0 bottom-0 top-1/3 -z-10 rounded-3xl bg-ink-50" />
          <div className="mx-auto max-w-4xl">
            <MockupDashboard />
          </div>
        </div>

        {/* Pintasan, CUMA DI HP.
            Tautan Harga, Fitur, dan Panduan di menu atas semuanya `hidden
            sm:block`, jadi di HP tidak ada satu pun jalan ke bagian tertentu
            selain menggulir seluruh halaman. Orang yang datang cuma mau tahu
            harganya, dan itu golongan yang paling siap membeli, harus melewati
            sepuluh layar dulu. Barisnya digeser ke samping supaya empat
            pintasan tidak jadi empat baris. */}
        <nav
          aria-label="Loncat ke bagian"
          className="thin-scroll -mx-5 mt-7 flex gap-2 overflow-x-auto px-5 pb-1 sm:hidden"
        >
          {[
            ["#cara", "Cara kerjanya"],
            ["#fitur", "Fitur"],
            ["#harga", "Harga"],
            ["#tanya", "Tanya jawab"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="tap-aman shrink-0 whitespace-nowrap rounded-full border border-ink-200 px-4 text-sm text-ink-700"
            >
              {label}
            </a>
          ))}
        </nav>
      </section>

      {/* Fakta cepat. Semuanya sifat produknya sendiri, bukan pengakuan orang
          lain. Kami belum punya pelanggan, jadi tidak ada satu angka pun di
          sini yang mengaku sebagai bukti sosial. */}
      {/* Dua kolom di HP, bukan empat baris bertumpuk. Angka-angka pendek yang
          ditumpuk ke bawah membuang setengah lebar layar dan menambah satu
          layar penuh gulir untuk empat kata. Keterangannya juga dipendekkan:
          di sini tugasnya cuma dilirik, bukan dibaca. */}
      <section className="mx-auto max-w-6xl px-5 pt-10 sm:pt-14">
        {/* Di HP dibatasi garis, bukan cuma dijarakkan.
            Empat angka yang cuma dipisah spasi di layar sempit terbaca sebagai
            satu paragraf yang kebetulan ada angkanya. Garis pemisahnya yang
            bikin mata langsung tahu ini empat hal, bukan satu. */}
        {/* Garisnya dibuat dari gap 1px di atas latar abu, bukan dari divide-x.
            divide-x di grid dua kolom memasang garis kiri juga di baris kedua
            kolom pertama, tepat di atas garis kotaknya sendiri, dan hasilnya
            satu sisi terlihat lebih tebal daripada sisi lain. */}
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-ink-200 bg-ink-200 sm:gap-6 sm:bg-transparent sm:px-6 sm:py-8 lg:grid-cols-4">
          {FAKTA.map((f) => (
            <div key={f.label} className="bg-white p-4 sm:bg-transparent sm:p-0">
              <dt className="text-xl font-bold tracking-tight text-ink-950 sm:text-2xl">
                {f.nilai}
              </dt>
              <dd className="mt-1 text-[13px] leading-snug text-ink-600 sm:text-sm sm:leading-relaxed">
                <span className="sm:hidden">{f.pendek}</span>
                <span className="hidden sm:inline">{f.label}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Di sini tempatnya bukti sosial, dan kami belum punya.

          Halaman jualan pesaing menaruh "dipercaya 3.000+ bisnis" persis di
          posisi ini, dan itu memang bekerja. Mengarang angkanya juga gampang dan
          tidak akan ada yang memeriksa.

          Tapi harga adalah SATU-SATUNYA pembeda kami, dan harga cuma laku kalau
          orangnya percaya angkanya. Sekali satu angka di halaman ini terbukti
          karangan, tidak ada alasan lagi untuk percaya angka yang lain, termasuk
          Rp 199.000 dan janji "berhenti kapan saja tanpa denda".

          Jadi kelemahannya dijadikan tawaran: yang lain minta kamu percaya
          testimoni orang yang tidak kamu kenal, kami minta kamu tidak percaya
          siapa pun dan mengetesnya sendiri. Untuk pemilik usaha di Indonesia yang
          sudah kenyang dijanjikan agensi, itu justru lebih meyakinkan.

          GANTI SELURUH BAGIAN INI begitu ada pelanggan berbayar yang mau bicara.
          Ucapan satu orang sungguhan mengalahkan seluruh paragraf ini.

          TIDAK DIGAMBAR DI HP (10 Agustus 2026, keputusan Kai). Alasannya bukan
          tempat: blok gelap sebesar ini muncul tepat sesudah hero, dan hal
          kedua yang dibaca orang di HP jadi "kami masih baru dan belum punya
          pelanggan". Di layar lebar dia berdampingan dengan bagian lain dan
          terbaca sebagai kejujuran; di layar sempit dia berdiri sendirian
          sebagai satu layar penuh keraguan, sebelum orangnya sempat mengerti
          produknya apa. Menanam ragu sebelum minat itu urutan yang salah.

          Isinya TIDAK hilang: pertanyaan "Udah dipakai siapa aja?" di tanya
          jawab menjawab hal yang sama persis, dengan jujur, tapi cuma kepada
          orang yang memang menanyakannya. */}
      <section className="mx-auto hidden max-w-6xl px-5 pt-12 sm:block sm:pt-16">
        <div className="rounded-2xl border border-ink-900 bg-ink-950 px-5 py-8 sm:px-10 sm:py-10">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-ink-400">Jujur dari awal</p>
            <h2 className="mt-2 text-[22px] font-semibold leading-snug tracking-tight text-white sm:mt-3 sm:text-3xl">
              Kamu nggak perlu percaya kami. Tes aja dulu.
            </h2>
            {/* SATU paragraf, dan sudutnya risiko DIA, bukan situasi kami.

                Versi sebelumnya tiga paragraf yang isinya kami menjelaskan kenapa
                kami tidak punya testimoni dan kenapa kami memilih tidak
                mengarang. Isinya benar dan niatnya baik, tapi itu masalah
                INTERNAL kami, dan pembaca tidak peduli target, umur, atau
                prinsip perusahaan kita. Yang dia pikirkan cuma satu: "kalau ini
                jelek, saya yang malu di depan pelanggan saya."

                Jadi paragrafnya dibalik: bukan "kami belum punya bukti", tapi
                "kamu nggak perlu ambil risiko". Barangnya sama, yang berubah siapa
                yang jadi pusat kalimatnya. */}
            {/* Cuma satu versi: bagian ini memang tidak digambar di HP. */}
            <p className="mt-4 leading-relaxed text-ink-400">
              Kami nggak mau nulis &ldquo;dipercaya 3.000+ bisnis&rdquo; padahal
              nggak ada. Yang kami tawarin lebih enak daripada testimoni orang
              yang kamu nggak kenal: sambungin nomor kamu, tanya dia kayak
              pelanggan yang paling rewel, dan lihat sendiri jawabannya bener
              atau nggak. Kalau nggak cocok, kamu nggak keluar sepeser pun.
            </p>

            {/* Manusianya, bukan cuma produknya.

                Kalau produk, harga, dan mutunya mirip, orang membeli dari orang
                yang dia kenal. Palwise belum punya nama besar dan belum punya
                testimoni, jadi satu-satunya kedekatan yang bisa ditawarkan adalah
                kenyataan bahwa di baliknya ada orang yang bisa dihubungi.

                Tanda tangannya cuma digambar kalau namanya benar-benar diisi.
                Nama orang tidak boleh dikarang, dan catatan bertanda tangan nama
                palsu lebih merusak daripada tidak ada catatan sama sekali. */}
            {/* KECILNYA DIJUAL SEBAGAI AKSES, BUKAN SEBAGAI PERMINTAAN MAAF.
                Diubah 10 Agustus 2026 karena Kai membaca versi lamanya sebagai
                merendahkan diri sendiri, dan dia benar.

                Versi lama: "Palwise dikerjakan sendirian, bukan sama tim
                besar." Kalimat itu menyebut apa yang KURANG dari kami, dan
                menaruhnya di halaman jualan berarti menawarkan alasan untuk
                ragu yang tidak diminta siapa pun. Pembaca juga tidak pernah
                bertanya berapa orang di balik produknya. Yang benar-benar dia
                pikirkan cuma: "kalau nanti macet, ada yang bantuin nggak?"

                Kenyataannya sama persis, cuma disebut dari sisi yang dia
                rasakan: yang membalas orang yang membuat produknya, bukan
                antrean tiket. Itu justru yang tidak bisa ditiru perusahaan
                besar, jadi disebut sebagai kelebihan, bukan sebagai kekurangan.

                Tombol chatnya menempel di situ karena kalimat "chat aja
                langsung" tanpa tautan menyuruh orang menyalin nomor dari
                halaman lain, dan hampir tidak ada yang melakukannya. */}
            {!IDENTITAS.namaPendiri.startsWith("BELUM DIISI") && (
              <div className="mt-6 border-t border-ink-800 pt-6">
                <p className="text-sm leading-relaxed text-ink-500">
                  Yang bales pertanyaan kamu orang yang bikin Palwise-nya
                  langsung, bukan nomor antrean tiket. Ada yang error, aneh, atau
                  kamu butuh dibantuin pasang, tinggal chat.
                </p>
                <p className="mt-2 text-sm font-medium text-ink-300">
                  {IDENTITAS.namaPendiri}
                </p>
                {tautanBantuanWa(
                  "Halo, saya mau tanya soal Palwise untuk usaha saya.",
                ) && (
                  <a
                    href={
                      tautanBantuanWa(
                        "Halo, saya mau tanya soal Palwise untuk usaha saya.",
                      )!
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-white underline underline-offset-4"
                  >
                    <Ikon nama="whatsapp" size={16} />
                    Chat langsung
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Masalah dan jalan keluarnya, disandingkan */}
      <section className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-[22px] font-semibold leading-snug tracking-tight sm:text-3xl">
            Yang hilang bukan chatnya, tapi orderannya
          </h2>
          {/* Contohnya sengaja dari tiga jenis usaha yang berbeda.

              Kalimat "cocok untuk semua bisnis" itu yang bikin halaman jualan
              tumpul, karena tidak ada satu orang pun yang merasa dipanggil.
              Yang bekerja bukan menyebut semua, tapi menyebut beberapa dengan
              sangat spesifik, sampai yang lain ikut mengenali polanya. */}
          <Dua
            hp="Pertanyaannya itu-itu aja. Harga berapa, ready nggak, bisa Sabtu nggak. Tapi yang nggak dibalas dalam sejam biasanya udah beli di tempat lain."
            lebar="Pertanyaannya itu-itu aja. Harga berapa, ready nggak, bisa Sabtu nggak, lokasinya di mana. Gampang semua. Tapi yang nggak dibalas dalam sejam biasanya udah beli di tempat lain, dan kamu nggak pernah tahu berapa banyak."
            className="mt-3 text-[15px] leading-relaxed text-ink-600 sm:text-base"
          />
        </div>

        {/* DI HP CUMA TIGA BARIS TIAP KOLOM.
            Sebelas kalimat panjang bersusun itu bukan perbandingan lagi, itu
            dua daftar bacaan. Yang bekerja di perbandingan justru baris
            pertama, dan sisanya cuma menguatkan. Sisanya tetap ada di layar
            lebar, tempat dua kolom itu berdampingan dan matanya bisa
            membandingkan baris per baris. */}
        <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-ink-200 bg-ink-50 p-5 sm:p-6">
            <p className="text-sm font-semibold text-ink-500">Sekarang</p>
            <ul className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink-700 sm:mt-4">
              {CARA_LAMA.map((t, i) => (
                <li
                  key={t}
                  className={i >= 3 ? "hidden gap-3 sm:flex" : "flex gap-3"}
                >
                  <span className="mt-0.5 shrink-0 text-ink-400">
                    <Ikon nama="silang" size={18} />
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-ink-900 bg-ink-950 p-5 text-ink-300 sm:p-6">
            <p className="text-sm font-semibold text-ink-400">Pakai Palwise</p>
            <ul className="mt-3 space-y-3 text-[15px] leading-relaxed sm:mt-4">
              {CARA_BARU.map((t, i) => (
                <li
                  key={t}
                  className={i >= 3 ? "hidden gap-3 sm:flex" : "flex gap-3"}
                >
                  <span className="mt-0.5 shrink-0 text-white">
                    <Ikon nama="centang" size={18} />
                  </span>
                  <span className="text-white">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Sorotan 1 */}
      <Sorotan
        judul="Yang nanya tengah malam nggak kabur ke sebelah"
        body="Jam setengah dua belas malam pun dia tetep dapet harga, jadwal, dan aturan yang bener. Bukan balasan otomatis yang kaku, tapi jawaban yang nyambung sama pertanyaannya, terus diarahin sampai dia mau pesan."
        bodyHp="Jam setengah dua belas malam pun dia tetep dapet harga dan jadwal yang bener. Bukan balasan otomatis yang kaku, tapi jawaban yang nyambung sampai dia mau pesan."
        catatan="Foto yang dikirim pelanggan juga dibaca, jadi “yang ini berapa kak?” tetep kejawab."
        gambar={<ContohChat />}
      />

      {/* Sorotan 2 */}
      <Sorotan
        balik
        latar
        /* Judulnya soal MALU, bukan soal rugi. Diubah 9 Agustus 2026.

           Orang membeli empat hal: waktu, uang, ketertarikan, dan ketenangan
           pikiran. Halaman ini sudah kuat di waktu dan uang, dan hampir tidak
           menyentuh yang keempat. Padahal keberatan nomor satu di seluruh dokumen
           persona kami bukan soal harga, tapi rasa takut: "nanti AI-nya ngaco
           terus saya malu di depan pelanggan."

           Rugi itu kerugian yang bisa dihitung dan orang bisa menerimanya. Malu
           di depan pelanggan sendiri tidak bisa dihitung dan tidak bisa ditarik
           kembali, dan itu yang benar-benar menahan orang menyalakan asisten di
           nomor usahanya. Jadi yang dijual di sini ketenangan, dan barangnya
           bukan daftar kemampuan tapi daftar LARANGAN. */
        judul="Nggak bakal bikin kamu malu di depan pelanggan"
        body="Dia cuma boleh jawab dari info jualan kamu sendiri, dan dilarang ngarang harga, stok, jadwal, atau nomor rekening. Tempel daftar hargamu, atau cukup kasih alamat website dan biar dia baca sendiri. Catatan lamamu di ChatGPT juga bisa dipindahin ke sini."
        bodyHp="Dia cuma boleh jawab dari info jualan kamu, dan dilarang ngarang harga, stok, jadwal, atau nomor rekening. Yang dia nggak tahu, dilempar ke kamu."
        catatan="Yang dia nggak tahu, dia bilang belum tahu dan lempar ke kamu. Dia juga nggak bisa mastiin jadwal sendiri. Semua batasan ini bisa kamu tes sebelum nomor aslimu disambungin."
        gambar={<MockupInfoBisnis />}
      />

      {/* Sorotan 3 */}
      <Sorotan
        judul="Pembeli lama balik lagi tanpa kamu inget satu-satu"
        body="Habis urusannya beres, pelanggannya ditanya kabar dulu. Terus disapa lagi pas kira-kira waktunya perlu lagi: kopinya udah abis, mobilnya waktunya servis, atau udah waktunya kontrol. Jualan ke yang udah pernah beli itu yang paling murah, dan yang paling sering kelupaan."
        bodyHp="Habis urusannya beres, pelanggannya ditanya kabar. Terus disapa lagi pas kira-kira kopinya udah abis atau mobilnya waktunya servis."
        catatan="Dua jalur terpisah, jadi nanya kabar nggak ngabisin jatah ngajak beli lagi."
        gambar={<MockupSapaLagi />}
      />

      {/* Sorotan 4.

          Janji temu belum pernah muncul di halaman ini sama sekali, padahal
          dia yang paling menentukan buat klinik, salon, bengkel, dan properti.
          Halaman yang menyebut empat bidang itu di daftar bidang usaha tapi
          tidak pernah menunjukkan apa yang mereka dapat itu janji kosong. */}
      <Sorotan
        balik
        latar
        judul="Nggak ada lagi yang batal gara-gara jadwalnya kelewat"
        body="Begitu jamnya disepakati di chat, jadwalnya tercatat sendiri, lengkap dengan buat apa dan lewat mana. Berlaku juga buat meeting online, dan semuanya berderet di satu daftar dari yang paling deket harinya."
        bodyHp="Begitu jamnya disepakati di chat, jadwalnya tercatat sendiri. Semua yang mau datang berderet di satu daftar, dari yang paling deket harinya."
        catatan="Dia nggak bisa lihat kalender kamu, jadi yang dia catat cuma permintaan. Kamu yang mastiin, sekali klik, dan pelanggannya dikabarin sekalian."
        gambar={<MockupJanji />}
      />

      {/* Tombol di TENGAH halaman, bukan cuma di ujung atas dan bawah.

          Sebelum ini orang yang sudah yakin di bagian sorotan harus menggulir
          melewati tiga langkah, tabel harga pembanding, sepuluh fitur, daftar
          bidang usaha, kartu harga, dan delapan tanya jawab sebelum menemukan
          tombol lagi. Menjelaskan terus ke orang yang sudah mau beli itu bukan
          meyakinkan, itu menghalangi.

          Sengaja garis luar, bukan biru penuh. Biru penuhnya sudah dipakai sekali
          di hero, dan dua bidang biru besar di satu halaman membuat tidak ada yang
          jadi utama. */}
      {/* DI HP AJAKAN INI DIBUANG.
          Fungsinya diambil alih tombol yang nempel di dasar layar: dia selalu
          kelihatan, bukan cuma di satu titik gulir. Membiarkan dua-duanya
          berarti satu blok penuh yang mengulang tombol yang sedang menempel
          15px di bawahnya. */}
      <section className="hidden border-t border-ink-200 py-12 sm:block">
        <div className="mx-auto max-w-2xl px-5 text-center">
          <p className="text-lg font-medium leading-relaxed text-ink-900">
            Udah kebayang buat jualan kamu?
          </p>
          {/* KATA "HARGA" TIDAK BOLEH DIPAKAI DUA ARTI DI SATU BLOK.

              Versi pertama berbunyi "Sambungin nomormu, isi harga, terus lihat
              sendiri dia jawabnya gimana", dengan tautan "Lihat harganya dulu"
              tepat di sebelahnya. Dua kali kata "harga", dua arti berbeda: yang
              pertama daftar harga JUALAN DIA, yang kedua harga LANGGANAN KAMI.

              Akibatnya "isi harga" bisa terbaca "masukkan pembayaran", persis di
              blok yang seharusnya meyakinkan orang bahwa ini gratis. Untuk orang
              yang baru pertama kali membaca, salah tafsir di kalimat yang
              mengajaknya mencoba itu mahal: dia mundur karena mengira harus
              bayar dulu, dan tidak akan pernah bertanya.

              Sekarang yang jualannya disebut "daftar harga jualanmu", dan yang
              langganan disebut "paket dan harga langganan". Panjang sedikit,
              tapi tidak ada yang perlu ditebak. */}
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            Nggak usah baca sampai bawah. Sambungin nomormu, tempel daftar harga
            jualanmu, terus lihat sendiri dia jawabnya gimana. Gratis, tanpa
            kartu kredit.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href={keApp("/daftar")} className="btn-ghost px-6 py-3 text-base">
              Coba gratis sekarang
            </Link>
            <a href="#harga" className="px-4 py-3 text-sm text-ink-600 hover:text-ink-900">
              Lihat paket &amp; harga langganan
            </a>
          </div>
        </div>
      </section>

      {/* Cara kerjanya */}
      <section
        id="cara"
        className="scroll-mt-16 border-t border-ink-200 py-12 sm:scroll-mt-20 sm:py-16"
      >
        <div className="mx-auto max-w-5xl px-5">
          <h2 className="text-[22px] font-semibold leading-snug tracking-tight sm:text-3xl">
            Tiga langkah, kelar semenit
          </h2>
          <Dua
            hp="Nggak ada yang perlu diinstal, dan nggak ada daftar ke Meta yang makan waktu berhari-hari."
            lebar="Nggak ada yang perlu diinstal, nggak ada berkas yang diunduh, dan nggak ada daftar ke Meta yang makan waktu berhari-hari."
            className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-600 sm:text-base"
          />

          {/* Di HP tiap langkah jadi satu baris memanjang: gambar di kiri,
              tulisan di kanan. Ditumpuk seperti di layar lebar, tiga langkah
              memakan tiga layar penuh padahal isinya satu kalimat masing
              masing. */}
          <ol className="mt-7 grid gap-5 sm:mt-10 sm:gap-8 sm:grid-cols-3">
            {LANGKAH.map((l, i) => (
              <li key={l.judul} className="flex gap-4 sm:block">
                <div className="flex shrink-0 items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-ink-900 text-white sm:h-11 sm:w-11">
                    <Ikon nama={l.ikon} size={20} />
                  </div>
                  <span className="hidden text-sm font-semibold text-ink-400 sm:inline">
                    Langkah {i + 1}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400 sm:hidden">
                    Langkah {i + 1}
                  </span>
                  <h3 className="font-semibold text-ink-950 sm:mt-4">{l.judul}</h3>
                  <Dua
                    hp={l.pendek}
                    lebar={l.body}
                    className="mt-1 text-sm leading-relaxed text-ink-600 sm:mt-1.5"
                  />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Perbandingan */}
      <section className="border-y border-ink-200 bg-ink-50/60 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-5">
          {/* Sudutnya UANG DIA, bukan struktur biaya kami.

              Versi sebelumnya membuka dengan penjelasan bahwa WhatsApp tidak
              menagih chat yang dimulai pelanggan, jadi biaya kami kecil. Itu
              benar, tapi itu cerita tentang laporan keuangan KAMI, dan tidak ada
              pemilik toko yang peduli soal itu. Dia cuma punya satu pertanyaan
              di bagian ini, dan pertanyaannya sudah pasti negatif: "kalau segini
              murah, apa yang dikurangin?"

              Jadi judulnya menjawab pertanyaan itu langsung, dan alasan biayanya
              disusutkan jadi satu kalimat pendukung, bukan pembukaan. */}
          <h2 className="text-[22px] font-semibold leading-snug tracking-tight sm:text-3xl">
            Murah bukan berarti ada yang dikurangin
          </h2>
          <Dua
            hp="Asistennya sama, jatah balasannya sama, fiturnya sama. Bedanya: chat yang dimulai pelanggan nggak ditagih WhatsApp, dan kami nggak nagih kamu buat hal yang nggak ada biayanya."
            lebar="Kamu dapat asisten yang sama, jatah balasan yang sama, dan semua fiturnya. Bedanya cuma satu: chat yang dimulai pelanggan nggak ditagih WhatsApp sepeser pun selama dibalas dalam 24 jam, dan kami nggak nagih kamu buat hal yang nggak ada biayanya."
            className="mt-3 max-w-3xl text-[15px] leading-relaxed text-ink-600 sm:text-base"
          />

          {/* DI HP TABELNYA DIBONGKAR JADI KARTU.
              Tabel tiga kolom butuh 560px, dan di layar 375px dia jadi tabel
              yang harus digeser ke samping. Begitu digeser, kolom paling kiri
              yang berisi nama barisnya ikut hilang, jadi orangnya melihat dua
              angka tanpa tahu itu angka apa. Isinya sama persis, cuma
              ditumpuk: nama barisnya di atas, angka kami, lalu angka mereka. */}
          <ul className="mt-6 space-y-3 sm:hidden">
            {COMPARISON.map(([label, ours, theirs]) => (
              <li key={label} className="card p-4">
                <p className="text-xs font-medium text-ink-500">{label}</p>
                <div className="mt-2 flex items-start gap-2">
                  <span className="mt-px w-[68px] shrink-0 text-xs font-semibold text-brand-700">
                    Palwise
                  </span>
                  <span className="text-[15px] font-semibold leading-snug text-ink-950">
                    {ours}
                  </span>
                </div>
                <div className="mt-1.5 flex items-start gap-2">
                  <span className="mt-px w-[68px] shrink-0 text-xs text-ink-400">
                    Yang lain
                  </span>
                  <span className="text-sm leading-snug text-ink-500">
                    {theirs}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left">
                  <th className="py-3 pr-4 font-medium text-ink-500"></th>
                  <th className="py-3 pr-4 font-semibold text-brand-700">Palwise</th>
                  <th className="py-3 font-medium text-ink-500">Platform sejenis</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map(([label, ours, theirs]) => (
                  <tr key={label} className="border-b border-ink-200/70">
                    <td className="py-3 pr-4 font-medium text-ink-700">{label}</td>
                    <td className="py-3 pr-4 text-ink-900">{ours}</td>
                    <td className="py-3 text-ink-500">{theirs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 max-w-2xl text-xs leading-relaxed text-ink-500">
            Angka pembanding diambil dari paket publik Cekat.AI:{" "}
            {formatIDR(RIVAL_PRICE)} per bulan untuk{" "}
            {RIVAL_CREDITS.toLocaleString("id-ID")} balasan.
          </p>
        </div>
      </section>

      {/* Fitur */}
      <section
        id="fitur"
        className="mx-auto max-w-6xl scroll-mt-16 px-5 py-12 sm:scroll-mt-20 sm:py-16"
      >
        <h2 className="text-[22px] font-semibold leading-snug tracking-tight sm:text-3xl">
          Yang lain-lainnya, yang ternyata paling kepakai
        </h2>
        <Dua
          hp="Semuanya udah jalan hari ini, dan bisa kamu buktiin sendiri sebelum keluar duit."
          lebar="Bukan daftar panjang biar kelihatan hebat. Semuanya udah jalan hari ini, dan bisa kamu buktiin sendiri sebelum keluar duit."
          className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-600 sm:text-base"
        />

        {/* DI HP JUDULNYA SAJA, DAN BERDUA-DUA.
            Sepuluh fitur lengkap dengan penjelasannya itu 260 kata, sekitar
            empat layar penuh, dan semuanya sudah lewat sesudah orangnya
            melihat empat sorotan bergambar. Judul-judulnya memang sengaja
            ditulis sebagai kalimat utuh yang menyebut hasilnya ("Foto dan
            voice note tetap kejawab"), jadi tanpa penjelasannya pun tetap
            terbaca sebagai janji, bukan sebagai nama fitur.

            Dua kolom, bukan sepuluh baris ke bawah: diukur di layar 375px,
            daftar sebarisnya setinggi 865px dan bentuk petak memotongnya jadi
            sekitar separuh. Bentuk petak juga yang bikin bagian ini kelihatan
            beda dari daftar-daftar lain di halaman ini, dan mata berhenti
            menganggapnya paragraf. Penjelasannya tetap ada di layar lebar,
            tempat empat kolom bikin dia gratis. */}
        <ul className="mt-6 grid grid-cols-2 gap-2.5 sm:hidden">
          {FEATURES.map((f) => {
            const perlu = f.fitur ? paketFitur[f.fitur] : null;
            return (
              <li
                key={f.title}
                className="rounded-xl border border-ink-200 p-3"
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink-900 text-white">
                  <Ikon nama={f.ikon} size={17} />
                </span>
                <span className="mt-2.5 block text-[13px] font-medium leading-snug text-ink-900">
                  {f.title}
                </span>
                {perlu && (
                  <span className="mt-1 block text-[10.5px] font-medium text-ink-500">
                    Mulai paket {perlu}
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-10 hidden gap-x-10 gap-y-8 sm:grid sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => {
            // Nama paketnya diturunkan dari plans.ts. Kalau suatu hari sebuah
            // fitur dipindah ke paket lain, baris ini ikut berubah sendiri.
            const perlu = f.fitur ? paketFitur[f.fitur] : null;
            return (
              <div key={f.title}>
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl border border-ink-200 text-ink-900">
                  <Ikon nama={f.ikon} size={22} />
                </div>
                <h3 className="font-semibold text-ink-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{f.body}</p>
                {/* Abu dan kecil, bukan lencana menyolok. Yang perlu bukan
                    menakut-nakuti, cuma memastikan tidak ada yang membeli
                    Starter karena baris yang ternyata baru ada di Growth. */}
                {perlu && (
                  <p className="mt-2 text-xs font-medium text-ink-500">
                    Mulai paket {perlu}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Bidang usaha */}
      <section className="border-t border-ink-200 bg-ink-950 py-12 text-white sm:py-16">
        <div className="mx-auto max-w-6xl px-5">
          <div className="max-w-2xl">
            <h2 className="text-[22px] font-semibold leading-snug tracking-tight sm:text-3xl">
              Paling kepakai di jualan yang orangnya nanya dulu sebelum beli
            </h2>
            <Dua
              hp="Bukan cuma toko online. Semua yang pembelinya chat dulu sebelum mutusin."
              lebar="Bukan cuma toko online. Klinik, salon, bengkel, properti, tempat les, katering. Semua yang pembelinya chat dulu sebelum mutusin."
              className="mt-3 text-[15px] leading-relaxed text-ink-400 sm:text-base"
            />
          </div>

          {/* DI HP CUMA NAMA BIDANGNYA, dua kolom.
              Contoh pertanyaannya ("Size L ada warna apa aja?") itu bagian yang
              bikin orang mengenali dirinya, dan di layar lebar dia wajib ada.
              Tapi sembilan bidang kali dua baris di layar 375px jadi daftar
              sepanjang layar sendiri, dan di HP tugas bagian ini cuma satu:
              orangnya menemukan bidangnya ada di situ. Itu selesai dalam
              sekali lirik kalau bentuknya petak, bukan paragraf. */}
          <div className="mt-7 grid grid-cols-2 gap-2.5 sm:hidden">
            {BIDANG.map((b) => (
              <div
                key={b.nama}
                className="flex items-center gap-2.5 rounded-xl border border-ink-800 px-3 py-3"
              >
                <span className="shrink-0 text-ink-300">
                  <Ikon nama={b.ikon} size={18} />
                </span>
                <span className="min-w-0 text-[13px] font-medium leading-snug text-white">
                  {b.nama}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-12 hidden gap-x-8 gap-y-9 sm:grid sm:grid-cols-2 lg:grid-cols-3">
            {BIDANG.map((b) => (
              <div key={b.nama} className="flex gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-ink-800 text-white">
                  <Ikon nama={b.ikon} size={22} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-white">{b.nama}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-400">
                    {b.contoh}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Dua
            hp="Nggak ada di daftar ini bukan berarti nggak cocok. Dia belajar dari info yang kamu masukin sendiri, jadi dia ngikutin jualanmu apa pun bidangnya."
            lebar="Nggak ada di daftar ini bukan berarti nggak cocok. Dia belajar dari info yang kamu masukin sendiri, jadi dia ngikutin jualanmu apa pun bidangnya. Yang nggak cocok cuma satu: kalau harganya selalu nego dan nggak ada yang bisa ditulis sebagai aturan."
            className="mt-8 max-w-2xl text-sm leading-relaxed text-ink-500 sm:mt-12"
          />
        </div>
      </section>

      {/* Harga */}
      <section
        id="harga"
        className="scroll-mt-16 border-t border-ink-200 bg-ink-50/60 py-12 sm:scroll-mt-20 sm:py-16"
      >
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-[22px] font-semibold leading-snug tracking-tight sm:text-3xl">
            Harga
          </h2>
          <Dua
            hp="Bayar per bulan, berhenti kapan aja, tanpa denda dan tanpa biaya pasang."
            lebar="Bayar per bulan, berhenti kapan aja, tanpa denda. Nggak ada biaya pasang dan nggak ada kontrak tahunan."
            className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-600 sm:text-base"
          />

          {/* items-stretch + flex-col + mt-auto di tombolnya. Tanpa itu, tiap
              kartu setinggi isinya sendiri, dan empat tombol mendarat di empat
              ketinggian berbeda. Mata membaca ketidaksejajaran itu sebagai
              "belum jadi", bukan sebagai perbedaan isi.

              Baris harga dan baris keterangan juga dikunci tingginya, supaya
              daftar centangnya mulai di garis yang sama di keempat kartu. */}
          {/* DI HP KARTUNYA DIGESER KE SAMPING, BUKAN DITUMPUK.
              Empat kartu harga bertumpuk itu sekitar lima layar penuh, dan
              orang yang mau membandingkan harus mengingat kartu pertama sampai
              kartu keempat. Digeser ke samping, dua kartu yang bersebelahan
              selalu bisa dibandingkan langsung, dan seluruh bagian harga muat
              di satu layar.
              Lebarnya sengaja 82%, bukan 100%: potongan kartu berikutnya yang
              mengintip di tepi kanan itu yang memberi tahu orang bahwa ini bisa
              digeser. Tanpa itu, carousel terbaca sebagai satu kartu saja.
              Tepi kirinya dibleed pakai -mx-5 supaya kartu pertama tetap
              sejajar dengan judulnya, bukan masuk 20px sendirian. */}
          <div className="thin-scroll -mx-5 mt-7 flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:mt-10 sm:grid sm:snap-none sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 sm:grid-cols-2 lg:grid-cols-4">
            {SEMUA_PAKET.map((plan) => (
              <div
                key={plan.id}
                className={`card flex w-[82%] shrink-0 snap-start flex-col p-5 sm:w-auto sm:p-6 ${
                  plan.highlight ? "border-brand-500 ring-1 ring-brand-500" : ""
                }`}
              >
                <div className="flex h-7 items-center justify-between gap-2">
                  <h3 className="font-semibold text-ink-900">{plan.name}</h3>
                  {plan.highlight && (
                    <span className="badge bg-brand-600 text-white">Paling laris</span>
                  )}
                </div>

                <p className="mt-4 flex h-10 items-baseline text-3xl font-bold tracking-tight">
                  {plan.pricePerMonth === 0 ? "Gratis" : formatIDR(plan.pricePerMonth)}
                  {plan.pricePerMonth > 0 && (
                    <span className="text-base font-normal text-ink-500">/bln</span>
                  )}
                </p>
                <p className="mt-1 h-10 text-sm leading-snug text-ink-500">
                  {plan.aiCredits.toLocaleString("id-ID")} balasan
                  {plan.pricePerMonth > 0
                    ? `, jatuhnya ${formatIDR(pricePerReply(plan))} per balasan`
                    : " per bulan, selamanya"}
                </p>

                {/* ISI PAKET TIDAK DIPOTONG DI HP, dan itu keputusan sadar.
                    Sempat dicoba cuma lima baris pertama. Kartunya memang
                    memendek, tapi yang dipotong itu isi barang yang mau dibeli
                    orang, dan Growth jadi kelihatan punya lebih sedikit
                    daripada yang sebenarnya. Lagipula kartunya berjajar ke
                    samping, bukan bertumpuk, jadi yang dibayar cuma tinggi
                    kartu tertinggi SEKALI, bukan empat kali. */}
                <ul className="mt-5 flex-1 space-y-2 border-t border-ink-100 pt-5 text-sm text-ink-700 sm:mt-6 sm:space-y-2.5 sm:pt-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2.5">
                      {/* Hitam, bukan biru. Ini keterangan isi paket, bukan
                          sesuatu yang bisa diklik atau yang sedang dipilih. */}
                      <span className="mt-0.5 shrink-0 text-ink-900">
                        <Ikon nama="centang" size={15} />
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={keApp("/daftar")}
                  className={`mt-6 w-full sm:mt-8 ${plan.highlight ? "btn-primary" : "btn-ghost"}`}
                >
                  {plan.pricePerMonth === 0 ? "Mulai gratis" : `Pilih ${plan.name}`}
                </Link>
              </div>
            ))}
          </div>

          {/* Petunjuk geser, cuma di HP. Potongan kartu di tepi kanan sudah
              memberi tahu sebagian orang, kalimat ini untuk sisanya. */}
          <p className="mt-1 text-xs text-ink-500 sm:hidden">
            Geser ke samping buat lihat paket lainnya.
          </p>

          <Dua
            hp="Ajak temen sesama pemilik usaha. Begitu dia mulai berlangganan, kalian berdua dapet 1 bulan gratis."
            lebar="Ajak temen sesama pemilik usaha. Begitu dia mulai berlangganan, kalian berdua dapet 1 bulan gratis. Bukan pas dia daftar, tapi pas dia beneran bayar, biar nggak ada yang main akun palsu."
            className="mx-auto mt-8 max-w-xl text-sm leading-relaxed text-ink-600 sm:mt-10 sm:text-center"
          />
        </div>
      </section>

      {/* Tanya jawab */}
      <section
        id="tanya"
        className="mx-auto max-w-3xl scroll-mt-16 px-5 py-12 sm:scroll-mt-20 sm:py-16"
      >
        <h2 className="text-[22px] font-semibold leading-snug tracking-tight sm:text-3xl">
          Yang biasanya ditanyain
        </h2>
        <Dua
          hp="Termasuk yang jawabannya kurang enak didenger."
          lebar="Termasuk yang jawabannya kurang enak didenger. Mending kamu tahu sekarang daripada kecewa setelah bayar."
          className="mt-3 text-[15px] leading-relaxed text-ink-600 sm:text-base"
        />

        {/* Panel lipat itu bentuk yang paling cocok buat HP: delapan
            pertanyaan cuma memakan delapan baris sampai ada yang dibuka.
            Yang perlu ditambah cuma luas sentuhnya, karena baris setinggi
            teksnya saja lebih sempit daripada ujung jari. */}
        <div className="mt-6 divide-y divide-ink-200 border-y border-ink-200 sm:mt-8">
          {TANYA_JAWAB.map((qa) => (
            <details key={qa.t} className="group py-1 sm:py-4">
              <summary className="tap-aman flex w-full cursor-pointer list-none items-center justify-between gap-4 py-3 font-medium text-ink-950 sm:py-0">
                <span className="min-w-0">{qa.t}</span>
                <span className="shrink-0 text-lg text-ink-400 transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mb-3 mt-1 text-[15px] leading-relaxed text-ink-600 sm:mb-0 sm:mt-3">
                {qa.j}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Ajakan terakhir.

          Angka balasan gratisnya DITURUNKAN dari daftar paket. Dulu ditulis
          "Seratus balasan" dengan huruf, dan itu jenis kalimat yang paling
          gampang ketinggalan waktu jatahnya diubah: dia tidak akan pernah
          muncul di pencarian angka, dan halaman jualan berakhir menjanjikan
          jatah yang sistemnya sendiri sudah tidak berikan lagi. */}
      <section className="border-t border-ink-200 bg-ink-50/60 py-12 sm:py-16">
        <div className="mx-auto max-w-2xl px-5 text-center">
          <h2 className="text-[22px] font-semibold leading-snug tracking-tight sm:text-3xl">
            Chat yang masuk malam ini, biar dia yang jawab
          </h2>
          <Dua
            hp={`${PLANS.free.aiCredits} balasan gratis tiap bulan, selamanya, tanpa kartu kredit. Cukup buat kamu buktiin sendiri sebelum keluar duit.`}
            lebar={`${PLANS.free.aiCredits} balasan gratis tiap bulan, selamanya, tanpa kartu kredit. Cukup buat kamu buktiin sendiri dia jawabnya bener atau nggak buat jualan kamu, sebelum keluar duit sepeser pun.`}
            className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-ink-600 sm:text-base"
          />
          <div className="mt-6 flex justify-center sm:mt-8">
            <Link
              href={keApp("/daftar")}
              className="btn-primary w-full px-6 py-3 text-base sm:w-auto"
            >
              Mulai gratis
            </Link>
          </div>
          <p className="mt-4 text-sm text-ink-500">
            Nggak perlu ngobrol sama sales dulu, nggak ada demo yang harus
            dijadwalin.
          </p>
        </div>
      </section>

      <KakiHalaman />

      {/* Tombol nempel di dasar layar, cuma di HP. Ditaruh paling akhir supaya
          dia tidak ikut mendorong apa pun: dia melayang di atas halaman, bukan
          bagian dari susunannya. */}
      <AjakanBawah gratis={PLANS.free.aiCredits} />
    </main>
  );
}
