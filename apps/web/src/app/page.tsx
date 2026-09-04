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
import { SorotanTab, type IsiSorotan } from "@/components/SorotanTab";
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
  /**
   * Dilepas di HP, tetap ada di layar lebar.
   *
   * Dua belas petak di layar 375px itu satu layar penuh sendiri, dan empat di
   * antaranya sudah ditunjukkan lebih baik di tempat lain di halaman yang sama:
   * dengan gambar, dengan contoh chat, atau sebagai langkah pemasangan. Yang
   * dibaca orang di bagian ini cuma judulnya, jadi judul yang mengulang
   * gambar di atasnya tidak menambah apa pun selain jarak ke tombolnya.
   *
   * DIPILIH LEWAT PENANDA, BUKAN LEWAT NOMOR URUT. Memotong pakai indeks
   * berarti begitu ada yang menyusun ulang daftarnya, yang hilang di HP jadi
   * fitur acak, dan tidak ada satu pun galat yang memberi tahu.
   *
   * JANGAN menandai fitur yang cuma ada di paket berbayar. Fitur berbayar yang
   * tidak pernah kelihatan di HP berarti orang membeli paket tanpa tahu apa
   * yang dia beli, dan sebagian besar orang membuka halaman ini dari HP.
   */
  hpSembunyi?: true;
}[] = [
  {
    ikon: "qr" as NamaIkon,
    title: "Mulai jualan dalam semenit",
    body: "Buka WhatsApp di HP, scan QR, kelar. Nggak usah daftar ke Meta dan nunggu berhari-hari.",
    // Bagian "Tiga langkah, kelar semenit" sudah menunjukkan ini utuh, lengkap
    // dengan langkah scan QR-nya, cuma tiga bagian di atas petak ini.
    hpSembunyi: true,
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
    // Sorotan "orang yang udah nunggu 20 menit" menunjukkan ini dengan dua
    // gelembung berdampingan, dan itu jauh lebih meyakinkan daripada judul.
    hpSembunyi: true,
  },
  {
    ikon: "pelanggan" as NamaIkon,
    title: "Calon pembeli tercatat sendiri",
    body: "Nama, nomor, dan apa yang dia cari masuk sendiri dari obrolannya, bukan ketimbun di chat.",
    // Sudah jadi salah satu pasangan sekarang-vs-Palwise di bagian pertama,
    // dengan kalimat yang hampir sama persis.
    hpSembunyi: true,
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
    // Sorotan janji temu sudah menggambar daftarnya, lengkap dengan yang
    // belum dipastikan. Judulnya pun hampir sama kata per kata.
    hpSembunyi: true,
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
    // "Kamu bisa ambil alih kapan aja" SENGAJA DIBUANG dari sini.
    //
    // Janji itu dulu muncul empat kali di satu halaman: tombol di gambar hero,
    // fitur "Kamu masih yang pegang kendali", langkah ini, dan jaminan pertama.
    // Orang yang mau beli sudah yakin di kali pertama; kali keempat cuma bikin
    // halamannya panjang. Yang disisakan dua tempat yang paling menentukan:
    // daftar fitur, dan daftar jaminan tepat sebelum dia menyerahkan nomornya.
    body: "Chat yang masuk dibalas pakai harga dan jadwal yang bener, sampai orangnya mau pesan, dan kamu tetep lihat semuanya.",
    pendek: "Chat masuk dibalas pakai harga dan jadwal yang bener, dan kamu tetep lihat semuanya.",
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
    body: "Begitu kamu ikut ngetik, dia langsung diam dan minggir.",
  },
  {
    ikon: "chat",
    judul: "Nggak pernah nyebar pesan",
    body: "Cuma bales yang chat kamu duluan. Nggak ada blast ke daftar nomor.",
  },
  {
    ikon: "info",
    judul: "Dilarang ngarang",
    body: "Harga, stok, jadwal, dan nomor rekening cuma dari info yang kamu isi.",
  },
  {
    ikon: "paket",
    judul: "Berhenti kapan aja",
    body: "Bulanan, tanpa denda, tanpa kontrak, tanpa biaya pasang.",
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
/**
 * Empat sorotan produk, isi tab di bagian "Yang dia kerjain".
 *
 * TIAP BARIS MAKSIMAL SEKITAR 15 KATA, dan itu batas yang serius, bukan
 * anjuran. Sebelum 4 September 2026 empat hal ini masing-masing punya bagian
 * sendiri lengkap dengan paragraf dan catatan kaki, totalnya sekitar 400 kata.
 * Yang menjual dari keempatnya bukan paragrafnya, tapi gambarnya: satu pesan
 * dijawab dua cara, daftar janji temu yang terisi sendiri, dan seterusnya.
 *
 * Judul tabnya menyebut HASILNYA buat pemilik toko, bukan nama kemampuannya.
 * "Membaca emosi pelanggan" itu istilah kami; "ngerti yang lagi kesel" itu hal
 * yang dia kenali dari kotak masuknya sendiri.
 */
const SOROTAN: IsiSorotan[] = [
  {
    ikon: "chat",
    tab: "Ngerti yang lagi kesel",
    baris:
      "Yang udah nunggu lama dijawab pendek dan langsung, bukan disapa kayak yang baru dateng.",
  },
  {
    ikon: "info",
    tab: "Jawab dari data kamu",
    baris:
      "Harga, stok, dan jadwal cuma dari yang kamu isi. Yang dia nggak tahu, dilempar ke kamu.",
  },
  {
    ikon: "kalender",
    tab: "Janji temu kecatat",
    baris:
      "Jam yang disepakati di chat langsung masuk daftar. Kamu tinggal mastiin.",
  },
  {
    ikon: "sapa",
    tab: "Pembeli lama balik",
    baris:
      "Disapa lagi pas kira-kira kopinya udah abis atau mobilnya waktunya servis.",
  },
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

/**
 * Harga pembanding, dan NAMANYA SENGAJA CUMA ADA DI SINI.
 *
 * Sampai 4 September 2026 halaman jualan menyebut nama pesaingnya
 * terang-terangan, lengkap di tabel pembanding dan di catatan kaki hero. Itu
 * dibuang atas permintaan pemilik produk, dan alasannya benar: halaman jualan
 * kita jadi ikut mengiklankan nama orang lain ke calon pembeli yang tadinya
 * belum pernah dengar nama itu. Sebagian dari mereka akan mencarinya, dan yang
 * mereka temukan halaman dengan testimoni dan "3.000+ bisnis" yang tidak kita
 * punya.
 *
 * Yang tertulis di layar sekarang cuma "platform sejenis". Angkanya TETAP
 * angka sungguhan dan tetap harus bisa dibuktikan kalau ada yang bertanya,
 * makanya sumbernya dicatat di sini, di kode, bukan di halaman:
 *
 *   Diambil 8 Agustus 2026 dari daftar harga publik Cekat.AI, paket yang
 *   memuat 15.000 balasan per bulan.
 *
 * ATURANNYA TETAP: angka ini tidak boleh dikarang, tidak boleh dibulatkan ke
 * atas biar bedanya kelihatan lebih besar, dan kalau harga mereka turun,
 * angka di sini yang ikut turun. Harga satu-satunya pembeda kita, dan pembeda
 * yang angkanya ketahuan dilebihkan berhenti jadi pembeda.
 */
const RIVAL_PRICE = 1_499_000;
const RIVAL_CREDITS = 15_000;

export default async function LandingPage() {
  const growth = PLANS.growth;
  const paketFitur = paketMinimalTiapFitur();

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
            {/* LENCANA MENYEBUT PEMBEDA KEDUA. HARGANYA PINDAH, BUKAN DIBUANG.

                Sampai 4 September 2026 lencana ini berbunyi "Ngerti kapan
                pelanggan lagi kesel · sepertujuh harga sebelah", dan harganya
                cuma hidup di situ: tulisan 12px yang di layar 375px membungkus
                jadi dua baris. Padahal harga itu SELURUH tesis produk ini, satu
                -satunya alasan orang pindah dari sebelah, dan angka sebenarnya
                baru muncul di layar kesebelas.

                Jadi harganya turun satu blok, jadi angka yang bisa dibaca
                (lihat strip di bawah tombol), dan lencana ini tinggal memikul
                pembeda yang bukan angka. Dua-duanya tetap di layar pertama,
                cuma yang paling menjual sekarang berbentuk angka, bukan
                bisikan.

                Yang SENGAJA TIDAK ditulis: janji bahwa AI-nya punya perasaan.
                Itu janji yang tidak bisa dibuktikan ke siapa pun, dan lebih
                buruk lagi, dia menakuti pembeli kami sendiri: pemilik toko yang
                mendengarnya membayangkan asistennya ngambek ke pelanggan waktu
                dia tidur. */}
            <span className="badge border border-ink-200 bg-white px-3 py-1 text-ink-700 shadow-[0_1px_2px_rgba(15,15,15,0.05)]">
              <span className="mr-0.5 h-1.5 w-1.5 rounded-full bg-brand-600" />
              Ngerti kapan pelanggan lagi kesel
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
                /* TOMBOL KEDUA MENGARAH KE BUKTI, BUKAN KE PENJELASAN.

                   Dulu "Lihat cara kerjanya", yang membawa orang ke tiga
                   langkah pemasangan. Itu menjawab pertanyaan yang belum dia
                   punya: dia belum mau tahu cara masangnya, dia masih menimbang
                   apakah barangnya beneran bisa. Yang menjawab itu bagian
                   ngetes sendiri, dan itu aset terkuat halaman ini yang selama
                   ini terkubur di layar keempat belas.

                   Kalimatnya TIDAK boleh berbunyi "tanpa daftar". Halaman Coba
                   dulu ada di dalam dashboard, jadi orangnya tetap harus punya
                   akun. Yang benar dan tetap menjual: dia bisa mengetesnya
                   sepuasnya SEBELUM nomor WhatsApp aslinya disambungkan, dan
                   akunnya sendiri gratis tanpa kartu kredit. */
                <a href="#bukti" className="btn-ghost btn-besar">
                  Tes dulu sebelum nyambungin nomor
                </a>
              )}
            </div>

            <Dua
              hp="Gratis, tanpa kartu kredit. Pasangnya scan QR dari HP kamu."
              lebar="Tanpa kartu kredit. Pasangnya cukup scan QR dari HP kamu, semenit kelar."
              className="mt-4 text-sm text-ink-500"
            />

            {/* ─── Strip harga, DI LAYAR PERTAMA ──────────────────────────
                Harga adalah satu-satunya pembeda kami yang tidak bisa
                dibantah, dan sampai hari ini angkanya baru muncul di layar
                kesebelas. Orang yang datang dari pencarian harga, golongan
                yang paling siap membeli, harus melewati sepuluh layar dulu
                sebelum menemukan alasan dia datang.

                Angka dua-duanya DITURUNKAN, tidak diketik: yang kiri dari
                daftar paket, yang kanan dari RIVAL_PRICE yang juga dipakai
                tabel pembanding di bawah. Dua tempat yang mengetik angka
                sendiri-sendiri selalu berakhir berbeda, dan yang membaca
                tidak punya cara tahu mana yang benar.

                Sumbernya ikut disebut. Angka pembanding yang tidak bisa dicek
                itu persis jenis omongan yang bikin halaman jualan berhenti
                dipercaya, dan kami sedang menjual kepercayaan pada angka. */}
            <div className="mx-auto mt-7 w-full max-w-md sm:mt-9">
              <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-ink-200 bg-white text-left shadow-[0_1px_2px_rgba(15,15,15,0.05)]">
                <div className="px-4 py-3 sm:px-5 sm:py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                    Palwise mulai
                  </p>
                  <p className="mt-1 text-[19px] font-bold tracking-[-0.02em] text-ink-950 sm:text-[22px]">
                    {formatIDR(PLANS.starter.pricePerMonth)}
                  </p>
                  <p className="text-[11.5px] text-ink-500">
                    per bulan · {formatIDR(pricePerReply(growth))} per balasan
                  </p>
                </div>
                <div className="border-l border-ink-200 bg-ink-50/70 px-4 py-3 sm:px-5 sm:py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                    Yang sebelah mulai
                  </p>
                  {/* Dicoret, bukan cuma dikelabukan. Angka yang cuma abu-abu
                      terbaca sebagai keterangan tambahan; angka yang dicoret
                      terbaca sebagai harga yang tidak perlu kamu bayar. */}
                  <p className="mt-1 text-[19px] font-bold tracking-[-0.02em] text-ink-400 line-through decoration-ink-300 sm:text-[22px]">
                    {formatIDR(RIVAL_PRICE)}
                  </p>
                  <p className="text-[11.5px] text-ink-400">
                    per bulan ·{" "}
                    {formatIDR(Math.round(RIVAL_PRICE / RIVAL_CREDITS))} per
                    balasan
                  </p>
                </div>
              </div>
              {/* KEDUA ANGKANYA HARGA TERMURAH MASING-MASING, dan itu wajib
                  ditulis. Paket Rp 199.000 dapat 3.000 balasan, yang sebelah
                  15.000, jadi menyandingkannya begitu saja tanpa keterangan
                  sama dengan membandingkan dua barang yang berbeda. Yang
                  benar-benar sebanding harga per balasannya, dan itu ikut
                  disebut di baris angkanya sendiri.

                  Nama pesaingnya tidak ditulis, cuma "platform sejenis".
                  Sumber angkanya dicatat di komentar RIVAL_PRICE di atas. */}
              <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-500">
                Harga masuk termurah masing-masing, dibanding daftar harga
                publik platform sejenis.
              </p>
            </div>
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

      {/* ─── SATU BUKTI, HAMPIR TANPA TULISAN ────────────────────────────
          Di sini dulu ada dua bagian: daftar "sekarang vs pakai Palwise" lima
          pasang, dan contoh chat jam 23.41. Daftar pasangannya dibuang seluruh
          -nya pada 4 September 2026, dan itu keputusan yang disengaja.

          Alasannya: judul hero sudah menyebut kehilangan yang sama persis
          ("ada yang chat jam 11 malam, besoknya dia udah beli di sebelah").
          Sepuluh kalimat yang mengulang kalimat yang baru dibaca dua layar di
          atasnya tidak menambah keyakinan siapa pun, dia cuma menunda
          tombolnya. Yang tinggal buktinya, dan bukti tidak perlu dijelaskan.

          Pembandingnya diukur hari itu juga: halaman jualan pesaing terdekat
          tingginya mirip dengan punya kita, tapi tulisan yang benar-benar
          digambar cuma sekitar 193 kata, punya kita 1.659. Bedanya bukan
          panjang halaman, tapi bahwa mereka menunjukkan dan kita menjelaskan. */}
      <section className={`${KOLOM} ${JARAK}`}>
        <div className="mx-auto max-w-2xl text-center">
          <p className="kicker">Jam berapa pun</p>
          <h2 className="judul-bagian mt-3">
            Jam 23.41 tokonya udah tutup. Yang nanya tetep dibales.
          </h2>
        </div>

        <div className="saat-terlihat mt-9 flex justify-center sm:mt-12">
          <ContohChat />
        </div>
      </section>

      {/* ─── Empat sorotan jadi satu bagian bertab ───────────────────────
          Dulu empat bagian berturut-turut, masing-masing dengan penanda,
          judul, paragraf, catatan kaki, dan gambar. Sekitar 400 kata dan
          empat layar penuh untuk empat hal yang gambarnya sudah menjelaskan
          dirinya sendiri.

          Keempat gambarnya tetap ada, semua. Yang dibuang paragrafnya. Judul
          tabnya yang jadi janjinya, dan di bawah gambar cuma satu baris.
          Orangnya memilih mau lihat yang mana, bukan digiring melewati empat. */}
      <section className="border-y border-ink-200 bg-ink-50/70">
        <div className={`${KOLOM} ${JARAK}`}>
          <div className="mx-auto max-w-2xl text-center">
            <p className="kicker">Yang dia kerjain</p>
            <h2 className="judul-bagian mt-3">
              Bukan cuma bales. Dia ngurusin jualannya.
            </h2>
          </div>

          <div className="mt-9 sm:mt-12">
            <SorotanTab
              isi={SOROTAN}
              panel={[
                <MockupRasa key="rasa" />,
                <div
                  key="info"
                  className="w-full max-w-2xl rounded-2xl border border-ink-200 bg-white p-1.5 bayangan-produk sm:p-2"
                >
                  <MockupInfoBisnis />
                </div>,
                <div
                  key="janji"
                  className="w-full max-w-2xl rounded-2xl border border-ink-200 bg-white p-1.5 bayangan-produk sm:p-2"
                >
                  <MockupJanji />
                </div>,
                <div
                  key="sapa"
                  className="w-full max-w-2xl rounded-2xl border border-ink-200 bg-white p-1.5 bayangan-produk sm:p-2"
                >
                  <MockupSapaLagi />
                </div>,
              ]}
            />
          </div>
        </div>
      </section>
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

      {/* ─── Fitur dan bidang usaha. SATU BAGIAN, JUDUL SAJA ──────────────
          Dulu dua bagian. Yang pertama dua belas fitur lengkap dengan
          penjelasan tiga baris masing-masing, yang kedua sembilan bidang usaha
          lengkap dengan contoh pertanyaannya. Totalnya sekitar 450 kata untuk
          dua hal yang tugasnya sama-sama satu lirik: "oh, ada yang saya
          butuhin" dan "oh, jualan saya masuk".

          Penjelasan fiturnya dibuang SELURUHNYA, di HP maupun di layar lebar.
          Judulnya memang sengaja ditulis sebagai kalimat utuh yang menyebut
          hasilnya ("Foto dan voice note tetap kejawab"), jadi tanpa
          penjelasannya pun tetap terbaca sebagai janji. Yang penasaran sama
          rincian satu fitur akan menemukannya di panduan atau waktu mencoba,
          dan itu jauh lebih murah daripada memaksa semua orang membaca dua
          belas paragraf yang sembilan di antaranya tidak dia butuhkan.

          Bidang usahanya turun jadi baris keping yang digeser ke samping.
          Contoh pertanyaannya ikut dibuang: dia bagus, tapi tugas bagian ini
          cuma bikin orang menemukan bidangnya ada di daftar. */}
      <section id="fitur" className="scroll-mt-16 bg-white sm:scroll-mt-20">
        <div className={`${KOLOM} ${JARAK}`}>
          <div className="mx-auto max-w-2xl text-center">
            <p className="kicker">Yang kamu dapat</p>
            <h2 className="judul-bagian mt-3">
              Semuanya udah jalan hari ini
            </h2>
          </div>

          {/* DAFTAR BERGARIS, BUKAN DUA BELAS KOTAK.
              Bentuk sebelumnya dua belas kartu berbingkai, masing-masing berisi
              satu ikon kecil di pojok dan satu judul. Karena judulnya ada yang
              satu baris dan ada yang dua, tiap kotak menyisakan ruang kosong
              yang berbeda-beda di bawah tulisannya, dan dua belas kotak yang
              isinya sebagian besar kosong terbaca sebagai halaman yang belum
              jadi. Diukur di layar lebar: sekitar 480px tinggi, dan lebih dari
              separuhnya udara.

              Sekarang satu kotak berisi dua belas baris, dipisah garis rambut.
              Ikonnya duduk di pelat kecil di kiri, judulnya sebaris, penanda
              paketnya jadi keping di kanan. Tidak ada ruang kosong yang bisa
              berbeda-beda, karena tiap baris setinggi isinya sendiri.

              Garisnya dipasang per baris, bukan lewat divide-y. Di petak dua
              kolom, divide-y ikut menggambar garis di atas kolom kanan baris
              pertama, dan hasilnya satu sisi terlihat lebih tebal. */}
          <div className="mt-9 overflow-hidden rounded-2xl border border-ink-200 bg-white sm:mt-12">
            <ul className="grid sm:grid-cols-2">
              {FEATURES.map((f, i) => {
                // Nama paketnya diturunkan dari plans.ts. Kalau suatu hari
                // sebuah fitur dipindah ke paket lain, baris ini ikut berubah
                // sendiri.
                const perlu = f.fitur ? paketFitur[f.fitur] : null;
                return (
                  <li
                    key={f.title}
                    /* Barisnya lebih rapat di HP, dan itu wajib.
                       Di layar lebar daftar ini dua kolom, jadi dua belas baris
                       cuma enam baris tinggi. Di HP dia satu kolom, jadi dua
                       belas baris beneran dua belas, dan dengan ukuran yang
                       sama seperti di laptop bagian ini justru jadi lebih
                       tinggi daripada petak kartu yang digantikannya. Pelat
                       ikonnya mengecil dan jaraknya dirapatkan sampai
                       tingginya kembali sepadan. */
                    className={`flex items-center gap-3 border-ink-100 px-4 py-2.5 sm:px-5 sm:py-4 ${
                      i > 0 ? "border-t" : ""
                    } ${i === 1 ? "sm:border-t-0" : ""} ${
                      i % 2 === 1 ? "sm:border-l" : ""
                    }`}
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-ink-50 text-ink-900 sm:h-9 sm:w-9">
                      <Ikon nama={f.ikon} size={18} />
                    </span>
                    <span className="min-w-0 flex-1 text-[14px] font-medium leading-snug text-ink-900 sm:text-[15px]">
                      {f.title}
                    </span>
                    {perlu && (
                      <span className="shrink-0 rounded-full bg-ink-100 px-2 py-1 text-[10.5px] font-medium leading-none text-ink-600">
                        Mulai paket {perlu}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Bidang usaha: satu baris keping, digeser ke samping.
              Sembilan kartu bergambar itu satu layar penuh untuk pekerjaan
              yang selesai dalam sekali lirik. */}
          <p className="mt-12 text-center text-sm font-medium text-ink-500 sm:mt-16">
            Paling kepakai di jualan yang orangnya nanya dulu sebelum beli
          </p>
          <div className="thin-scroll -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0">
            {BIDANG.map((b) => (
              <span
                key={b.nama}
                className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-ink-200 bg-white px-3.5 py-2 text-[13px] text-ink-700"
              >
                <span className="text-ink-400">
                  <Ikon nama={b.ikon} size={15} />
                </span>
                {b.nama}
              </span>
            ))}
          </div>
        </div>
      </section>
      {/* ─── Ketenangan, jaminan, dan tantangan ngetes. SATU BAGIAN ────────
          Dulu dua bagian berturut-turut, dan dua-duanya menjual barang yang
          sama: ketenangan. Yang pertama empat jaminan, yang kedua tiga kartu
          "coba tes dia". Ditambah gambar Info bisnis yang sekarang sudah jadi
          salah satu tab di bagian "Yang dia kerjain", jadi gambarnya kepajang
          dua kali di satu halaman.

          Sekarang satu bagian: apa yang dia dilarang lakukan, lalu ajakan
          membuktikannya sendiri, lalu tombolnya. Urutan itu yang benar, karena
          jaminan tanpa cara memeriksanya cuma janji, dan bagian ini letaknya
          tepat sebelum harga.

          id="bukti" dituju tombol kedua di hero, jadi jangan diganti namanya
          tanpa mengganti tombolnya juga. */}
      <section
        id="bukti"
        className="scroll-mt-16 border-y border-ink-200 bg-white sm:scroll-mt-20"
      >
        <div className={`${KOLOM} ${JARAK}`}>
          {/* Judulnya soal MALU, bukan soal rugi. Rugi bisa dihitung dan orang
              menerimanya. Malu di depan pelanggan sendiri tidak bisa dihitung
              dan tidak bisa ditarik kembali, dan itu keberatan nomor satu di
              seluruh dokumen persona kami, bukan harga. */}
          <div className="mx-auto max-w-2xl text-center">
            <p className="kicker">Sebelum kamu nyambungin nomor</p>
            <h2 className="judul-bagian mt-3">
              Nggak bakal bikin kamu malu di depan pelanggan
            </h2>
          </div>

          <div className="mt-9 grid gap-3 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
            {JAMINAN.map((j) => (
              <div
                key={j.judul}
                className="flex gap-3 rounded-xl border border-ink-200 bg-white p-4 lg:flex-col lg:gap-0 lg:p-5"
              >
                <span className="mt-0.5 shrink-0 text-ink-900 lg:mt-0">
                  <Ikon nama={j.ikon} size={20} />
                </span>
                <div className="min-w-0 lg:mt-4">
                  <h3 className="text-[15px] font-semibold text-ink-950">
                    {j.judul}
                  </h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-600">
                    {j.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* PENGGANTI JUJUR UNTUK TESTIMONI, dan sudutnya PERCAYA DIRI bukan
              minta maaf: yang lain minta kamu percaya orang yang tidak kamu
              kenal, kami minta kamu tidak percaya siapa pun dan mengetesnya
              sendiri sebelum nomor aslimu disambung.

              Tiga kartu "cara ngetesnya" dibuang. Orang yang sudah sampai
              sini tidak butuh diajari cara mengetik pertanyaan; dia butuh
              tombolnya. GANTI SELURUH BLOK INI dengan ucapan pelanggan
              sungguhan begitu ada yang mau bicara. */}
          <div className="mt-12 rounded-2xl border border-ink-200 bg-ink-50 p-6 text-center sm:mt-16 sm:p-10">
            <p className="mx-auto max-w-xl text-[17px] font-medium leading-relaxed text-ink-900 sm:text-xl">
              Jangan percaya kami. Tes dia kayak pelanggan paling rewel kamu,
              gratis, sebelum nomor aslimu disambung.
            </p>
            <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
              <Link
                href={keApp("/daftar")}
                className="btn-primary btn-besar sm:w-auto"
              >
                Coba gratis sekarang
              </Link>
              <a href="#harga" className="btn-ghost btn-besar sm:w-auto">
                Lihat harganya dulu
              </a>
            </div>
            <p className="mt-4 text-sm text-ink-500">
              {PLANS.free.aiCredits} balasan gratis, tanpa kartu kredit.
            </p>
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

          {/* ─── "Murah bukan berarti ada yang dikurangin", SATU BARIS ──────
              Ini sisa dari satu bagian penuh berlatar hitam yang dibuang pada
              4 September 2026. Bagian itu punya judul, anak judul, tabel tiga
              baris, versi kartu untuk HP, dan catatan kaki: sekitar 120 kata
              untuk menjawab satu pertanyaan.

              Pertanyaannya sendiri WAJIB tetap dijawab, dan itu sebabnya baris
              ini ada. Untuk barang yang harganya sepertujuh sebelah, keberatan
              yang otomatis muncul bukan "mahal" tapi "pasti ada yang jelek".
              Halaman harga yang tidak menjawab itu meninggalkan orangnya
              menjawab sendiri, dan dia selalu menjawab ke arah yang paling
              buruk.

              Yang diklaim cuma satu, dan cuma karena kode menegakkannya:
              modelnya dibaca dari satu tetapan env dan tidak pernah dipilih
              berdasarkan paket. Jangan tambahkan klaim jatah atau fitur yang
              sama di sini; dua-duanya tidak benar dan selftest melarangnya. */}
          <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-ink-600 sm:text-center">
            Kok bisa semurah ini? Karena AI yang bales pelanggan kamu sama
            persis di semua paket, termasuk yang gratis. Yang beda cuma jatah
            balasan dan beberapa tambahan.
          </p>

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
              /* KARTU YANG DISARANKAN JADI HITAM PENUH, bukan putih bergaris.
                 Sebelum ini keempat kartunya putih semua, dan yang disarankan
                 cuma dibedakan garis tepi hitam setebal 1px plus bayangan
                 tipis. Di layar HP, tempat kartunya digeser satu-satu, beda
                 setipis itu praktis tidak ada: orangnya melihat empat kartu
                 yang sama dan harus membaca keempatnya untuk memutuskan.

                 Halaman harga yang tidak menyarankan apa pun memindahkan
                 seluruh pekerjaan memilih ke pembacanya, dan sebagian orang
                 menyelesaikan pekerjaan itu dengan menutup tab. Satu bidang
                 hitam di antara tiga putih menjawabnya sebelum dibaca.

                 Hitam, bukan biru. Biru disimpan untuk tombol yang
                 menyelesaikan tujuan halaman, dan satu bidang biru sebesar ini
                 akan bersaing dengan tombol daftar di bagian lain. */
              <div
                key={plan.id}
                className={`relative flex w-[82%] shrink-0 snap-start flex-col rounded-xl border p-5 sm:w-auto sm:p-6 ${
                  plan.highlight
                    ? "border-ink-950 bg-ink-950 sm:shadow-[0_16px_40px_-20px_rgba(15,15,15,0.45)]"
                    : "border-ink-200 bg-white"
                }`}
              >
                {/* Nama paketnya kecil dan huruf besar semua, bukan judul
                    tebal. Yang harus dibaca duluan angkanya, dan nama paket
                    setebal harga bikin mata harus memilih dua kali. */}
                <div className="flex min-h-[24px] items-center justify-between gap-2">
                  <h3
                    className={`text-[12px] font-semibold uppercase tracking-[0.08em] ${
                      plan.highlight ? "text-ink-400" : "text-ink-500"
                    }`}
                  >
                    {plan.name}
                  </h3>
                  {plan.highlight && (
                    <span className="badge bg-white text-ink-950">
                      Paling laris
                    </span>
                  )}
                </div>

                {/* min-h, bukan h. Tingginya tetap seragam supaya empat
                    tombolnya sejajar, tapi tulisan yang kepanjangan tidak
                    terpotong diam-diam. */}
                <p
                  className={`mt-3.5 flex min-h-[38px] items-baseline text-[30px] font-bold tracking-[-0.03em] ${
                    plan.highlight ? "text-white" : "text-ink-950"
                  }`}
                >
                  {plan.pricePerMonth === 0 ? "Gratis" : formatIDR(plan.pricePerMonth)}
                  {plan.pricePerMonth > 0 && (
                    <span
                      className={`text-base font-normal ${
                        plan.highlight ? "text-ink-400" : "text-ink-500"
                      }`}
                    >
                      /bln
                    </span>
                  )}
                </p>
                <p
                  className={`mt-1 min-h-[40px] text-sm leading-snug ${
                    plan.highlight ? "text-ink-400" : "text-ink-500"
                  }`}
                >
                  {plan.aiCredits.toLocaleString("id-ID")} balasan
                  {plan.pricePerMonth > 0
                    ? `, jatuhnya ${formatIDR(pricePerReply(plan))} per balasan`
                    : " per bulan, selamanya"}
                </p>

                {/* Di kartu hitam tombolnya putih penuh. btn-ghost di atas
                    latar hitam cuma menggambar garis abu di atas hitam, dan
                    tombol yang paling ingin diklik jadi yang paling samar. */}
                <Link
                  href={keApp("/daftar")}
                  className={`mt-5 w-full ${
                    plan.highlight
                      ? "btn bg-white text-ink-950 hover:bg-ink-100"
                      : "btn-ghost"
                  }`}
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
                <ul
                  className={`mt-5 flex-1 space-y-2.5 border-t pt-5 text-sm ${
                    plan.highlight
                      ? "border-ink-800 text-ink-300"
                      : "border-ink-100 text-ink-700"
                  }`}
                >
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2.5">
                      {/* Hitam, bukan biru. Ini keterangan isi paket, bukan
                          sesuatu yang bisa diklik atau yang sedang dipilih.
                          Di kartu hitam dibalik jadi putih, dengan alasan yang
                          sama: kontras tertinggi terhadap latarnya. */}
                      <span
                        className={`mt-0.5 shrink-0 ${
                          plan.highlight ? "text-white" : "text-ink-900"
                        }`}
                      >
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
