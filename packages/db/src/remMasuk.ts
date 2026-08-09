/**
 * Rem untuk tebak-tebakan password di halaman masuk.
 *
 * Tempatnya di paket db, sebelah reset.js, karena dua alasan.
 *
 * Pertama, berkas "use server" cuma boleh mengekspor fungsi async, jadi aturan
 * ini memang tidak bisa tinggal di dalam server action-nya.
 *
 * Kedua, dan ini yang lebih menentukan: selftest jalan dari paket worker dan
 * tidak bisa mengimpor apa pun dari apps/web. Aturan yang cuma hidup di sana
 * berarti aturan yang tidak pernah diuji, dan aturan pengaman yang tidak diuji
 * sama saja dengan tidak ada.
 */

/** Sesudah sebanyak ini percobaan gagal beruntun, akunnya diistirahatkan. */
export const MAKS_GAGAL = 8;

/** Lama istirahatnya, dalam menit. */
export const ISTIRAHAT_MENIT = 15;

/**
 * Hash bcrypt asli dari kata yang tidak dipakai siapa pun.
 *
 * Dipakai supaya email yang TIDAK terdaftar tetap membayar ongkos pemeriksaan
 * password yang sama. Tanpa ini, email yang tidak ada dijawab jauh lebih cepat
 * daripada email yang ada, dan selisih waktunya sendiri sudah cukup untuk
 * menebak siapa saja yang punya akun di Palwise, tanpa perlu menebak satu
 * password pun.
 */
export const HASH_UMPAN =
  "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

/** Sisa menit istirahat, 0 kalau boleh mencoba lagi. */
export function sisaIstirahat(
  gagal: number,
  sejak: Date | null,
  sekarang: Date = new Date(),
): number {
  if (gagal < MAKS_GAGAL || !sejak) return 0;
  const sisa = ISTIRAHAT_MENIT * 60 * 1000 - (sekarang.getTime() - sejak.getTime());
  return sisa > 0 ? Math.ceil(sisa / 60000) : 0;
}

/**
 * Apakah jendela hitungannya sudah lewat.
 *
 * Kalau sudah, hitungannya mulai dari nol lagi, supaya salah ketik sekali
 * sebulan tidak menumpuk sampai akhirnya mengunci orang yang tidak melakukan
 * apa-apa.
 */
export function jendelaSudahLewat(
  sejak: Date | null,
  sekarang: Date = new Date(),
): boolean {
  if (!sejak) return true;
  return sekarang.getTime() - sejak.getTime() > ISTIRAHAT_MENIT * 60 * 1000;
}
