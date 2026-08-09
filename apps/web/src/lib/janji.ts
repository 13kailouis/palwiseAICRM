/**
 * Kalimat konfirmasi jadwal yang disodorkan ke pemilik usaha.
 *
 * Ditulis kode, bukan AI. Kalimatnya selalu sama bentuknya, jadi memanggil
 * model untuk ini cuma menambah biaya, menambah waktu tunggu, dan menambah satu
 * cara baru untuk salah menyebut tanggal. Yang penting justru sebaliknya: yang
 * dilihat pemiliknya sebelum menekan kirim harus persis yang akan sampai ke
 * pelanggannya, huruf demi huruf.
 */
export function draftKabarJanji(
  nama: string,
  pada: Date,
  catatan: string | null,
): string {
  const hari = pada.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const jam = pada.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Nama dipakai kalau ada. "Halo kak ," dengan koma menggantung itu tanda
  // paling jelas bahwa pesannya keluar dari mesin.
  const sapaan = nama.trim() ? `Halo kak ${nama.trim()}` : "Halo kak";
  const untuk = catatan?.trim() ? ` untuk ${catatan.trim()}` : "";

  return `${sapaan}, jadwalnya sudah kami pastikan ya: ${hari}, jam ${jam}${untuk}. Kalau ada perubahan, kabari kami saja. Terima kasih!`;
}
