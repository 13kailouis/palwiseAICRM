/**
 * Batas ukuran unggahan, ditaruh terpisah supaya BISA dipakai di browser.
 *
 * Dulu semua ini ada di lib/berkas.ts, yang ditandai "server-only" karena
 * menyentuh folder penyimpanan. Akibatnya formulir di browser tidak punya cara
 * tahu batasnya, jadi berkas 12 MB tetap dikirim penuh lewat jaringan cuma
 * untuk ditolak sesudah sampai. Di jaringan HP Indonesia itu bisa satu menit
 * menunggu untuk sebuah penolakan yang sebetulnya sudah bisa diketahui
 * sebelum satu bita pun dikirim.
 *
 * Berkas ini tidak boleh mengimpor apa pun dari node: tidak fs, tidak path.
 */

export const JENIS_BERKAS: Record<string, { kind: string; ext: string }> = {
  "image/jpeg": { kind: "image", ext: "jpg" },
  "image/png": { kind: "image", ext: "png" },
  "image/webp": { kind: "image", ext: "webp" },
  "video/mp4": { kind: "video", ext: "mp4" },
  "application/pdf": { kind: "document", ext: "pdf" },
};

/**
 * Batas kita sendiri.
 *
 * Angka ini yang paling kecil di antara tiga lapis batas. Dua lapis di atasnya
 * ada di next.config.mjs dan sengaja dibuat lebih longgar, supaya yang bicara
 * ke orangnya selalu lapisan ini, yang kalimatnya kita tulis sendiri.
 */
export const MAKS_BYTE = 10 * 1024 * 1024;

export const MAKS_MB = MAKS_BYTE / 1024 / 1024;

/**
 * Batas berkas yang cuma DIBACA isinya untuk Info bisnis, bukan dikirim ke
 * pelanggan. Sengaja lebih longgar: yang ini tidak pernah melewati WhatsApp,
 * cuma diambil tulisannya lalu berkasnya dibuang.
 */
export const MAKS_BACA_BYTE = 15 * 1024 * 1024;

export const MAKS_BACA_MB = MAKS_BACA_BYTE / 1024 / 1024;

/**
 * Jumlah berkas galeri per asisten.
 *
 * Tempatnya di sini, bukan di actions/galeri.ts, karena berkas "use server"
 * cuma boleh mengekspor fungsi async. Menaruhnya di sana memang bisa dipakai
 * server action-nya sendiri, tapi halaman yang mau memajang angkanya tidak bisa
 * ikut membacanya, dan jalan pintasnya selalu sama: angka 30 diketik ulang di
 * layar. Suatu hari salah satunya berubah, lalu orang ditolak di angka yang
 * berbeda dengan yang tertulis di depan matanya.
 */
export const MAKS_BERKAS = 30;

export function kenaliJenis(file: { type: string; name: string }): {
  kind: string;
  ext: string;
} | null {
  const dariMime = JENIS_BERKAS[file.type];
  if (dariMime) return dariMime;

  // Sebagian browser mengirim tipe kosong. Tebak dari akhiran namanya.
  const ext = /\.([a-z0-9]+)$/i.exec(file.name)?.[1]?.toLowerCase();
  for (const nilai of Object.values(JENIS_BERKAS)) {
    if (nilai.ext === ext) return nilai;
  }
  return null;
}

export function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Satu pemeriksaan, dipakai di browser DAN di server.
 *
 * Sengaja satu fungsi, bukan dua yang mirip. Kalau kalimat penolakannya ditulis
 * dua kali, cepat atau lambat yang satu berubah dan yang lain tidak, lalu orang
 * ditolak dengan alasan berbeda tergantung dia lewat mana.
 */
export function periksaBerkas(file: { size: number; type: string; name: string }): string | null {
  if (file.size === 0) return "Berkasnya kosong, coba pilih yang lain.";
  if (file.size > MAKS_BYTE) {
    return `Ukurannya ${mb(file.size)}, batasnya ${MAKS_MB} MB. Coba perkecil dulu atau pilih yang lain.`;
  }
  if (!kenaliJenis(file)) {
    return "Yang bisa dikirim cuma gambar (JPG, PNG, WEBP), video MP4, atau PDF.";
  }
  return null;
}
