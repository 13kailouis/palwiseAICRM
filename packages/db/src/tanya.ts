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

export interface HasilBacaTanya {
  alat: string;
  judul: string;
  isi: string;
  gagal: boolean;
}

/** Accept legacy messages and reject malformed stored result payloads. */
export function bacaHasilTanya(nilai: string | null | undefined): HasilBacaTanya[] {
  try {
    const data: unknown = JSON.parse(nilai || "[]");
    return Array.isArray(data) ? data.filter((v): v is HasilBacaTanya =>
      !!v && typeof v === "object" && typeof v.alat === "string" &&
      typeof v.judul === "string" && typeof v.isi === "string" && typeof v.gagal === "boolean",
    ).slice(0, 4) : [];
  } catch { return []; }
}

export interface KeadaanPemasangan {
  caraBicara: boolean;
  info: boolean;
  jumlahInfo: number;
  nomor: boolean;
}

/** The greeting follows saved progress, including setup done outside chat. */
export function sapaanPemasangan(keadaan: KeadaanPemasangan): string {
  if (keadaan.caraBicara && keadaan.info) {
    return keadaan.nomor
      ? "Asisten, info bisnis, dan nomor WhatsApp kamu sudah terpasang. Mau cek cara bicaranya atau perbarui info bisnis?"
      : "Cara bicara asisten dan info bisnis kamu sudah terisi. Tinggal sambungkan nomor WhatsApp.\n\nKartu WhatsApp ada di bawah obrolan ini. Tekan Tampilkan QR, lalu scan lewat menu Perangkat tertaut di WhatsApp.";
  }
  if (keadaan.info) return "Info bisnis kamu sudah tersimpan. Kita lanjut menyiapkan cara bicara asistennya. Kamu ingin gaya yang santai atau lebih formal?";
  if (keadaan.caraBicara) return "Cara bicara asisten kamu sudah terisi. Sekarang kita lengkapi info bisnis supaya jawabannya sesuai usahamu.\n\nKamu bisa kirim daftar produk atau layanan beserta harganya di sini.";
  if (keadaan.nomor) return "Nomor WhatsApp kamu sudah tersambung. Kita lanjut menyiapkan asistennya. Usahamu menjual produk atau layanan apa?";
  return SAPAAN_PASANG;
}

/** Recognize device linking, while leaving product/payment QR requests alone. */
export function mintaSambunganWhatsApp(teks: string): boolean {
  if (tanyaStatusWhatsApp(teks)) return false;
  const isi = teks.toLowerCase().replace(/whats\s*app/g, "whatsapp");
  if (/\b(qris|bayar|pembayaran|transfer|rekening|menu|katalog|produk)\b/.test(isi)) return false;
  const whatsapp = /\b(whatsapp|wa)\b/.test(isi);
  const qr = /\b(qr(?:\s*code)?(?:nya)?|kode\s*qr)\b/.test(isi);
  const taut = /perangkat\s*(tertaut|tert[au]ut)|tautkan\s*perangkat/.test(isi);
  const sambung = /\b(sambung\w*|hubung\w*|connect\w*|taut\w*|scan|pindai|login)\b/.test(isi);
  const minta = /\b(tampil\w*|muncul\w*|beri\w*|minta|mana|lihat|buat\w*|kirim\w*|scan|pindai)\b/.test(isi);
  return taut || (whatsapp && (qr || sambung)) || (qr && minta);
}

/** A status question must not be mistaken for permission to begin linking. */
export function tanyaStatusWhatsApp(teks: string): boolean {
  const isi = teks.toLowerCase().replace(/whats\s*app/g, "whatsapp");
  return /\b(whatsapp|wa)\b/.test(isi) && /\b(status|sudah|udah|sdh|udh|masih|apakah|apa|kenapa|kok)\b/.test(isi) &&
    /\b(status|terhubung|tersambung|tertaut|nyambung|sambung|terputus|putus|aktif|connect\w*|disconnect\w*)\b/.test(isi) &&
    !/\b(tampilkan|minta|berikan|buatkan|scan|pindai|sambungkan|hubungkan|tautkan)\b/.test(isi);
}
