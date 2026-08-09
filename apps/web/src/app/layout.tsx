import type { Metadata } from "next";
import "./globals.css";
import { ALAMAT_SITUS } from "@/lib/situs";

/**
 * "Sales", bukan "asisten".
 *
 * Judul ini yang muncul di hasil pencarian dan di kartu tautan waktu dibagikan
 * lewat WhatsApp, jadi dia harus menjual barang yang sama dengan halamannya.
 * "Asisten" dan "admin" menjanjikan pekerjaan tata usaha, dan itu pos biaya yang
 * orang cari semurah mungkin lalu batalkan. Yang sebenarnya dikerjakan produk ini
 * pekerjaan sales, dan sales itu pos penghasilan.
 *
 * Kata "asisten" tetap dipakai DI DALAM dashboard, dan itu memang disengaja: di
 * sana orangnya sudah membeli, dan yang dia atur memang satu asisten yang
 * menjawab. Yang berubah cuma cara menjualnya ke orang yang belum kenal.
 */
const JUDUL = "Palwise, sales WhatsApp AI untuk usaha di Indonesia";
const RINGKAS =
  "Chat pelanggan dibalas 24 jam pakai harga dan jadwal dari info usahamu sendiri, sampai orangnya mau pesan. Janji temu ikut tercatat. Mulai gratis, pasang cukup scan QR.";

export const metadata: Metadata = {
  // Template judul: tiap halaman menambahkan namanya sendiri di depan, dan
  // "Palwise" selalu ikut. Tab yang cuma bertuliskan "Kebijakan privasi" tidak
  // memberi tahu siapa pun ini situs siapa.
  title: { default: JUDUL, template: "%s · Palwise" },
  description: RINGKAS,
  applicationName: "Palwise",
  // Supaya alamat di tautan berbagi jadi alamat penuh, bukan jalur pendek.
  ...(ALAMAT_SITUS ? { metadataBase: new URL(ALAMAT_SITUS) } : {}),

  // Kartu yang muncul waktu tautannya dibagikan.
  //
  // Ini penting justru karena produknya produk WhatsApp: tautan Palwise akan
  // paling sering dibagikan lewat WhatsApp, dan tautan tanpa kartu muncul
  // sebagai baris teks abu yang hampir tidak pernah diklik.
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Palwise",
    title: JUDUL,
    description: RINGKAS,
    ...(ALAMAT_SITUS ? { url: ALAMAT_SITUS } : {}),
  },
  twitter: { card: "summary_large_image", title: JUDUL, description: RINGKAS },

  robots: {
    index: true,
    follow: true,
    // Cuplikan panjang sengaja diizinkan. Mesin jawaban seperti Google AI
    // Overviews dan ChatGPT mengutip potongan halaman; membatasi panjangnya
    // berarti memaksa mereka mengutip sepotong yang tidak utuh, dan jawaban
    // sepotong soal harga jauh lebih merugikan daripada tidak dikutip.
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" },
  },

  ...(ALAMAT_SITUS ? { alternates: { canonical: ALAMAT_SITUS } } : {}),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
