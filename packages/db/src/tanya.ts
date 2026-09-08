/**
 * Tetapan ruang perintah yang dipakai BERSAMA web dan worker.
 *
 * Letaknya di paket db karena cuma paket ini yang dilihat kedua aplikasi.
 * Isinya sedikit dengan sengaja: yang di sini cuma yang benar-benar harus
 * sama persis di dua sisi, bukan seluruh isi perut halaman Tanya.
 */

/**
 * Kalimat pembuka utas pemasangan.
 *
 * Ditulis langsung ke database waktu utasnya dibuat, TIDAK dibuat model. Ini
 * kalimat pertama yang dibaca orang yang baru mendaftar, jadi dia tidak boleh
 * berubah-ubah tiap kali, tidak boleh gagal karena Google sedang penuh, dan
 * tidak boleh memakan jatah sebelum orangnya mengetik apa pun.
 *
 * Yang ditanyakan cuma SATU hal, dan itu hal yang paling gampang dijawab siapa
 * pun. Halaman Asisten gagal justru di sini: kotak kosong berjudul "Perilaku
 * asisten" itu pertanyaan yang tidak ada seorang pun tahu jawabannya, padahal
 * yang dibutuhkan sistem sebetulnya cuma "usahamu jualan apa".
 */
export const SAPAAN_PASANG =
  "Halo! Aku bantu pasang asistenmu sambil ngobrol aja, nggak usah isi formulir. " +
  "Nanti aku yang susunkan, kamu tinggal cek dan tekan simpan.\n\n" +
  "Mulai dari yang paling dasar ya: usahamu jualan apa?";

/** Judul tetap untuk utas pemasangan. Dia tidak diambil dari pesan pertama,
 *  karena di utas ini yang bicara duluan Palwise, bukan pemiliknya. */
export const JUDUL_PASANG = "Pasang asisten";
