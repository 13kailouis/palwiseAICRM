/**
 * Ikon Palwise.
 *
 * Digambar sendiri, bukan dari paket ikon. Alasannya bukan supaya beda, tapi
 * supaya semuanya benar-benar satu keluarga: satu ketebalan garis, satu jenis
 * ujung, satu ukuran grid.
 *
 * Aturannya:
 * - Grid 24, garis 2, ujung dan sambungan bulat, tanpa isian.
 * - Mewarisi warna teks lewat `currentColor`, jadi tidak pernah membawa warna
 *   sendiri. Ikon berwarna di menu cuma jadi kembang api yang menarik mata ke
 *   tempat yang salah.
 * - Bentuknya harus bisa dikenali pemilik toko, bukan cuma bagus. Ikon yang
 *   tidak dikenali itu lebih buruk daripada tanpa ikon: tetap memakan
 *   perhatian, tapi tidak membantu mengenali apa pun.
 *
 * Yang lama (▤ ◍ ◎ ✦ ▧ ▨ ◈ ▷ ◇ ○) diganti karena persis masalah itu. Tidak ada
 * satu pun bentuk itu yang berarti apa-apa buat orang yang bukan perancang.
 */

export type NamaIkon =
  | "ringkasan"
  | "chat"
  | "pelanggan"
  | "asisten"
  | "info"
  | "gambar"
  | "whatsapp"
  | "coba"
  | "paket"
  | "akun"
  | "keluar"
  // Untuk halaman jualan
  | "qr"
  | "suara"
  | "kirim"
  | "kendali"
  | "catat"
  | "jam"
  | "banyakNomor"
  | "sapa"
  // Bidang usaha
  | "kopi"
  | "skincare"
  | "fashion"
  | "klinik"
  | "properti"
  | "kursus"
  | "servis"
  | "kalender"
  | "centang"
  | "silang"
  | "berkas"
  | "website"
  | "salin"
  | "amplop"
  | "gembok"
  | "unggah";

const GAMBAR: Record<NamaIkon, React.ReactNode> = {
  // Bidang-bidang halaman, cara paling umum menggambarkan "ringkasan".
  ringkasan: (
    <>
      <rect x="3" y="3" width="7.5" height="8.5" rx="1.8" />
      <rect x="13.5" y="3" width="7.5" height="5" rx="1.8" />
      <rect x="13.5" y="10.5" width="7.5" height="10.5" rx="1.8" />
      <rect x="3" y="14.5" width="7.5" height="6.5" rx="1.8" />
    </>
  ),

  // Balon percakapan dengan ekor di kiri bawah.
  chat: (
    <path d="M6 4h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-6l-5 4v-4H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
  ),

  // Dua orang: satu di depan, satu menyembul di belakang.
  pelanggan: (
    <>
      <circle cx="9.5" cy="8" r="3.5" />
      <path d="M3.5 19.5v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1" />
      <path d="M15.5 5a3.5 3.5 0 0 1 0 6" />
      <path d="M17 14.7a4 4 0 0 1 3.5 4v.8" />
    </>
  ),

  // Headset. Sengaja bukan bintang atau robot: yang dikerjakan halaman ini
  // adalah melayani pelanggan, dan bintang sudah jadi klise "ini AI".
  asisten: (
    <>
      <path d="M4 13.5v-1.5a8 8 0 0 1 16 0v1.5" />
      <rect x="2" y="12.5" width="4.5" height="7" rx="2.25" />
      <rect x="17.5" y="12.5" width="4.5" height="7" rx="2.25" />
    </>
  ),

  // Buku terbuka dengan baris tulisan.
  info: (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2V5Z" />
      <path d="M4 19a2 2 0 0 0 2 2h13" />
      <path d="M8 7.5h7" />
      <path d="M8 11h5" />
    </>
  ),

  // Bingkai foto dengan matahari dan bukit.
  gambar: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="M3.5 17l4-3.6a2 2 0 0 1 2.7 0L15 18" />
      <path d="M14 14.4l1.6-1.4a2 2 0 0 1 2.7 0l2.2 2" />
    </>
  ),

  // Siluet WhatsApp: balon bulat dengan ekor di kiri bawah, plus gagang telepon.
  // Bentuknya dikenali orang bahkan tanpa warna hijaunya.
  whatsapp: (
    <>
      <path d="M20.5 11.8a8.7 8.7 0 0 1-13 7.5L3 20.7l1.5-4.4A8.7 8.7 0 1 1 20.5 11.8Z" />
      <path d="M8.7 8.2c.5-.4 1.2-.3 1.6.2l.9 1.3c.3.4.2 1-.2 1.3l-.5.4c.4.9 1.1 1.6 2 2l.4-.5c.3-.4.9-.5 1.3-.2l1.3.9c.5.4.6 1.1.2 1.6-.8 1-2.2 1.1-3.7.3a9.6 9.6 0 0 1-3.6-3.6c-.8-1.5-.7-2.9.3-3.7Z" />
    </>
  ),

  // Tombol putar: ini halaman untuk mencoba, jadi bentuknya kata kerja.
  coba: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M10.2 8.6l5.4 3.4-5.4 3.4V8.6Z" />
    </>
  ),

  // Kartu, bentuk yang orang kenali sebagai urusan bayar-membayar.
  paket: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 9.8h19" />
      <path d="M6.5 14.6h3.5" />
    </>
  ),

  // Satu orang, bukan dua. Halaman ini tentang kamu sendiri.
  akun: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
    </>
  ),

  // Pintu dengan panah keluar.
  keluar: (
    <>
      <path d="M14 4h3.5A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5H14" />
      <path d="M10 8l-4 4 4 4" />
      <path d="M6 12h9" />
    </>
  ),

  // ── Halaman jualan ────────────────────────────────────────────────────────

  qr: (
    <>
      <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="14" y="3.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="3.5" y="14" width="6.5" height="6.5" rx="1.5" />
      <path d="M14 14h3v3" />
      <path d="M20.5 14.5V18H17" />
      <path d="M14 20.5h6.5" />
    </>
  ),

  suara: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
      <path d="M12 18v3" />
    </>
  ),

  kirim: (
    <>
      <path d="M21 3.5 10.6 14" />
      <path d="M21 3.5 14.6 21l-4-8.6L2 8.4l19-4.9Z" />
    </>
  ),

  // Sakelar. Yang dibicarakan halaman ini adalah kendali, dan sakelar itu
  // bentuk paling langsung dari "kamu yang menentukan nyala atau mati".
  kendali: (
    <>
      <rect x="2.5" y="7" width="19" height="10" rx="5" />
      <circle cx="16.5" cy="12" r="3" />
    </>
  ),

  catat: (
    <>
      <path d="M9 4.5H7a2 2 0 0 0-2 2V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6.5a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="2.5" width="6" height="4" rx="1.2" />
      <path d="M8.5 12h7" />
      <path d="M8.5 16h4" />
    </>
  ),

  jam: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.3l3.2 1.9" />
    </>
  ),

  banyakNomor: (
    <>
      <rect x="3" y="4" width="10" height="16" rx="2.5" />
      <path d="M16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-4.5" />
      <path d="M6.5 16.5h3" />
    </>
  ),

  sapa: (
    <>
      <path d="M18 8.5a6 6 0 1 0-12 0c0 5-2.2 6.5-2.2 6.5h16.4S18 13.5 18 8.5Z" />
      <path d="M13.7 19a2 2 0 0 1-3.4 0" />
    </>
  ),

  // ── Bidang usaha ──────────────────────────────────────────────────────────

  kopi: (
    <>
      <path d="M4 8.5h12V14a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8.5Z" />
      <path d="M16 10h1.5a2.75 2.75 0 0 1 0 5.5H16" />
      <path d="M8 3v2.5" />
      <path d="M12 3v2.5" />
    </>
  ),

  skincare: (
    <>
      <rect x="7" y="9" width="10" height="12" rx="2.5" />
      <path d="M10 9V6.5h4V9" />
      <path d="M14 6.5V4h3" />
      <path d="M9.5 13.5h5" />
    </>
  ),

  fashion: (
    <path d="M8.5 3 4 5.5l1.6 4L8 8.8V21h8V8.8l2.4.7L20 5.5 15.5 3a3.5 3.5 0 0 1-7 0Z" />
  ),

  klinik: (
    <>
      <path d="M12 3.5 19.5 7v5c0 4.5-3 8-7.5 9.5C7.5 20 4.5 16.5 4.5 12V7L12 3.5Z" />
      <path d="M12 9.5v5.5" />
      <path d="M9.2 12.2h5.6" />
    </>
  ),

  properti: (
    <>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9.2V20h13V9.2" />
      <path d="M10 20v-5.5h4V20" />
    </>
  ),

  kursus: (
    <>
      <path d="M12 3.5 22 8.5l-10 5-10-5 10-5Z" />
      <path d="M6.5 11.2V16c0 1.7 2.5 3 5.5 3s5.5-1.3 5.5-3v-4.8" />
    </>
  ),

  /* Kalender. Bukan jam, karena jam sudah dipakai untuk jam kerja tim dan dua
     lambang waktu yang mirip di satu halaman bikin orang mengira dua fitur itu
     hal yang sama. Yang ditandai di sini harinya, bukan jamnya. */
  kalender: (
    <>
      <rect x="3.2" y="5" width="17.6" height="15.5" rx="2.2" />
      <path d="M3.2 9.6h17.6M8 3.5v3M16 3.5v3" />
      <path d="M11 13.5h2v2h-2z" />
    </>
  ),

  /* Kunci pas. Lambang paling dikenali untuk "dikerjakan orang", dan itu yang
     membedakan bengkel, laundry, dan tukang servis dari toko yang menyerahkan
     barang. Digambar sebagai satu goresan supaya tidak jadi gumpalan di 18px. */
  servis: (
    <>
      <path d="M15.2 3.4a5.5 5.5 0 0 0-6 8.7l-6.1 6.1a1.8 1.8 0 0 0 2.6 2.6l6.1-6.1a5.5 5.5 0 0 0 8.7-6l-3.3 3.3-3-3 3-3Z" />
    </>
  ),

  // Dipakai menggantikan tanda hubung sebagai penanda daftar. Garis pendek
  // "-" itu bukan lambang apa-apa, cuma tanda baca yang kebetulan kelihatan
  // seperti hiasan, dan justru bikin halaman terasa seperti templat.
  // Lembar dengan sudut terlipat. Bentuk yang sudah dipahami semua orang
  // sebagai "berkas", tanpa perlu tulisan.
  berkas: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5" />
    </>
  ),

  // Bola dunia. Garis lintangnya melengkung, bukan lurus, karena garis lurus
  // membuatnya terbaca sebagai bola voli.
  website: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.2 9.5h17.6" />
      <path d="M3.2 14.5h17.6" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
    </>
  ),

  // Dua lembar bertumpuk: lambang salin-tempel.
  //
  // Sebelumnya ini panah masuk ke kotak, dan itu keliru: bentuk persis itu
  // sudah dipakai seluruh dunia untuk "unduh". Orang membaca lambang dari
  // kebiasaan, bukan dari maksud yang menggambarnya.
  //
  // Yang sebenarnya dikerjakan di sini memang menyalin jawaban dari ChatGPT
  // atau Gemini lalu menempelkannya ke sini, jadi lambang salin justru
  // menggambarkan pekerjaannya apa adanya. Menggambar "AI" sendiri selalu
  // berakhir jadi bintang atau robot, dan dua-duanya klise yang tidak
  // memberi tahu apa-apa.
  salin: (
    <>
      <rect x="9" y="9" width="11.5" height="11.5" rx="2.5" />
      <path d="M5.5 15H5a2 2 0 0 1-2-2V5.5A2.5 2.5 0 0 1 5.5 3H13a2 2 0 0 1 2 2v.5" />
    </>
  ),

  // Amplop: badan surat plus lipatan "V" di atas. Untuk hal-hal soal email.
  amplop: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 7l8.5 6 8.5-6" />
    </>
  ),
  // Gembok: badan kotak, sengkang melengkung di atas, plus lubang kunci kecil.
  // Untuk hal-hal soal password.
  gembok: (
    <>
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
      <circle cx="12" cy="15" r="1.2" />
    </>
  ),

  // Unggah: panah ke atas keluar dari baki terbuka. Lambang universal "upload",
  // kebalikan dari panah-masuk-kotak yang berarti "unduh".
  unggah: (
    <>
      <path d="M12 15V4" />
      <path d="M7.5 8.5 12 4l4.5 4.5" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </>
  ),

  centang: <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />,
  silang: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
};

export function Ikon({
  nama,
  size = 20,
  className,
}: {
  nama: NamaIkon;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {GAMBAR[nama]}
    </svg>
  );
}
