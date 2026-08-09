import type { NamaIkon } from "@/components/Ikon";

/**
 * Definisi menu, satu-satunya.
 *
 * Dipakai tiga tempat: sidebar desktop, bar bawah HP, dan laci menu HP. Kalau
 * masing-masing punya daftarnya sendiri, menu baru pasti ada yang lupa
 * ditambahkan di salah satunya, dan bedanya baru ketahuan berbulan-bulan
 * kemudian dari orang yang bingung.
 */

export interface Menu {
  href: string;
  label: string;
  /** Label pendek khusus bar bawah HP, yang ruangnya cuma sekitar 70px. */
  pendek?: string;
  ikon: NamaIkon;
}

export interface Kelompok {
  judul: string;
  menu: Menu[];
}

export const KELOMPOK: Kelompok[] = [
  {
    judul: "Setiap hari",
    menu: [
      { href: "/app", label: "Ringkasan", ikon: "ringkasan" },
      { href: "/app/inbox", label: "Chat masuk", pendek: "Chat", ikon: "chat" },
      { href: "/app/kontak", label: "Pelanggan", ikon: "pelanggan" },
    ],
  },
  {
    judul: "Asisten kamu",
    menu: [
      { href: "/app/agent", label: "Asisten", ikon: "asisten" },
      { href: "/app/knowledge", label: "Info bisnis", pendek: "Info", ikon: "info" },
      { href: "/app/galeri", label: "Gambar & berkas", pendek: "Gambar", ikon: "gambar" },
      { href: "/app/coba", label: "Coba dulu", pendek: "Coba", ikon: "coba" },
    ],
  },
  {
    judul: "Pengaturan",
    menu: [
      { href: "/app/whatsapp", label: "Nomor WhatsApp", pendek: "Nomor", ikon: "whatsapp" },
      { href: "/app/tagihan", label: "Paket & pemakaian", pendek: "Paket", ikon: "paket" },
      { href: "/app/akun", label: "Akun", ikon: "akun" },
    ],
  },
];

export const SEMUA_MENU: Menu[] = KELOMPOK.flatMap((k) => k.menu);

/**
 * Empat menu yang muncul di bar bawah HP, plus tombol "Menu" sebagai yang
 * kelima.
 *
 * Kenapa empat, bukan enam atau sepuluh: satu petak bar bawah harus selebar
 * kira-kira 70px supaya jempol tidak salah tekan. Di layar 360px, lima petak
 * sudah pas dan yang keenam mulai berdesakan.
 *
 * Yang dipilih persis kelompok "Setiap hari" ditambah Asisten. Tiga yang
 * pertama itu yang dibuka tiap hari, dan Asisten yang paling menentukan
 * pengguna baru berhasil atau menyerah.
 */
export const MENU_BAWAH: Menu[] = [
  SEMUA_MENU[0], // Ringkasan
  SEMUA_MENU[1], // Chat masuk
  SEMUA_MENU[2], // Pelanggan
  SEMUA_MENU[3], // Asisten
];

/** Apakah menu ini yang sedang dibuka. */
export function sedangDibuka(href: string, pathname: string): boolean {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}
