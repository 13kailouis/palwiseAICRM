/**
 * Pemakaian jatah yang benar untuk DITAMPILKAN.
 *
 * Penolnya jatah bulanan itu malas: yang mengerjakan worker, di dalam
 * `getQuota`, dan itu baru jalan waktu ada pesan masuk atau kuota ditanyakan.
 * Dashboard membaca `aiCreditsUsed` langsung dari database, jadi selama belum
 * ada pesan pertama di periode baru, angka lamanya masih tersimpan apa adanya.
 *
 * Akibatnya persis di saat yang paling salah. Pemilik toko yang jatahnya habis
 * di akhir bulan membuka dashboard tanggal 1, dan masih melihat "100 dari 100,
 * jatahmu habis". Dia menyimpulkan asistennya masih mati dan berhenti memakai
 * produknya, padahal pesan pertama yang masuk hari itu akan dibalas dengan
 * normal karena worker menolkan hitungannya lebih dulu.
 *
 * Fungsi ini cuma untuk tampilan dan TIDAK menulis apa pun. Yang berhak
 * menolkan hitungan tetap satu tempat, yaitu worker, supaya tidak ada dua
 * penulis untuk angka yang sama.
 */
export function terpakaiSekarang(
  aiCreditsUsed: number,
  quotaResetAt: Date,
  sekarang: Date = new Date(),
): number {
  return quotaResetAt.getTime() <= sekarang.getTime() ? 0 : aiCreditsUsed;
}

/**
 * Maju satu bulan sambil MEMPERTAHANKAN tanggal jangkarnya.
 *
 * `setMonth(getMonth() + 1)` kelihatan seperti cara yang benar, dan dia salah
 * untuk tanggal akhir bulan. 31 Januari ditambah satu bulan jadi 31 Februari,
 * yang tidak ada, lalu diam-diam dibetulkan JavaScript jadi 3 Maret. Ulangi
 * setahun dan tanggal jatuh tempo seseorang merayap makin jauh tiap bulan: 31
 * Maret jadi 1 Mei, 31 Mei jadi 1 Juli.
 *
 * Jangkarnya dibawa terpisah supaya tidak ikut terkikis. Tanpa itu, 31 Januari
 * yang dipendekkan jadi 28 Februari akan bertahan sebagai tanggal 28 selamanya,
 * padahal yang benar dia kembali ke 31 begitu bulannya cukup panjang.
 *
 * Diekspor supaya tanggal habis langganan dihitung dengan cara yang SAMA
 * PERSIS dengan tanggal jatah balasan. Dua tanggal itu selalu dipasang bersama
 * di satu baris di layar, dan kalau salah satu memakai `setMonth` biasa,
 * suatu bulan keduanya akan berbeda satu hari tanpa ada yang bisa
 * menjelaskannya.
 */
export function majuSatuBulan(dari: Date, hariJangkar: number): Date {
  const bulanBerikutnya = dari.getMonth() + 1;
  // Hari ke-0 bulan sesudahnya = hari terakhir bulan yang dituju.
  const hariMax = new Date(dari.getFullYear(), bulanBerikutnya + 1, 0).getDate();

  return new Date(
    dari.getFullYear(),
    bulanBerikutnya,
    Math.min(hariJangkar, hariMax),
    dari.getHours(),
    dari.getMinutes(),
    dari.getSeconds(),
  );
}

/**
 * Kapan jatah bulanan berikutnya benar-benar dimulai.
 *
 * Satu fungsi untuk dua pemakai, sengaja. Worker memakainya untuk MENULIS
 * batas periode baru, dashboard memakainya untuk MENAMPILKAN tanggalnya, dan
 * karena keduanya menghitung dengan cara yang sama, angka di layar tidak bisa
 * lagi berbeda dari angka yang dipakai sistem. Pola yang sama dengan
 * [terpakaiSekarang]: yang menulis tetap satu tempat, yang menampilkan cuma
 * ikut menghitung.
 *
 * DUA hal yang diperbaiki di sini, dua-duanya pernah nyata:
 *
 * 1. Periodenya dihitung dari batas SEBELUMNYA, bukan dari saat penolan
 *    kebetulan terjadi. Dulu dipakai `nextReset(new Date())`, dan karena
 *    penolannya malas (baru jalan waktu ada pesan masuk), tanggal jatuh tempo
 *    bergeser makin jauh tiap bulan mengikuti kapan pelanggan kebetulan chat.
 *    Untuk langganan bulanan, jatah harus mengikuti tanggal berlangganan, bukan
 *    tanggal orang kebetulan sibuk.
 *
 * 2. Kalau batas lamanya sudah lewat beberapa bulan, dia dimajukan bulan demi
 *    bulan sampai benar-benar di depan, jadi tanggal jangkarnya tetap sama.
 *
 * Kalau batasnya masih di depan, dia dikembalikan apa adanya. Jadi aman
 * dipanggil kapan saja, termasuk dari halaman yang cuma menampilkan.
 */
export function periodeBerikutnya(
  quotaResetAt: Date,
  sekarang: Date = new Date(),
): Date {
  if (quotaResetAt.getTime() > sekarang.getTime()) return quotaResetAt;

  const hariJangkar = quotaResetAt.getDate();
  let batas = quotaResetAt;

  // Pengaman putaran. Tanggal yang rusak parah di database tidak boleh
  // menggantung proses worker yang hidup berhari-hari.
  for (let i = 0; i < 600 && batas.getTime() <= sekarang.getTime(); i++) {
    batas = majuSatuBulan(batas, hariJangkar);
  }

  return batas;
}
