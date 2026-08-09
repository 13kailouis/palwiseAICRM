import "server-only";

/**
 * Siapa yang boleh membuka halaman founder.
 *
 * Dibaca dari `FOUNDER_EMAILS` di .env, dipisah koma. Sengaja dari env, bukan
 * kolom di database, karena satu-satunya cara menambah orang jadi harus punya
 * akses ke server. Kolom `role` di database bisa berubah lewat bug di halaman
 * mana pun; berkas .env tidak.
 *
 * KALAU KOSONG, HALAMANNYA TIDAK ADA. Bukan "boleh dibuka semua orang", bukan
 * juga "cuma bisa dibuka pemilik pertama". Nilai bawaan yang salah di pintu
 * seperti ini harus selalu mengarah ke tertutup, karena yang di baliknya jumlah
 * pelanggan, pendapatan, dan pemakaian tiap akun.
 *
 * Yang TIDAK ada di balik pintu ini, dan sengaja: isi obrolan pelanggan.
 * Kebijakan privasi kita menulis data pelanggan "tidak dibaca karyawan kami",
 * dan halaman founder yang bisa membuka chat orang membuat kalimat itu bohong.
 * Yang boleh dilihat cuma hitungan.
 */
function daftarFounder(): string[] {
  return (process.env.FOUNDER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Sengaja cuma SATU fungsi yang diekspor.
 *
 * Sempat ada `halamanFounderAktif()` di sini yang tidak pernah dipanggil dari
 * mana pun. Fungsi yang tidak dipakai di pintu keamanan itu lebih buruk daripada
 * sekadar kode mati: orang berikutnya membacanya sebagai "sudah ada
 * pemeriksaannya", lalu menambah halaman baru tanpa memasang pemeriksaan yang
 * sesungguhnya. Satu pintu, satu fungsi.
 */
export function bolehLihatFounder(email: string | null | undefined): boolean {
  if (!email) return false;
  const daftar = daftarFounder();
  if (daftar.length === 0) return false;
  return daftar.includes(email.trim().toLowerCase());
}
