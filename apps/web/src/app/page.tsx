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
  MockupRasa,
  MockupSapaLagi,
} from "@/components/Mockup";
import { KakiHalaman } from "@/components/HalamanTeks";
import { AjakanBawah } from "@/components/AjakanBawah";

/**
 * HALAMAN INI DIBACA DI HP DULU, BARU DI LAPTOP.
 *
 * Pemilik usaha di Indonesia menjalankan usahanya dari HP, dan halaman ini
 * ditemukan lewat tautan yang dibagikan di WhatsApp. Diukur di layar 375px,
 * seluruh halaman ini setara belasan layar penuh tulisan, dan tulisan yang di
 * laptop terbaca sebagai "penjelasan yang teliti" di HP terbaca sebagai tembok.
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
 * Satu ukuran jarak, satu ukuran judul, satu lebar kolom, untuk SEMUA bagian.
 *
 * Sebelum ini tiap bagian menuliskan kelasnya sendiri-sendiri, dan hasilnya
 * empat ukuran jarak antar bagian yang berbeda di satu halaman. Tidak ada yang
 * bisa menyebutkan apa yang salah waktu melihatnya, tapi matanya membaca itu
 * sebagai halaman yang disusun sepotong-sepotong, dan itu persis kesan yang
 * paling mahal buat produk yang minta orang menyerahkan nomor usahanya.
 */
const KOLOM = "mx-auto w-full max-w-6xl px-5 sm:px-8";
const JARAK = "py-14 sm:py-20 lg:py-24";

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
 * Kepala tiap bagian: penanda kecil, judul, satu kalimat.
 *
 * Penanda kecilnya bukan hiasan. Halaman ini panjangnya belasan layar, dan
 * orang tidak membacanya lurus dari atas ke bawah, dia memindainya. Satu atau
 * dua kata di atas judul memberi tahu dia sedang di bagian apa sebelum dia
 * sempat membaca judulnya, jadi dia bisa memutuskan berhenti atau lanjut
 * menggulir tanpa harus membaca dulu.
 */
function KepalaBagian({
  kicker,
  judul,
  hp,
  lebar,
  terang = false,
}: {
  kicker: string;
  judul: React.ReactNode;
  hp?: string;
  lebar?: string;
  /** Dipakai di bagian berlatar gelap, supaya warnanya dibalik. */
  terang?: boolean;
}) {
  return (
    // saat-terlihat: judul bagian naik pelan waktu digulir sampai kelihatan.
    // Murni CSS (animation-timeline), dipagari @supports, dan menghormati
    // prefers-reduced-motion, jadi di browser tanpa dukungan atau yang minta
    // gerak dikurangi dia tampil biasa tanpa apa-apa. Yang di atas lipatan
    // sudah lewat rentang masuknya waktu dimuat, jadi tidak berkedip.
    <div className="saat-terlihat max-w-3xl">
      <p className={`kicker ${terang ? "text-ink-400" : ""}`}>{kicker}</p>
      <h2 className={`judul-bagian mt-3 ${terang ? "text-white" : ""}`}>
        {judul}
      </h2>
      {hp && lebar && (
        <Dua
          hp={hp}
          lebar={lebar}
          className={`teks-bagian ${terang ? "text-ink-400" : ""}`}
        />
      )}
    </div>
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
   * Kenapa ini wajib ada: dua dari daftar ini cuma jalan mulai paket Growth,
   * dan sebelumnya tidak ada satu pun tanda di halaman jualan. Yang paling
   * merugikan justru "yang tanya lalu hilang, dikejar lagi", karena seluruh
   * halaman ini dijual sebagai SALES dan mengejar yang menghilang itu inti
   * janjinya. Orang yang membeli Starter karena baris itu lalu tidak
   * menemukannya berhak merasa dibohongi, dan dia benar.
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
    // Tanpa penanda paket, karena sekarang paket gratis pun dapat. Dan "voice
    // note panjang" diganti angka yang sebenarnya: batasnya dua menit, dan
    // menjanjikan "panjang" ke orang yang lalu mengirim rekaman sepuluh menit
    // itu bohong yang ketahuannya di depan pelanggannya sendiri.
    body: "Pelanggan kirim foto barang sambil nanya \"ini berapa?\", atau voice note sampai 2 menit. Dua-duanya dibaca dan dibalas, termasuk di paket gratis.",
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
  // Dua baris di bawah ini yang membawa lapisan rasa ke halaman jualan.
  //
  // Dua-duanya menyebut HASILNYA buat pemilik toko, bukan mekaniknya. "Membaca
  // emosi pelanggan" itu keterangan teknis yang tidak menjanjikan apa-apa;
  // "kamu tahu duluan siapa yang lagi kesel" itu hal yang dia rasakan besok
  // pagi waktu buka kotak masuknya.
  {
    ikon: "chat" as NamaIkon,
    title: "Kamu tahu duluan siapa yang lagi kesel",
    body: "Yang nadanya mulai berubah ditandain, lengkap sama alasannya. Chat masuk urut dari yang paling perlu kamu pegang, bukan dari yang paling baru.",
  },
  {
    ikon: "catat" as NamaIkon,
    title: "Yang udah mau beli nggak diajak muter-muter",
    body: "Pas orangnya udah bilang mau ambil, dia berhenti nawarin dan langsung ke cara bayarnya. Pas orangnya lagi kesel, jawabannya jadi pendek dan nggak sok akrab.",
  },
  {
    ikon: "pelanggan" as NamaIkon,
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
 * Janji yang bisa ditagih, bukan daftar kemampuan.
 *
 * Bagian ini menggantikan blok gelap lama yang isinya kami menjelaskan kenapa
 * kami belum punya testimoni. Isinya benar, tapi sudutnya salah: itu cerita
 * tentang keadaan KAMI, ditaruh di tempat yang seharusnya menjawab kekhawatiran
 * DIA. Pertanyaan yang benar-benar ada di kepala pemilik toko waktu dia
 * menimbang menyambungkan nomor usahanya cuma empat, dan empat-empatnya ada di
 * bawah ini.
 *
 * ATURANNYA: tiap baris di sini harus hal yang benar-benar ditegakkan kode hari
 * ini, dan harus bisa ditunjukkan kalau ada yang menanyakannya. Ini bagian yang
 * paling gampang dijadikan tempat menempel kalimat yang enak didengar, dan
 * justru di sinilah kalimat yang tidak benar paling mahal.
 */
const JAMINAN: { ikon: NamaIkon; judul: string; body: string }[] = [
  {
    ikon: "kendali",
    judul: "Kamu bisa ambil alih kapan aja",
    body: "Begitu kamu ikut ngetik di chat, asistennya langsung diam dan minggir. Nggak ada balasan yang nyelak di tengah obrolanmu.",
  },
  {
    ikon: "chat",
    judul: "Nggak pernah nyebar pesan",
    body: "Dia cuma bales orang yang chat kamu duluan. Nggak ada blast ke daftar nomor, dan itu penyebab nomor kena batasan yang paling sering.",
  },
  {
    ikon: "info",
    judul: "Dilarang ngarang",
    body: "Harga, stok, jadwal, dan nomor rekening cuma boleh dari info yang kamu isi. Yang dia nggak tahu, dia bilang belum tahu dan lempar ke kamu.",
  },
  {
    ikon: "paket",
    judul: "Berhenti kapan aja",
    body: "Langganan bulanan, tanpa denda, tanpa kontrak tahunan, tanpa biaya pasang. Bulan yang udah kamu bayar tetep jalan sampai habis.",
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
    // Pertanyaan ini WAJIB ada, dan letaknya sengaja sebelum "kalau dia salah
    // jawab gimana".
    //
    // Begitu halaman ini menyebut perasaan, kekhawatiran yang muncul otomatis
    // di kepala pemilik toko bukan "wah canggih" tapi "jangan-jangan AI saya
    // ngambek ke pelanggan waktu saya tidur". Kalau tidak dijawab, dia
    // menjawabnya sendiri ke arah yang paling buruk.
    //
    // Jawabannya JUJUR, dan kejujurannya yang menjual: menyangkal bahwa
    // AI-nya punya perasaan justru menghilangkan satu-satunya alasan orang
    // takut. Jangan pernah diubah jadi "iya, dia punya perasaan".
    t: "AI-nya beneran punya perasaan?",
    j: "Nggak. Yang dia lakuin itu baca nada pesan pelanggan kamu: kata-katanya, berapa lama dia nunggu, berapa pesan yang belum kamu bales. Terus cara jawabnya disesuaiin. Dia sendiri nggak pernah moody, nggak pernah ngambek, dan nggak pernah bawa suasana dari chat sebelah. Faktanya juga tetep dari info yang kamu isi, yang berubah cuma caranya nyampein.",
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
    // terbeli.
    j: "Palwise nyambung lewat Perangkat tertaut, sama kayak WhatsApp Web, jadi chat lama kamu nggak ke mana-mana. Tapi Palwise bukan produk resmi WhatsApp, dan Meta berhak batesin nomor yang dianggap ngelanggar aturan mereka. Palwise cuma bales yang chat duluan dan nggak pernah nyebar pesan, karena itu penyebab paling sering. Kalau nomor itu satu-satunya jalur usahamu, pakai nomor lain yang khusus buat usaha, tapi jangan nomor yang baru banget dibeli: WhatsApp belum kenal nomor baru, jadi malah lebih gampang kena batasan.",
  },
  {
    t: "Data pelanggan saya dipakai buat apa?",
    // KALIMAT INI TIDAK BOLEH MENJANJIKAN LEBIH DARIPADA YANG DIJALANKAN.
    //
    // Dulu di sini tertulis "nggak dibaca karyawan kami". Sejak 10 Agustus 2026
    // halaman founder bisa membuka obrolan untuk membantu dan memperbaiki
    // produk, jadi kalimat itu berubah jadi tidak benar. Halaman jualan yang
    // menjanjikan lebih daripada yang dijalankan itu jenis kebohongan yang
    // paling mahal: yang membacanya baru tahu setelah dia menyambungkan nomor
    // usahanya.
    //
    // 3 September 2026, atas permintaan pemilik produk: kalimat "isi chatnya
    // bisa dibuka tim Palwise" dibuang dari SINI. Yang menggantikannya BUKAN
    // penyangkalan, tapi penunjuk ke halaman privasi, dan itu disengaja.
    // Halaman privasi tetap menulis lengkap siapa yang bisa membuka isi chat,
    // untuk apa, dan bahwa tiap bukaan tercatat. Jadi yang berubah cuma di mana
    // rinciannya dibaca, bukan apa yang benar.
    //
    // YANG TETAP TERLARANG: menulis di sini bahwa isi chat tidak pernah dibuka
    // siapa pun, atau menghapus penunjuk ke halaman privasi sehingga pembaca
    // tidak punya jalan menemukannya. Dua-duanya bikin halaman jualan ini
    // menjanjikan lebih daripada yang dijalankan halaman founder.
    j: "Cuma buat jalanin sales kamu, dan nggak pernah dijual atau dipakai ngelatih AI. Selain itu cuma dipakai buat benerin masalah dan memperbaiki produknya. Siapa aja yang bisa buka isi chat dan gimana tiap bukaan dicatat, rinciannya ada di kebijakan privasi.",
  },
  // Di sini dulu ada "Udah dipakai siapa aja?", yang dijawab dengan mengakui
  // Palwise belum punya pelanggan. Dibuang atas permintaan pemilik produk.
  //
  // ATURANNYA TETAP BERLAKU: tidak menjawabnya boleh, MENGARANG jawabannya
  // tidak. Jangan pernah menaruh testimoni, logo klien, rating, atau angka
  // pemakai karangan di halaman ini. Harga adalah satu-satunya pembeda kami,
  // dan harga cuma laku kalau angkanya dipercaya. Yang menggantikan bagian ini
  // adalah "Bukti yang nggak bisa dikarang" di bawah: orang disuruh mengetes
  // sendiri, bukan disuruh percaya orang yang tidak dia kenal.
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
 * untuk satu kebenaran selalu berakhir sama: keduanya sudah sempat berbeda.
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
  kicker,
  judul,
  body,
  bodyHp,
  catatan,
  gambar,
  balik = false,
  latar = false,
  bingkai = true,
}: {
  kicker: string;
  judul: string;
  body: string;
  /** Versi HP. Isinya sama, kalimat pendukungnya dibuang. */
  bodyHp: string;
  catatan?: string;
  gambar: React.ReactNode;
  balik?: boolean;
  latar?: boolean;
  /**
   * Bingkai putih di sekeliling gambarnya.
   *
   * Benar untuk gambar layar aplikasi: bingkai tipis plus bayangan bikin
   * layarnya terlihat BERDIRI di atas halaman, bukan menempel rata. Salah
   * untuk contoh chat, karena dia sudah punya bingkai sendiri berupa bodi HP,
   * dan HP di dalam kartu putih terbaca sebagai dua bingkai yang bertengkar.
   */
  bingkai?: boolean;
}) {
  return (
    <section
      className={latar ? "border-y border-ink-200 bg-ink-50/70" : "bg-white"}
    >
      <div className={`${KOLOM} ${JARAK}`}>
        <div className="grid items-center gap-8 sm:gap-12 lg:grid-cols-2 lg:gap-16">
          <div className={`saat-terlihat ${balik ? "lg:order-2" : ""}`}>
            <p className="kicker">{kicker}</p>
            <h2 className="judul-bagian mt-3">{judul}</h2>
            <Dua hp={bodyHp} lebar={body} className="teks-bagian" />
            {/* CATATAN KAKI CUMA DI LAYAR LEBAR.
                Isinya syarat dan pengecualian, dan itu memang perlu ada, tapi
                di HP dia menambah satu paragraf lagi tepat sesudah paragraf
                yang baru saja dibaca. Lima sorotan berarti lima paragraf
                tambahan yang tidak menjual apa pun. Semuanya tetap terjawab di
                bagian tanya jawab, dan yang benar-benar teliti membacanya di
                sana. */}
            {catatan && (
              <p className="mt-6 hidden max-w-xl rounded-r-lg border-l-2 border-ink-300 bg-ink-50 py-2.5 pl-4 pr-4 text-[15px] leading-relaxed text-ink-600 sm:block">
                {catatan}
              </p>
            )}
          </div>
          <div
            className={`saat-terlihat flex justify-center ${balik ? "lg:order-1" : ""}`}
          >
            {bingkai ? (
              <div className="w-full rounded-2xl border border-ink-200 bg-white p-1.5 bayangan-produk sm:p-2">
                {gambar}
              </div>
            ) : (
              gambar
            )}
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

      {/* ─── Menu atas ─────────────────────────────────────────────────────
          Menempel, tipis, dan tembus pandang sedikit. Kepala halaman lebih
          pendek di HP: layar HP itu pendek berdiri, dan 64px yang menempel di
          atas terus-terusan memakan bagian layar yang paling mahal. */}
      <header className="sticky top-0 z-40 border-b border-ink-200/70 bg-white/85 backdrop-blur-md">
        <div className={`${KOLOM} flex h-14 items-center justify-between sm:h-16`}>
          <Link href="/" className="shrink-0">
            <LogoNama />
          </Link>

          {/* Tautan bagian ditaruh di TENGAH di layar lebar.
              Menaruhnya menempel di logo bikin sisi kanan penuh sendirian dan
              halamannya terbaca berat sebelah. Di HP semuanya hilang dan
              digantikan baris pintasan di bawah hero. */}
          <nav className="hidden items-center gap-1 text-sm lg:flex">
            <a href="#cara" className="rounded-lg px-3 py-2 text-ink-600 transition hover:bg-ink-50 hover:text-ink-900">
              Cara kerjanya
            </a>
            <a href="#fitur" className="rounded-lg px-3 py-2 text-ink-600 transition hover:bg-ink-50 hover:text-ink-900">
              Fitur
            </a>
            <a href="#harga" className="rounded-lg px-3 py-2 text-ink-600 transition hover:bg-ink-50 hover:text-ink-900">
              Harga
            </a>
            {/* Panduannya ditaruh di menu atas, bukan cuma di kaki halaman.
                Sebagian orang membaca panduan SEBELUM mendaftar, justru untuk
                mengukur apakah dia mampu memasangnya sendiri. Menyembunyikannya
                di kaki halaman berarti yang paling ragu, yang paling butuh
                diyakinkan, tidak pernah menemukannya. */}
            <Link href="/panduan" className="rounded-lg px-3 py-2 text-ink-600 transition hover:bg-ink-50 hover:text-ink-900">
              Panduan
            </Link>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Tombolnya sama untuk semua orang, TIDAK dibedakan sudah masuk
                atau belum.

                Dulu di sini membaca sesi dari cookie untuk menampilkan "Buka
                dashboard". Satu baris itu memaksa SELURUH halaman jualan
                digambar ulang tiap kali ada yang membukanya, karena halaman
                yang membaca cookie tidak bisa disimpan sebagai halaman jadi.
                Padahal isinya sama persis untuk semua orang, dan ini halaman
                yang paling sering dibuka orang asing. */}
            <Link
              href={keApp("/masuk")}
              className="tap-aman rounded-lg px-3 py-2 text-sm text-ink-600 transition hover:bg-ink-50 hover:text-ink-900"
            >
              Masuk
            </Link>
            {/* HITAM, bukan biru. Birunya dipakai satu kali saja, di tombol
                utama hero. Hitam di atas putih itu kontras tertinggi yang ada,
                jadi tombol ini tetap yang paling kelihatan di menu tanpa
                bersaing jadi "tombol utama" halaman. */}
            <Link href={keApp("/daftar")} className="btn-ink">
              Mulai gratis
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-ink-200 bg-white">
        {/* Kisi tipis di belakang, hitam putih, dipudarkan ke tepi. Gunanya
            memberi kedalaman supaya gambar produknya terlihat BERDIRI di atas
            halaman, bukan menempel rata. Tidak ada biru sedikit pun di sini:
            biru disimpan untuk hal yang bisa diklik. */}
        {/* Dipudarkan lagi di HP. Kotak kisinya 72px, dan di layar 375px itu
            cuma lima kotak selebar layar, jadi polanya yang seharusnya jadi
            tekstur malah kelihatan sebagai garis-garis di belakang judul. Di
            layar lebar dia baru terbaca sebagai kedalaman. */}
        <div
          aria-hidden
          className="latar-kisi pointer-events-none absolute inset-0 opacity-50 sm:opacity-100"
        />

        <div
          className={`${KOLOM} relative pb-10 pt-10 sm:pb-20 sm:pt-20 lg:pb-24 lg:pt-24`}
        >
          <div className="mx-auto max-w-4xl text-center">
            {/* LENCANA MENYEBUT PEMBEDA KEDUA, HARGANYA TETAP IKUT.

                Harga itu pembeda kami yang paling kuat DAN yang paling gampang
                disamakan lawan kapan saja. Membaca perasaan pelanggan pembeda
                pertama yang bukan angka, jadi dia disebut duluan. Tapi harganya
                tidak dibuang: di situ kami menang hari ini, dan orang yang
                datang dari pencarian harga tetap harus menemukannya di layar
                pertama.

                Yang SENGAJA TIDAK ditulis: janji bahwa AI-nya punya perasaan.
                Itu janji yang tidak bisa dibuktikan ke siapa pun, dan lebih
                buruk lagi, dia menakuti pembeli kami sendiri: pemilik toko yang
                mendengarnya membayangkan asistennya ngambek ke pelanggan waktu
                dia tidur. */}
            <span className="badge border border-ink-200 bg-white px-3 py-1 text-ink-700 shadow-[0_1px_2px_rgba(15,15,15,0.05)]">
              <span className="mr-0.5 h-1.5 w-1.5 rounded-full bg-brand-600" />
              Ngerti kapan pelanggan lagi kesel · sepertujuh harga sebelah
            </span>

            {/* JUDULNYA ASPIRIN, BUKAN VITAMIN.

                Versi lama "Sales WhatsApp yang gercep 24 jam, tanpa nambah
                gaji" menyebut apa PRODUKNYA, dan produk itu vitamin: bagus
                kalau punya, gampang ditunda. Orang membeli aspirin, obat untuk
                sakit yang sudah terasa sekarang.

                Sakitnya bukan "belum punya sales 24 jam". Tidak ada yang bangun
                pagi merasa kekurangan itu. Yang betulan terasa: dia tahu ada
                yang chat semalam, dan sebagian sudah beli di tempat lain
                sebelum dia sempat balas. Itu uang yang sudah hilang minggu ini.

                "WhatsApp" tetap wajib di judul supaya orang yang datang dari
                pencarian atau dari tautan yang dibagikan teman langsung tahu
                ini kategori apa.

                Pemenggalan barisnya cuma di layar lebar. <br /> yang dipaksakan
                di layar 375px bertabrakan dengan pemenggalan alami browser, dan
                hasilnya baris yang panjangnya loncat-loncat justru di perangkat
                tempat sebagian besar orang membukanya.

                Ukurannya juga turun di HP, bukan cuma ikut lebar: 36px di layar
                375px bikin judul ini empat baris tebal yang memenuhi hampir
                separuh layar pertama, dan tombolnya terdorong ke bawah
                lipatan. */}
            {/* text-balance bikin browser membagi rata panjang tiap barisnya,
                jadi tidak ada lagi baris terakhir berisi satu kata sendirian.
                Judul yang berakhir dengan satu kata menggantung terbaca seperti
                salah ketik, dan itu kalimat pertama yang dibaca orang. */}
            <h1 className="mt-4 text-balance text-[30px] font-bold leading-[1.14] tracking-[-0.03em] text-ink-950 sm:mt-6 sm:text-[46px] sm:leading-[1.08] lg:text-[54px]">
              Ada yang chat WhatsApp kamu jam 11 malam.
              <br className="hidden sm:inline" />{" "}
              <span className="text-ink-400">Besoknya, dia udah beli di sebelah.</span>
            </h1>

            {/* SATU kalimat, bukan dua paragraf.

                Di hero tiap baris tambahan menunda tombolnya, dan tombol yang
                tertunda tidak ditekan. Judul menyebut sakitnya, kalimat ini
                menyebut obatnya, dan urutan itu yang benar: orang harus
                mengenali dirinya dulu sebelum dia peduli kamu jual apa.

                Kalimatnya menyebut PERTANYAAN yang tiap hari masuk ke HP-nya,
                bukan nama halaman dari dalam dashboard. Orang yang baru pertama
                kali mendengar Palwise tidak tahu apa itu istilah produk kita. */}
            {/* Ukurannya turun di HP, bukan cuma ikut lebar layar. Tiap baris
                tambahan di hero menunda tombolnya, dan tombol yang tertunda
                tidak ditekan. */}
            <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-600 sm:mt-7 sm:text-[19px] sm:leading-[1.6]">
              {/* Ditulis dalam SATU baris di kode, jangan dipenggal editor.
                  Selftest mencari frasa "tanpa nambah gaji" utuh di berkas ini,
                  dan penggalan baris JSX di tengah frasa membuatnya gagal
                  menuduh copy yang justru sudah benar. */}
              Palwise jadi sales WhatsApp kamu: bales dalam hitungan detik, 24 jam, pakai harga dan jadwal yang kamu isi sendiri, tanpa nambah gaji.
            </p>

            {/* Tombolnya selebar layar di HP, bukan dua tombol berdampingan.
                Dua tombol yang membungkus jadi dua baris dengan lebar berbeda
                terbaca sebagai berantakan, dan sasaran selebar layar itu yang
                paling gampang kena jempol. */}
            <div className="mt-6 flex flex-col items-stretch gap-2.5 sm:mt-9 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-3">
              <Link href={keApp("/daftar")} className="btn-primary btn-besar">
                Mulai gratis
              </Link>
              {/* Tombol "chat orangnya" muncul CUMA kalau nomornya sudah diisi.
                  Sebagian pemilik usaha di sini tidak percaya mendaftar sendiri
                  sebelum bicara dengan manusia, jadi tombol ini masuk akal.
                  Tapi tombol chat yang tidak ada yang membalas jauh lebih
                  merusak daripada tidak ada tombolnya, jadi dia menunggu
                  IDENTITAS.waBantuan diisi. */}
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
                  className="btn-ghost btn-besar"
                >
                  Tanya dulu lewat WhatsApp
                </a>
              ) : (
                <a href="#cara" className="btn-ghost btn-besar">
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
              dilihatnya, bukan barang yang dibacanya.

              Bingkai putih tipis dengan bayangan dua lapis: satu lapis rapat
              tepat di bawahnya, satu lapis lebar yang samar. Satu bayangan besar
              saja selalu terbaca sebagai stiker yang ditempel, bukan sebagai
              layar yang berdiri di atas halaman. */}
          <div className="relative mx-auto mt-10 max-w-5xl sm:mt-14">
            <div className="rounded-2xl border border-ink-200 bg-white p-1.5 bayangan-produk sm:p-2">
              <MockupDashboard />
            </div>
          </div>

          {/* Pintasan, CUMA DI HP.
              Tautan bagian di menu atas semuanya disembunyikan di layar sempit,
              jadi tanpa baris ini tidak ada satu pun jalan ke bagian tertentu
              selain menggulir seluruh halaman. Orang yang datang cuma mau tahu
              harganya, dan itu golongan yang paling siap membeli, harus
              melewati sepuluh layar dulu. Barisnya digeser ke samping supaya
              empat pintasan tidak jadi empat baris. */}
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
                className="tap-aman shrink-0 whitespace-nowrap rounded-full border border-ink-200 bg-white px-4 text-sm text-ink-700"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {/* ─── Angka-angka ────────────────────────────────────────────────────
          Semuanya sifat produknya sendiri, bukan pengakuan orang lain. Kami
          belum punya pelanggan, jadi tidak ada satu angka pun di sini yang
          mengaku sebagai bukti sosial.

          Bentuknya pita selebar halaman dengan garis pemisah, bukan empat kartu
          melayang. Pita yang menempel di bawah hero itu bentuk yang dipakai
          hampir semua produk mapan, dan alasannya bukan tiru-tiruan: garis
          pemisah tegak bikin mata langsung tahu ini empat hal setara, dan tidak
          ada satu pun yang lebih penting daripada yang lain. */}
      <section className="border-b border-ink-200 bg-ink-50/60">
        <div className={KOLOM}>
          {/* Garis pemisahnya dipasang per kotak, bukan lewat divide-x.
              divide-x di grid dua kolom memasang garis kiri juga di kotak
              pertama baris kedua, tepat di atas garis kotaknya sendiri, dan
              hasilnya satu sisi terlihat lebih tebal daripada sisi lain.

              Grid-nya digeser keluar sejauh padding kotaknya (-mx-4), supaya
              angka di kolom pertama tetap lurus dengan judul-judul di bagian
              lain halaman ini. Satu garis kiri yang bergeser 16px sudah cukup
              bikin halaman terbaca miring, walaupun tidak ada yang bisa
              menyebutkan apa yang salah. */}
          <dl className="-mx-4 grid grid-cols-2 sm:-mx-6 lg:grid-cols-4">
            {FAKTA.map((f, i) => (
              <div
                key={f.label}
                className={`px-4 py-5 sm:px-6 sm:py-9 ${
                  i % 2 === 1 ? "border-l border-ink-200" : ""
                } ${i >= 2 ? "border-t border-ink-200 lg:border-t-0" : ""} ${
                  i > 0 ? "lg:border-l lg:border-ink-200" : ""
                }`}
              >
                <dt className="text-[22px] font-bold tracking-[-0.02em] text-ink-950 sm:text-[30px]">
                  {f.nilai}
                </dt>
                <dd className="mt-1.5 max-w-[26ch] text-[13px] leading-snug text-ink-600 sm:text-sm sm:leading-relaxed">
                  <span className="sm:hidden">{f.pendek}</span>
                  <span className="hidden sm:inline">{f.label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ─── Masalah dan jalan keluarnya, disandingkan ──────────────────────── */}
      <section className={`${KOLOM} ${JARAK}`}>
        <div className="mx-auto max-w-2xl text-center">
          <p className="kicker">Yang bocor tiap minggu</p>
          <h2 className="judul-bagian mt-3">
            Yang hilang bukan chatnya, tapi orderannya
          </h2>
          {/* Contohnya sengaja dari beberapa jenis usaha yang berbeda.
              Kalimat "cocok untuk semua bisnis" itu yang bikin halaman jualan
              tumpul, karena tidak ada satu orang pun yang merasa dipanggil.
              Yang bekerja bukan menyebut semua, tapi menyebut beberapa dengan
              sangat spesifik, sampai yang lain ikut mengenali polanya. */}
          <Dua
            hp="Pertanyaannya itu-itu aja. Harga berapa, ready nggak, bisa Sabtu nggak. Tapi yang nggak dibalas dalam sejam biasanya udah beli di tempat lain."
            lebar="Pertanyaannya itu-itu aja. Harga berapa, ready nggak, bisa Sabtu nggak, lokasinya di mana. Gampang semua. Tapi yang nggak dibalas dalam sejam biasanya udah beli di tempat lain, dan kamu nggak pernah tahu berapa banyak."
            className="teks-bagian mx-auto text-center"
          />
        </div>

        {/* DI HP CUMA TIGA BARIS TIAP KOLOM.
            Sebelas kalimat panjang bersusun itu bukan perbandingan lagi, itu
            dua daftar bacaan. Yang bekerja di perbandingan justru baris
            pertama, dan sisanya cuma menguatkan. Sisanya tetap ada di layar
            lebar, tempat dua kolom itu berdampingan dan matanya bisa
            membandingkan baris per baris. */}
        <div className="mt-9 grid gap-4 sm:mt-12 sm:gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-ink-200 bg-ink-50 p-5 sm:p-7">
            <p className="kicker">Sekarang</p>
            <ul className="mt-4 space-y-3.5 text-[15px] leading-relaxed text-ink-700 sm:mt-5">
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

          <div className="rounded-2xl border border-ink-900 bg-ink-950 p-5 text-white sm:p-7">
            <p className="kicker text-ink-400">Pakai Palwise</p>
            <ul className="mt-4 space-y-3.5 text-[15px] leading-relaxed sm:mt-5">
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
        kicker="Jam berapa pun"
        judul="Yang nanya tengah malam nggak kabur ke sebelah"
        body="Jam setengah dua belas malam pun dia tetep dapet harga, jadwal, dan aturan yang bener. Bukan balasan otomatis yang kaku, tapi jawaban yang nyambung sama pertanyaannya, terus diarahin sampai dia mau pesan."
        bodyHp="Jam setengah dua belas malam pun dia tetep dapet harga dan jadwal yang bener. Bukan balasan otomatis yang kaku, tapi jawaban yang nyambung sampai dia mau pesan."
        catatan="Foto yang dikirim pelanggan juga dibaca, jadi “yang ini berapa kak?” tetep kejawab."
        bingkai={false}
        gambar={<ContohChat />}
      />

      {/* Sorotan 2.

          Judulnya soal MALU, bukan soal rugi. Orang membeli empat hal: waktu,
          uang, ketertarikan, dan ketenangan pikiran. Halaman ini kuat di waktu
          dan uang, dan hampir tidak menyentuh yang keempat, padahal keberatan
          nomor satu di seluruh dokumen persona kami bukan soal harga tapi rasa
          takut: "nanti AI-nya ngaco terus saya malu di depan pelanggan."

          Rugi bisa dihitung dan orang menerimanya. Malu di depan pelanggan
          sendiri tidak bisa dihitung dan tidak bisa ditarik kembali. Jadi yang
          dijual di sini ketenangan, dan barangnya daftar LARANGAN, bukan daftar
          kemampuan. */}
      <Sorotan
        balik
        latar
        kicker="Ketenangan"
        judul="Nggak bakal bikin kamu malu di depan pelanggan"
        body="Dia cuma boleh jawab dari info jualan kamu sendiri, dan dilarang ngarang harga, stok, jadwal, atau nomor rekening. Tempel daftar hargamu, atau cukup kasih alamat website dan biar dia baca sendiri. Catatan lamamu di ChatGPT juga bisa dipindahin ke sini."
        bodyHp="Dia cuma boleh jawab dari info jualan kamu, dan dilarang ngarang harga, stok, jadwal, atau nomor rekening. Yang dia nggak tahu, dilempar ke kamu."
        catatan="Yang dia nggak tahu, dia bilang belum tahu dan lempar ke kamu. Dia juga nggak bisa mastiin jadwal sendiri. Semua batasan ini bisa kamu tes sebelum nomor aslimu disambungin."
        gambar={<MockupInfoBisnis />}
      />

      {/* Sorotan 3 */}
      <Sorotan
        kicker="Pembeli lama"
        judul="Pembeli lama balik lagi tanpa kamu inget satu-satu"
        body="Habis urusannya beres, pelanggannya ditanya kabar dulu. Terus disapa lagi pas kira-kira waktunya perlu lagi: kopinya udah abis, mobilnya waktunya servis, atau udah waktunya kontrol. Jualan ke yang udah pernah beli itu yang paling murah, dan yang paling sering kelupaan."
        bodyHp="Habis urusannya beres, pelanggannya ditanya kabar. Terus disapa lagi pas kira-kira kopinya udah abis atau mobilnya waktunya servis."
        catatan="Dua jalur terpisah, jadi nanya kabar nggak ngabisin jatah ngajak beli lagi."
        gambar={<MockupSapaLagi />}
      />

      {/* Sorotan 4.

          Janji temu itu yang paling menentukan buat klinik, salon, bengkel, dan
          properti. Halaman yang menyebut empat bidang itu di daftar bidang
          usaha tapi tidak pernah menunjukkan apa yang mereka dapat itu janji
          kosong. */}
      <Sorotan
        balik
        latar
        kicker="Janji temu"
        judul="Nggak ada lagi yang batal gara-gara jadwalnya kelewat"
        body="Begitu jamnya disepakati di chat, jadwalnya tercatat sendiri, lengkap dengan buat apa dan lewat mana. Berlaku juga buat meeting online, dan semuanya berderet di satu daftar dari yang paling deket harinya."
        bodyHp="Begitu jamnya disepakati di chat, jadwalnya tercatat sendiri. Semua yang mau datang berderet di satu daftar, dari yang paling deket harinya."
        catatan="Dia nggak bisa lihat kalender kamu, jadi yang dia catat cuma permintaan. Kamu yang mastiin, sekali klik, dan pelanggannya dikabarin sekalian."
        gambar={<MockupJanji />}
      />

      {/* Sorotan 5 — lapisan rasa.
          Judulnya menyebut KEJADIAN yang orang kenali, bukan kemampuan produk.
          "Membaca emosi pelanggan" itu istilah kami; "orang yang udah nunggu 20
          menit" itu kejadian yang tiap pemilik toko pernah alami dari dua sisi.

          Gambarnya sengaja yang paling menjual di halaman ini: satu pertanyaan
          yang sama, dijawab dua cara. Bedanya kelihatan tanpa dijelaskan. */}
      <Sorotan
        kicker="Yang belum ada di tempat lain"
        judul="Orang yang udah nunggu 20 menit nggak dibalas kayak yang baru nyapa"
        body="Dia baca nadanya dari kata-katanya, dari berapa lama orangnya nunggu, dan dari berapa pesan yang belum kamu bales. Yang lagi kesel dijawab pendek dan langsung, tanpa basa-basi. Yang udah mau bayar nggak diajak muter-muter lagi. Yang kelihatan nggak sanggup nggak ditanyain budgetnya."
        bodyHp="Dia baca nadanya dari kata-katanya dan dari berapa lama orangnya nunggu. Yang lagi kesel dijawab pendek dan langsung. Yang udah mau bayar nggak diajak muter-muter."
        catatan="Yang berubah cuma cara jawabnya. Harga, stok, dan jadwal tetep dari info yang kamu isi sendiri, dan dia nggak pernah bawa suasana dari chat sebelah."
        // Dua jendela berdampingan sudah punya bingkainya masing-masing.
        // Ditumpuk lagi di dalam satu kartu putih, hasilnya tiga garis batas
        // bersarang dan yang mau ditunjukkan (bedanya dua balasan) kalah sama
        // kotak-kotaknya.
        bingkai={false}
        gambar={<MockupRasa />}
      />

      {/* ─── Ajakan di tengah halaman ───────────────────────────────────────
          Orang yang sudah yakin di bagian sorotan tidak boleh dipaksa menggulir
          melewati tiga langkah, tabel pembanding, dua belas fitur, daftar
          bidang usaha, kartu harga, dan sembilan tanya jawab sebelum menemukan
          tombol lagi. Menjelaskan terus ke orang yang sudah mau beli itu bukan
          meyakinkan, itu menghalangi.

          DI HP DIBUANG. Fungsinya sudah diambil alih tombol yang nempel di
          dasar layar: dia selalu kelihatan, bukan cuma di satu titik gulir.
          Membiarkan dua-duanya berarti satu blok penuh yang mengulang tombol
          yang sedang menempel 15px di bawahnya. */}
      <section className="hidden border-y border-ink-200 bg-ink-50/60 py-14 sm:block">
        <div className={`${KOLOM} flex flex-wrap items-center justify-between gap-6`}>
          <div className="max-w-xl">
            <p className="text-xl font-semibold tracking-tight text-ink-950">
              Udah kebayang buat jualan kamu?
            </p>
            {/* KATA "HARGA" TIDAK BOLEH DIPAKAI DUA ARTI DI SATU BLOK.

                Versi pertama berbunyi "isi harga" dengan tautan "Lihat harganya
                dulu" tepat di sebelahnya. Dua kali kata "harga", dua arti
                berbeda: yang pertama daftar harga JUALAN DIA, yang kedua harga
                LANGGANAN KAMI. Akibatnya "isi harga" bisa terbaca "masukkan
                pembayaran", persis di blok yang seharusnya meyakinkan orang
                bahwa ini gratis. */}
            <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
              Nggak usah baca sampai bawah. Sambungin nomormu, tempel daftar
              harga jualanmu, terus lihat sendiri dia jawabnya gimana. Gratis,
              tanpa kartu kredit.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Garis luar, bukan biru penuh. Biru penuhnya sudah dipakai sekali
                di hero, dan dua bidang biru besar di satu halaman membuat tidak
                ada yang jadi utama. */}
            <Link href={keApp("/daftar")} className="btn-ghost btn-besar">
              Coba gratis sekarang
            </Link>
            <a
              href="#harga"
              className="px-2 py-3 text-sm font-medium text-ink-600 underline underline-offset-4 hover:text-ink-900"
            >
              Lihat paket &amp; harga langganan
            </a>
          </div>
        </div>
      </section>

      {/* ─── Cara kerjanya ─────────────────────────────────────────────────── */}
      <section id="cara" className="scroll-mt-16 bg-white sm:scroll-mt-20">
        <div className={`${KOLOM} ${JARAK}`}>
          <KepalaBagian
            kicker="Cara kerjanya"
            judul="Tiga langkah, kelar semenit"
            hp="Nggak ada yang perlu diinstal, dan nggak ada daftar ke Meta yang makan waktu berhari-hari."
            lebar="Nggak ada yang perlu diinstal, nggak ada berkas yang diunduh, dan nggak ada daftar ke Meta yang makan waktu berhari-hari."
          />

          {/* Di HP tiap langkah jadi satu baris memanjang: gambar di kiri,
              tulisan di kanan. Ditumpuk seperti di layar lebar, tiga langkah
              memakan tiga layar penuh padahal isinya satu kalimat
              masing-masing.

              Di layar lebar ada garis tipis yang menyambungkan ketiganya, jadi
              matanya tahu ini urutan, bukan tiga hal yang berdiri sendiri. */}
          <ol className="relative mt-9 grid gap-6 sm:mt-14 sm:grid-cols-3 sm:gap-8">
            <div
              aria-hidden
              className="absolute left-0 right-0 top-[22px] hidden border-t border-dashed border-ink-200 sm:block"
            />
            {LANGKAH.map((l, i) => (
              <li key={l.judul} className="relative flex gap-4 sm:block">
                <div className="flex shrink-0 items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl border border-ink-800 bg-ink-950 text-white">
                    <Ikon nama={l.ikon} size={20} />
                  </div>
                  <span className="hidden bg-white pl-1 pr-2 text-sm font-semibold text-ink-400 sm:inline">
                    Langkah {i + 1}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="kicker sm:hidden">Langkah {i + 1}</span>
                  <h3 className="mt-1 font-semibold text-ink-950 sm:mt-5 sm:text-[17px]">
                    {l.judul}
                  </h3>
                  <Dua
                    hp={l.pendek}
                    lebar={l.body}
                    className="mt-1.5 text-sm leading-relaxed text-ink-600"
                  />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ─── Perbandingan harga ────────────────────────────────────────────
          Sudutnya UANG DIA, bukan struktur biaya kami.

          Versi lama membuka dengan penjelasan bahwa WhatsApp tidak menagih chat
          yang dimulai pelanggan, jadi biaya kami kecil. Itu benar, tapi itu
          cerita tentang laporan keuangan KAMI, dan tidak ada pemilik toko yang
          peduli soal itu. Dia cuma punya satu pertanyaan di bagian ini, dan
          pertanyaannya sudah pasti negatif: "kalau segini murah, apa yang
          dikurangin?" */}
      <section className="border-y border-ink-200 bg-ink-950 text-white">
        <div className={`${KOLOM} ${JARAK}`}>
          <KepalaBagian
            terang
            kicker="Kok bisa semurah ini"
            judul="Murah bukan berarti ada yang dikurangin"
            hp="Asistennya sama, jatah balasannya sama, fiturnya sama. Bedanya: chat yang dimulai pelanggan nggak ditagih WhatsApp, dan kami nggak nagih kamu buat hal yang nggak ada biayanya."
            lebar="Kamu dapat asisten yang sama, jatah balasan yang sama, dan semua fiturnya. Bedanya cuma satu: chat yang dimulai pelanggan nggak ditagih WhatsApp sepeser pun selama dibalas dalam 24 jam, dan kami nggak nagih kamu buat hal yang nggak ada biayanya."
          />

          {/* DI HP TABELNYA DIBONGKAR JADI KARTU.
              Tabel tiga kolom butuh 560px, dan di layar 375px dia jadi tabel
              yang harus digeser ke samping. Begitu digeser, kolom paling kiri
              yang berisi nama barisnya ikut hilang, jadi orangnya melihat dua
              angka tanpa tahu itu angka apa. Isinya sama persis, cuma
              ditumpuk. */}
          <ul className="mt-6 space-y-3 sm:hidden">
            {COMPARISON.map(([label, ours, theirs]) => (
              <li
                key={label}
                className="rounded-xl border border-ink-800 bg-ink-900 p-4"
              >
                <p className="text-xs font-medium text-ink-400">{label}</p>
                <div className="mt-2 flex items-start gap-2">
                  <span className="mt-px w-[68px] shrink-0 text-xs font-semibold text-white">
                    Palwise
                  </span>
                  <span className="text-[15px] font-semibold leading-snug text-white">
                    {ours}
                  </span>
                </div>
                <div className="mt-1.5 flex items-start gap-2">
                  <span className="mt-px w-[68px] shrink-0 text-xs text-ink-500">
                    Yang lain
                  </span>
                  <span className="text-sm leading-snug text-ink-400 line-through decoration-ink-600">
                    {theirs}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[560px] border-collapse text-left text-[15px]">
              <thead>
                <tr>
                  <th className="w-1/3 pb-4 pr-4 font-medium text-ink-500"></th>
                  <th className="rounded-t-xl bg-ink-900 px-5 pb-4 pt-4 text-base font-semibold text-white">
                    Palwise
                  </th>
                  <th className="px-5 pb-4 pt-4 text-base font-medium text-ink-400">
                    Platform sejenis
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map(([label, ours, theirs], i) => (
                  <tr key={label}>
                    <td className="border-t border-ink-800 py-4 pr-4 font-medium text-ink-300">
                      {label}
                    </td>
                    <td
                      className={`border-t border-ink-800 bg-ink-900 px-5 py-4 font-semibold text-white ${
                        i === COMPARISON.length - 1 ? "rounded-b-xl" : ""
                      }`}
                    >
                      {ours}
                    </td>
                    <td className="border-t border-ink-800 px-5 py-4 text-ink-400">
                      {theirs}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-5 max-w-2xl text-xs leading-relaxed text-ink-500">
            Angka pembanding diambil dari paket publik Cekat.AI:{" "}
            {formatIDR(RIVAL_PRICE)} per bulan untuk{" "}
            {RIVAL_CREDITS.toLocaleString("id-ID")} balasan.
          </p>
        </div>
      </section>

      {/* ─── Fitur ─────────────────────────────────────────────────────────── */}
      <section id="fitur" className="scroll-mt-16 bg-white sm:scroll-mt-20">
        <div className={`${KOLOM} ${JARAK}`}>
          <KepalaBagian
            kicker="Yang kamu dapat"
            judul="Yang lain-lainnya, yang ternyata paling kepakai"
            hp="Semuanya udah jalan hari ini, dan bisa kamu buktiin sendiri sebelum keluar duit."
            lebar="Bukan daftar panjang biar kelihatan hebat. Semuanya udah jalan hari ini, dan bisa kamu buktiin sendiri sebelum keluar duit."
          />

          {/* DI HP JUDULNYA SAJA, DAN BERDUA-DUA.
              Dua belas fitur lengkap dengan penjelasannya itu sekitar 300 kata,
              empat layar penuh, dan semuanya sudah lewat sesudah orangnya
              melihat lima sorotan bergambar. Judul-judulnya memang sengaja
              ditulis sebagai kalimat utuh yang menyebut hasilnya ("Foto dan
              voice note tetap kejawab"), jadi tanpa penjelasannya pun tetap
              terbaca sebagai janji, bukan sebagai nama fitur.

              Dua kolom, bukan dua belas baris ke bawah: bentuk petak
              memotongnya jadi sekitar separuh, dan bikin bagian ini kelihatan
              beda dari daftar-daftar lain di halaman ini, jadi mata berhenti
              menganggapnya paragraf. */}
          <ul className="mt-7 grid grid-cols-2 gap-2.5 sm:hidden">
            {FEATURES.map((f) => {
              const perlu = f.fitur ? paketFitur[f.fitur] : null;
              return (
                <li key={f.title} className="rounded-xl border border-ink-200 p-3">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink-950 text-white">
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

          <div className="mt-12 hidden gap-5 sm:grid sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              // Nama paketnya diturunkan dari plans.ts. Kalau suatu hari sebuah
              // fitur dipindah ke paket lain, baris ini ikut berubah sendiri.
              const perlu = f.fitur ? paketFitur[f.fitur] : null;
              return (
                <div
                  key={f.title}
                  className="card kartu-angkat flex flex-col p-6"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-xl border border-ink-200 bg-ink-50 text-ink-900">
                    <Ikon nama={f.ikon} size={20} />
                  </div>
                  <h3 className="mt-5 font-semibold text-ink-950">{f.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">
                    {f.body}
                  </p>
                  {/* Abu dan kecil, bukan lencana menyolok. Yang perlu bukan
                      menakut-nakuti, cuma memastikan tidak ada yang membeli
                      Starter karena baris yang ternyata baru ada di Growth. */}
                  {perlu && (
                    <p className="mt-4 text-xs font-medium text-ink-500">
                      Mulai paket {perlu}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Bidang usaha ──────────────────────────────────────────────────── */}
      <section className="border-t border-ink-200 bg-ink-50/70">
        <div className={`${KOLOM} ${JARAK}`}>
          <KepalaBagian
            kicker="Cocok buat siapa"
            judul="Paling kepakai di jualan yang orangnya nanya dulu sebelum beli"
            hp="Bukan cuma toko online. Semua yang pembelinya chat dulu sebelum mutusin."
            lebar="Bukan cuma toko online. Klinik, salon, bengkel, properti, tempat les, katering. Semua yang pembelinya chat dulu sebelum mutusin."
          />

          {/* DI HP CUMA NAMA BIDANGNYA, dua kolom.
              Contoh pertanyaannya ("Size L ada warna apa aja?") itu bagian yang
              bikin orang mengenali dirinya, dan di layar lebar dia wajib ada.
              Tapi sembilan bidang kali dua baris di layar 375px jadi daftar
              sepanjang layar sendiri, dan di HP tugas bagian ini cuma satu:
              orangnya menemukan bidangnya ada di situ. Itu selesai dalam sekali
              lirik kalau bentuknya petak, bukan paragraf. */}
          <div className="mt-8 grid grid-cols-2 gap-2.5 sm:hidden">
            {BIDANG.map((b) => (
              <div
                key={b.nama}
                className="flex items-center gap-2.5 rounded-xl border border-ink-200 bg-white px-3 py-3"
              >
                <span className="shrink-0 text-ink-500">
                  <Ikon nama={b.ikon} size={18} />
                </span>
                <span className="min-w-0 text-[13px] font-medium leading-snug text-ink-900">
                  {b.nama}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-12 hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
            {BIDANG.map((b) => (
              <div
                key={b.nama}
                className="card kartu-angkat flex gap-4 p-5"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-ink-200 bg-ink-50 text-ink-900">
                  <Ikon nama={b.ikon} size={20} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-ink-950">{b.nama}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-600">
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

      {/* ─── Yang kami janjikan ────────────────────────────────────────────
          Bagian ini menggantikan blok gelap lama yang isinya kami menjelaskan
          kenapa kami belum punya testimoni.

          Alasannya bukan bahwa kejujurannya salah, tapi bahwa SUDUTNYA salah:
          blok itu bercerita tentang keadaan kami, ditaruh persis di tempat yang
          seharusnya menjawab kekhawatiran pembacanya. Dan yang dikhawatirkan
          orang yang menimbang menyerahkan nomor usahanya bukan berapa umur
          perusahaan kami, tapi empat hal di bawah ini. */}
      <section className="border-y border-ink-200 bg-white">
        <div className={`${KOLOM} ${JARAK}`}>
          <KepalaBagian
            kicker="Sebelum kamu nyambungin nomor"
            judul="Empat hal yang bisa kamu tagih ke kami"
            hp="Bukan janji manis. Empat-empatnya udah jalan di kodenya hari ini."
            lebar="Bukan janji manis di halaman jualan. Empat-empatnya udah jalan di kodenya hari ini, dan bisa kamu buktiin sendiri sebelum keluar duit sepeser pun."
          />

          <div className="mt-9 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
            {JAMINAN.map((j) => (
              <div key={j.judul} className="card kartu-angkat p-5 sm:p-6">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-ink-950 text-white">
                  <Ikon nama={j.ikon} size={20} />
                </div>
                <h3 className="mt-5 font-semibold text-ink-950">{j.judul}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  {j.body}
                </p>
              </div>
            ))}
          </div>

          {/* ─── Manusianya, bukan cuma produknya ───────────────────────────
              Kalau produk, harga, dan mutunya mirip, orang membeli dari orang
              yang dia kenal. Palwise belum punya nama besar dan belum punya
              testimoni, jadi satu-satunya kedekatan yang bisa ditawarkan adalah
              kenyataan bahwa di baliknya ada orang yang bisa dihubungi.

              KECILNYA DIJUAL SEBAGAI AKSES, BUKAN SEBAGAI PERMINTAAN MAAF.
              Versi lama berbunyi "Palwise dikerjakan sendirian, bukan sama tim
              besar". Kalimat itu menyebut apa yang KURANG dari kami, dan
              menaruhnya di halaman jualan berarti menawarkan alasan untuk ragu
              yang tidak diminta siapa pun. Pembaca juga tidak pernah bertanya
              berapa orang di balik produknya. Yang benar-benar dia pikirkan cuma
              "kalau nanti macet, ada yang bantuin nggak?"

              Tanda tangannya cuma digambar kalau namanya benar-benar diisi. Nama
              orang tidak boleh dikarang, dan catatan bertanda tangan nama palsu
              lebih merusak daripada tidak ada catatan sama sekali. Pola yang
              sama dengan waBantuan. */}
          {!IDENTITAS.namaPendiri.startsWith("BELUM DIISI") && (
            <div className="mt-10 flex flex-col gap-6 rounded-2xl border border-ink-200 bg-ink-50 p-6 sm:mt-14 sm:flex-row sm:items-center sm:gap-10 sm:p-8">
              <div className="min-w-0 flex-1">
                <p className="kicker">Yang ngerjain</p>
                {/* Kalimat penutupnya ikut jalur yang benar-benar ada.
                    "Tinggal chat" waktu tombol chatnya tidak digambar itu janji
                    yang jalannya sudah ditutup, dan orang yang mencari jalan itu
                    lalu tidak menemukannya menyimpulkan hal yang lebih buruk
                    daripada kalau dari awal cuma ditawari email. */}
                <p className="mt-3 text-[17px] font-medium leading-relaxed text-ink-900 sm:text-lg">
                  Yang bales pertanyaan kamu orang yang bikin Palwise-nya
                  langsung, bukan nomor antrean tiket.
                </p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
                  Ada yang error, aneh, atau kamu butuh dibantuin pasang,{" "}
                  {tautanBantuanWa() ? "tinggal chat." : "tinggal email."}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3 border-t border-ink-200 pt-5 sm:border-l sm:border-t-0 sm:pl-10 sm:pt-0">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink-950 text-sm font-semibold text-white">
                  {IDENTITAS.namaPendiri.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-ink-950">
                    {IDENTITAS.namaPendiri}
                  </p>
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
                      className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-ink-600 underline underline-offset-4 hover:text-ink-900"
                    >
                      <Ikon nama="whatsapp" size={15} />
                      Chat langsung
                    </a>
                  ) : (
                    <a
                      href={`mailto:${IDENTITAS.email}`}
                      className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-ink-600 underline underline-offset-4 hover:text-ink-900"
                    >
                      <Ikon nama="info" size={15} />
                      {IDENTITAS.email}
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── Bukti yang tidak bisa dikarang: tes sendiri ────────────────────
          Ini pengganti jujur untuk bagian testimoni, dan letaknya sengaja
          tepat sebelum harga: orang yang baru saja diyakinkan harus langsung
          ketemu tombolnya, bukan digiring melewati satu bagian lagi.

          Palwise belum punya satu pun pelanggan berbayar, jadi tidak ada
          testimoni, logo klien, rating, atau angka pemakai yang boleh
          dipajang. Mengarangnya bukan pilihan: harga adalah SATU-SATUNYA
          pembeda kami, dan harga cuma laku kalau orangnya percaya angkanya.
          Sekali satu angka di halaman ini terbukti karangan, Rp 199.000 dan
          "berhenti kapan saja tanpa denda" ikut kehilangan kepercayaan.

          Jadi kelemahannya dibalik jadi tawaran, dan sudutnya dibuat PERCAYA
          DIRI, bukan meminta maaf: yang lain minta kamu percaya testimoni
          orang yang tidak kamu kenal, kami minta kamu tidak percaya siapa pun
          dan mengetesnya sendiri, gratis, sebelum nomor aslimu disambung. Untuk
          pemilik usaha di Indonesia yang sudah kenyang dijanjikan agensi, itu
          justru lebih meyakinkan daripada testimoni mana pun.

          GANTI dengan ucapan pelanggan sungguhan begitu ada yang mau bicara.
          Satu ucapan orang beneran mengalahkan seluruh bagian ini. */}
      <section className="border-t border-ink-200 bg-white">
        <div className={`${KOLOM} ${JARAK}`}>
          <div className="mx-auto max-w-3xl text-center">
            <p className="kicker">Bukti yang nggak bisa dikarang</p>
            <h2 className="judul-bagian mt-3">
              Tes dia kayak pelanggan paling rewel kamu
            </h2>
            <Dua
              hp="Platform lain pajang “dipercaya ribuan bisnis” yang nggak bisa kamu cek. Palwise ngasih kamu jalan yang lebih meyakinkan: coba sendiri, gratis, sebelum nomor aslimu disambung."
              lebar="Platform lain pajang “dipercaya ribuan bisnis” yang nggak bisa kamu cek. Palwise ngasih kamu jalan yang lebih meyakinkan: buka Coba dulu, tempel daftar hargamu sendiri, dan tanya asistennya kayak pelanggan paling rewel. Kamu nggak lihat testimoni orang lain, kamu lihat dia jualan buat kamu, sebelum nomor aslimu disambung."
              className="teks-bagian mx-auto text-center"
            />
          </div>

          {/* Tiga tes yang bisa dia lakukan sekarang. Fungsinya ganda: dia
              memberi orang cara konkret membuktikan sendiri, DAN menunjukkan
              bahwa kami cukup yakin sama produknya untuk menantang dites di
              titik yang paling gampang gagal. Ketiganya sifat produk yang
              benar-benar ada, bukan janji. */}
          <div className="mx-auto mt-9 grid max-w-4xl gap-4 sm:mt-12 sm:grid-cols-3">
            {[
              {
                ikon: "info" as NamaIkon,
                judul: "Pancing dia ngarang",
                body: "Tanya barang yang harganya belum kamu isi. Dia bakal bilang belum tahu dan lempar ke kamu, bukan ngasal.",
              },
              {
                ikon: "chat" as NamaIkon,
                judul: "Chat pas lagi kesel",
                body: "Ketik kayak orang yang udah nunggu lama. Lihat nadanya berubah jadi pendek dan langsung, tanpa basa-basi.",
              },
              {
                ikon: "gambar" as NamaIkon,
                judul: "Kirim foto barang",
                body: "Foto sambil nanya “ini berapa?”. Lihat dia baca fotonya, bukan bales “pesanmu kosong”.",
              },
            ].map((t) => (
              <div key={t.judul} className="card p-5 text-left sm:p-6">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-ink-200 bg-ink-50 text-ink-900">
                  <Ikon nama={t.ikon} size={20} />
                </div>
                <h3 className="mt-4 font-semibold text-ink-950">{t.judul}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  {t.body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-9 flex flex-col items-stretch gap-3 sm:mt-12 sm:flex-row sm:items-center sm:justify-center">
            <Link href={keApp("/daftar")} className="btn-primary btn-besar sm:w-auto">
              Coba gratis sekarang
            </Link>
            <a
              href="#harga"
              className="btn-ghost btn-besar sm:w-auto"
            >
              Lihat harganya dulu
            </a>
          </div>
          <p className="mt-4 text-center text-sm text-ink-500">
            {PLANS.free.aiCredits} balasan gratis, tanpa kartu kredit. Berhenti
            kapan aja tanpa denda.
          </p>
        </div>
      </section>

      {/* ─── Harga ─────────────────────────────────────────────────────────── */}
      <section id="harga" className="scroll-mt-16 bg-ink-50/70 sm:scroll-mt-20">
        <div className={`${KOLOM} ${JARAK}`}>
          <div className="sm:text-center">
            <p className="kicker">Harga</p>
            <h2 className="judul-bagian mt-3">Bayar bulanan, berhenti kapan aja</h2>
            <Dua
              hp="Tanpa denda, tanpa biaya pasang, tanpa kontrak tahunan."
              lebar="Tanpa denda, tanpa biaya pasang, dan tanpa kontrak tahunan. Naik atau turun paket kapan aja."
              className="teks-bagian sm:mx-auto sm:text-center"
            />
          </div>

          {/* items-stretch + flex-col + mt-auto di tombolnya. Tanpa itu, tiap
              kartu setinggi isinya sendiri, dan empat tombol mendarat di empat
              ketinggian berbeda. Mata membaca ketidaksejajaran itu sebagai
              "belum jadi", bukan sebagai perbedaan isi.

              DI HP KARTUNYA DIGESER KE SAMPING, BUKAN DITUMPUK. Empat kartu
              harga bertumpuk itu sekitar lima layar penuh, dan orang yang mau
              membandingkan harus mengingat kartu pertama sampai kartu keempat.
              Lebarnya sengaja 82%: potongan kartu berikutnya yang mengintip di
              tepi kanan itu yang memberi tahu bahwa ini bisa digeser. Tepi
              kirinya dibleed pakai -mx-5 supaya kartu pertama tetap sejajar
              dengan judulnya. */}
          <div className="thin-scroll -mx-5 mt-9 flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:mt-12 sm:grid sm:snap-none sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 sm:grid-cols-2 lg:grid-cols-4">
            {SEMUA_PAKET.map((plan) => (
              <div
                key={plan.id}
                className={`card relative flex w-[82%] shrink-0 snap-start flex-col p-5 sm:w-auto sm:p-6 ${
                  plan.highlight
                    ? "border-ink-950 bg-white ring-1 ring-ink-950 sm:shadow-[0_12px_32px_-16px_rgba(15,15,15,0.28)]"
                    : ""
                }`}
              >
                <div className="flex h-7 items-center justify-between gap-2">
                  <h3 className="font-semibold text-ink-950">{plan.name}</h3>
                  {plan.highlight && (
                    <span className="badge bg-ink-950 text-white">
                      Paling laris
                    </span>
                  )}
                </div>

                <p className="mt-4 flex h-10 items-baseline text-[30px] font-bold tracking-[-0.03em] text-ink-950">
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

                <Link
                  href={keApp("/daftar")}
                  className={`mt-5 w-full ${plan.highlight ? "btn-ink" : "btn-ghost"}`}
                >
                  {plan.pricePerMonth === 0 ? "Mulai gratis" : `Pilih ${plan.name}`}
                </Link>

                {/* ISI PAKET TIDAK DIPOTONG DI HP, dan itu keputusan sadar.
                    Sempat dicoba cuma lima baris pertama. Kartunya memang
                    memendek, tapi yang dipotong itu isi barang yang mau dibeli
                    orang, dan Growth jadi kelihatan punya lebih sedikit
                    daripada yang sebenarnya. Lagipula kartunya berjajar ke
                    samping, bukan bertumpuk, jadi yang dibayar cuma tinggi
                    kartu tertinggi SEKALI, bukan empat kali.

                    Tombolnya sekarang di ATAS daftar isi, bukan di bawahnya.
                    Daftar isi empat kartu panjangnya berbeda-beda, jadi tombol
                    di bawah selalu mendarat di empat ketinggian yang berbeda
                    kecuali dipaksa dengan flex-1. Di atas, keempatnya sejajar
                    tanpa dipaksa, dan orang yang sudah memutuskan tidak perlu
                    membaca sepuluh baris dulu untuk menemukannya. */}
                <ul className="mt-5 flex-1 space-y-2.5 border-t border-ink-100 pt-5 text-sm text-ink-700">
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
              </div>
            ))}
          </div>

          {/* Petunjuk geser, cuma di HP. Potongan kartu di tepi kanan sudah
              memberi tahu sebagian orang, kalimat ini untuk sisanya. */}
          <p className="mt-2 text-xs text-ink-500 sm:hidden">
            Geser ke samping buat lihat paket lainnya.
          </p>

          <Dua
            hp="Ajak temen sesama pemilik usaha. Begitu dia mulai berlangganan, kalian berdua dapet 1 bulan gratis."
            lebar="Ajak temen sesama pemilik usaha. Begitu dia mulai berlangganan, kalian berdua dapet 1 bulan gratis. Bukan pas dia daftar, tapi pas dia beneran bayar, biar nggak ada yang main akun palsu."
            className="mx-auto mt-9 max-w-xl text-sm leading-relaxed text-ink-600 sm:mt-12 sm:text-center"
          />
        </div>
      </section>

      {/* ─── Tanya jawab ───────────────────────────────────────────────────── */}
      <section id="tanya" className="scroll-mt-16 border-t border-ink-200 bg-white sm:scroll-mt-20">
        <div className={`${KOLOM} ${JARAK}`}>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] lg:gap-16">
            <div>
              <KepalaBagian
                kicker="Tanya jawab"
                judul="Yang biasanya ditanyain"
                hp="Termasuk yang jawabannya kurang enak didenger."
                lebar="Termasuk yang jawabannya kurang enak didenger. Mending kamu tahu sekarang daripada kecewa setelah bayar."
              />
              <p className="mt-6 hidden text-sm leading-relaxed text-ink-600 lg:block">
                Nggak nemu jawabannya?{" "}
                <a
                  href={`mailto:${IDENTITAS.email}`}
                  className="font-medium text-brand-700 underline underline-offset-4"
                >
                  {IDENTITAS.email}
                </a>
              </p>
            </div>

            {/* Panel lipat itu bentuk yang paling cocok buat HP: sembilan
                pertanyaan cuma memakan sembilan baris sampai ada yang dibuka.
                Yang perlu ditambah cuma luas sentuhnya, karena baris setinggi
                teksnya saja lebih sempit daripada ujung jari. */}
            <div className="divide-y divide-ink-200 border-y border-ink-200">
              {TANYA_JAWAB.map((qa) => (
                <details key={qa.t} className="group py-1 sm:py-2">
                  <summary className="tap-aman flex w-full cursor-pointer list-none items-center justify-between gap-4 py-3.5 font-medium text-ink-950 transition hover:text-ink-600">
                    <span className="min-w-0">{qa.t}</span>
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-ink-200 text-base leading-none text-ink-500 transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mb-4 max-w-2xl text-[15px] leading-relaxed text-ink-600">
                    {qa.j}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Ajakan terakhir ───────────────────────────────────────────────
          Angka balasan gratisnya DITURUNKAN dari daftar paket. Dulu ditulis
          "Seratus balasan" dengan huruf, dan itu jenis kalimat yang paling
          gampang ketinggalan waktu jatahnya diubah: dia tidak akan pernah
          muncul di pencarian angka, dan halaman jualan berakhir menjanjikan
          jatah yang sistemnya sendiri sudah tidak berikan lagi. */}
      <section className="relative overflow-hidden border-t border-ink-900 bg-ink-950">
        <div className={`${KOLOM} ${JARAK} relative text-center`}>
          <h2 className="judul-bagian mx-auto max-w-3xl text-white">
            Chat yang masuk malam ini, biar dia yang jawab
          </h2>
          <Dua
            hp={`${PLANS.free.aiCredits} balasan gratis tiap bulan, selamanya, tanpa kartu kredit. Cukup buat kamu buktiin sendiri sebelum keluar duit.`}
            lebar={`${PLANS.free.aiCredits} balasan gratis tiap bulan, selamanya, tanpa kartu kredit. Cukup buat kamu buktiin sendiri dia jawabnya bener atau nggak buat jualan kamu, sebelum keluar duit sepeser pun.`}
            className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-ink-400 sm:text-[17px]"
          />
          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
            <Link
              href={keApp("/daftar")}
              className="btn-primary btn-besar sm:w-auto"
            >
              Mulai gratis
            </Link>
            <Link
              href="/panduan"
              className="btn btn-besar border border-ink-800 bg-transparent text-white hover:bg-ink-900 sm:w-auto"
            >
              Baca panduannya dulu
            </Link>
          </div>
          <p className="mt-5 text-sm text-ink-500">
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
