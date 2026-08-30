import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Abu netral, bukan abu kebiruan. Dasarnya hitam putih, dan satu-
        // satunya warna yang boleh muncul adalah biru di bawah ini.
        ink: {
          50: "#fafafa",
          100: "#f0f0f0",
          200: "#e6e6e6",
          300: "#d4d4d4",
          400: "#9aa0a6",
          500: "#6b7075",
          600: "#54585c",
          700: "#404346",
          800: "#2b2d2f",
          900: "#171717",
          950: "#0f0f0f",
        },

        // Biru interaksi.
        //
        // Aturannya: biru hanya untuk hal yang bisa diklik, dan hanya SATU
        // bidang biru besar yang boleh terlihat sekaligus di satu layar.
        // Kalau ada tiga tombol biru sejajar, tidak ada yang jadi utama dan
        // matanya membaca warnanya sebagai hiasan.
        //
        // Yang tetap hitam: angka, uang, judul, ikon, isi kartu, batang
        // kemajuan. Itu semua informasi, bukan ajakan.
        brand: {
          50: "#eff4fe",
          100: "#dbe8fd",
          200: "#c9ddfb",
          300: "#a3c6f8",
          400: "#6ba4f2",
          500: "#3b85ec",
          600: "#1a73e8",
          700: "#1557b0",
          800: "#154a91",
          900: "#153f77",
        },
      },
      fontFamily: {
        // Nilai bawaan ditulis DI DALAM var(), bukan cuma sebagai daftar
        // cadangan sesudahnya. Kalau --font-sans tidak terpasang, `var(...)`
        // tanpa bawaan membuat SELURUH baris font-family tidak sah, jadi
        // "system-ui, sans-serif" di belakangnya pun ikut hangus dan hurufnya
        // jatuh ke Times bawaan browser. Gagalnya diam, dan yang kelihatan cuma
        // situs yang tiba-tiba berhuruf kait.
        sans: [
          "var(--font-sans, ui-sans-serif)",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
