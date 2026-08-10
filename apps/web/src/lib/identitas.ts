/**
 * Identitas resmi Palwise.
 *
 * DIPAKAI DI HALAMAN HUKUM. Isi yang masih bertanda "BELUM DIISI" wajib kamu
 * ganti sebelum halaman privasi, ketentuan, dan pengembalian dana benar-benar
 * dipakai untuk berjualan.
 *
 * Kenapa dikumpulkan di satu berkas: supaya tidak ada nama badan usaha atau
 * alamat yang dikarang menyebar ke lima halaman berbeda, dan supaya kamu cukup
 * mengubahnya sekali.
 *
 * Saya sengaja TIDAK mengarang nama PT, alamat kantor, atau nomor izin. Itu
 * keterangan hukum yang cuma kamu yang tahu, dan salah tulis di halaman
 * ketentuan bisa jadi masalah beneran, bukan cuma jelek.
 */

export const IDENTITAS = {
  /**
   * Nama yang dipakai pelanggan.
   *
   * Palwise itu nama PRODUK, badan usahanya lain. Bedanya penting di halaman
   * hukum: yang menandatangani ketentuan dan menerima uang harus badan
   * usahanya, tapi yang dihubungi pelanggan tetap Palwise. Orang yang mengirim
   * keluhan ke alamat bernama lain akan ragu dia menghubungi tempat yang benar.
   */
  nama: "Palwise",

  /**
   * Badan usaha yang menandatangani ketentuan dan menerima pembayaran.
   *
   * WAJIB badan usaha yang sama dengan pemilik rekening penerima. Kalau
   * ketentuannya ditandatangani nama A tapi uangnya masuk ke rekening nama B,
   * pelanggan yang minta uangnya kembali tidak punya lawan yang sah untuk
   * ditagih, dan itu masalah hukum sungguhan, bukan cuma jelek di layar.
   */
  badanUsaha: "PT Wefluence Media Group",

  /**
   * Kalimat yang menghubungkan produk dengan badan usahanya di kaki halaman.
   * Kosongkan kalau nama produk dan nama badan usahanya memang sama.
   */
  dioperasikanOleh: "PT Wefluence Media Group",

  /** Alamat surat resmi. */
  alamat: "Majalengka",

  /**
   * Email yang dibaca manusia, bukan noreply.
   *
   * Sengaja di domain Palwise, bukan domain badan usahanya. Orang yang mengirim
   * keluhan lalu melihat alamat bernama lain akan ragu dia menghubungi tempat
   * yang benar, dan sebagian tidak jadi mengirim.
   *
   * PASTIKAN ALAMAT INI BENAR-BENAR ADA DAN DIBACA. Dia tertulis di halaman
   * privasi sebagai jalur permintaan penghapusan data menurut UU PDP, dan di
   * halaman pengembalian dana sebagai satu-satunya cara meminta uang kembali.
   * Alamat yang tidak ada yang membaca lebih buruk daripada tidak
   * mencantumkan apa pun.
   */
  email: "halo@palwise.id",

  /** Nomor WhatsApp untuk bantuan, format internasional tanpa tanda plus. */
  waBantuan: "6281543299968",

  /**
   * Nama orang yang membuat Palwise, dipakai menandatangani catatan di halaman
   * depan.
   *
   * Kalau produk, harga, dan mutunya mirip, orang membeli dari orang yang dia
   * kenal. Palwise belum punya testimoni dan belum punya nama besar, jadi
   * satu-satunya kedekatan yang bisa ditawarkan adalah kenyataan bahwa di
   * baliknya ada MANUSIA yang bisa dihubungi, bukan perusahaan tanpa muka. Untuk
   * pemilik usaha di Indonesia itu sering lebih menentukan daripada daftar
   * fitur.
   *
   * SENGAJA TIDAK DIISI SENDIRI. Nama orang tidak boleh dikarang, dan catatan
   * bertanda tangan nama palsu jauh lebih merusak daripada tidak ada catatan
   * sama sekali. Selama masih "BELUM DIISI", tanda tangannya tidak digambar dan
   * catatannya tetap tampil tanpa nama.
   */
  // Diisi "Kai" karena itu nama yang sudah dipakai di repo ini (pemilik akun
  // git dan contoh di komentar atas). GANTI kalau nama yang mau kamu pajang di
  // halaman depan berbeda: ini tanda tangan orang sungguhan, bukan contoh.
  namaPendiri: "Kai",

  /** Jam layanan manusia. */
  jamLayanan: "Senin sampai Sabtu, 09.00 sampai 17.00 WIB",

  /** Tanggal dokumen hukum terakhir diperbarui. */
  berlakuSejak: "1 Agustus 2026",
} as const;

/** True kalau masih ada keterangan yang belum diisi. */
export function identitasBelumLengkap(): string[] {
  return Object.entries(IDENTITAS)
    .filter(([, nilai]) => String(nilai).startsWith("BELUM DIISI"))
    .map(([kunci]) => kunci);
}

/** Tautan WhatsApp ke nomor bantuan, null kalau nomornya belum diisi. */
export function tautanBantuanWa(pesan?: string): string | null {
  const nomor = IDENTITAS.waBantuan.replace(/\D/g, "");
  if (!nomor || IDENTITAS.waBantuan.startsWith("BELUM DIISI")) return null;
  const teks = pesan ? `?text=${encodeURIComponent(pesan)}` : "";
  return `https://wa.me/${nomor}${teks}`;
}
