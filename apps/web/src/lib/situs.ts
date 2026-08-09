/**
 * Alamat situs: halaman jualan dan dashboard.
 *
 * Dua-duanya dilayani oleh satu aplikasi yang sama. Yang membedakan cuma nama
 * alamatnya:
 *
 *   palwise.id      -> halaman jualan (siapa saja boleh lihat)
 *   app.palwise.id  -> dashboard, masuk, daftar (perlu login)
 *
 * Kalau kedua alamat ini tidak diisi di .env, semuanya jalan di satu alamat
 * seperti biasa. Itu yang dipakai waktu mengembangkan di laptop, dan tidak ada
 * yang perlu diubah untuk itu.
 *
 * Berkas ini juga dibaca oleh middleware, jadi isinya harus tetap sederhana:
 * baca env, susun teks. Tidak boleh menyentuh database atau modul Node.
 */

function bersihkan(nilai: string | undefined): string {
  const v = (nilai ?? "").trim().replace(/\/+$/, "");
  return v;
}

/** Alamat halaman jualan, mis. https://palwise.id. Kosong = satu alamat. */
export const ALAMAT_SITUS = bersihkan(process.env.NEXT_PUBLIC_SITE_URL);

/** Alamat dashboard, mis. https://app.palwise.id. Kosong = satu alamat. */
export const ALAMAT_APP = bersihkan(process.env.NEXT_PUBLIC_APP_URL);

/**
 * True kalau halaman jualan dan dashboard memang dipisah.
 *
 * Sengaja dicek apakah keduanya berbeda, bukan cuma terisi. Kalau seseorang
 * mengisi dua-duanya dengan alamat yang sama, memisahkan tidak ada gunanya dan
 * malah bisa membuat pengalihan berputar-putar.
 */
export const DIPISAH = Boolean(ALAMAT_SITUS && ALAMAT_APP && ALAMAT_SITUS !== ALAMAT_APP);

/**
 * Jalur yang menjadi milik dashboard. Kalau dibuka di alamat halaman jualan,
 * pengunjungnya dilempar ke alamat dashboard.
 *
 * /api dan /_next tidak masuk daftar ini. Keduanya dipanggil dari halaman yang
 * sudah terbuka, dan melemparnya ke alamat lain akan merusak permintaan itu.
 */
export const JALUR_APP = [
  "/app",
  "/masuk",
  "/daftar",
  "/keluar",
  "/lupa",
  "/atur-ulang",
  "/verifikasi",
];

export function milikApp(pathname: string): boolean {
  return JALUR_APP.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/**
 * Tautan ke halaman dashboard.
 *
 * Kalau dipisah, hasilnya alamat penuh ke app.palwise.id. Kalau tidak,
 * hasilnya jalur biasa. Dipakai di halaman jualan supaya tombol "Masuk" dan
 * "Coba gratis" mendarat di tempat yang benar.
 */
export function keApp(jalur: string): string {
  const bersih = jalur.startsWith("/") ? jalur : `/${jalur}`;
  return DIPISAH ? `${ALAMAT_APP}${bersih}` : bersih;
}

/**
 * Alamat pangkal dashboard, selalu lengkap dengan http/https dan tanpa garis
 * miring di ujung.
 *
 * Dipakai untuk tautan yang keluar dari browser, misalnya tautan di dalam
 * email. `keApp` tidak bisa dipakai di situ karena waktu belum dipisah dia
 * mengembalikan jalur pendek seperti "/atur-ulang", dan itu tidak bisa diklik
 * dari aplikasi email.
 */
export function asalApp(hostCadangan?: string): string {
  if (ALAMAT_APP) return ALAMAT_APP;
  if (ALAMAT_SITUS) return ALAMAT_SITUS;
  return `http://${hostCadangan || "localhost:3000"}`;
}

/**
 * Tautan ke halaman jualan.
 *
 * Dipakai untuk tautan yang dibagikan ke luar, seperti tautan ajakan. Yang
 * dikirim ke teman sebaiknya alamat pendek palwise.id, bukan alamat dashboard.
 */
export function keSitus(jalur: string, hostCadangan?: string): string {
  // Jalur kosong berarti "cukup alamat pangkalnya saja", dipakai kalau yang
  // memanggil mau menyambung sendiri sisanya.
  const bersih = !jalur ? "" : jalur.startsWith("/") ? jalur : `/${jalur}`;
  if (ALAMAT_SITUS) return `${ALAMAT_SITUS}${bersih}`;
  if (hostCadangan) return `http://${hostCadangan}${bersih}`;
  return bersih || "/";
}
