import type { MetadataRoute } from "next";
import { ALAMAT_SITUS } from "@/lib/situs";

/**
 * sitemap.xml.
 *
 * Isinya CUMA halaman yang memang untuk umum. Halaman dashboard sengaja tidak
 * ikut, sejalan dengan robots.txt: mendaftarkan halaman yang dilarang di
 * robots itu memberi Google dua perintah yang saling bertentangan.
 *
 * Halaman hukum ikut masuk dengan sengaja. Orang benar-benar mencari
 * "kebijakan privasi <nama produk>" sebelum menyambungkan nomor WhatsApp
 * usahanya, dan halaman yang tidak ketemu membuat mereka mengurungkan niat di
 * langkah terakhir.
 */
const HALAMAN: { jalur: string; prioritas: number }[] = [
  { jalur: "/", prioritas: 1 },
  // Prioritas tinggi dan itu disengaja. Orang mencari "cara pakai" dan "cara
  // menyambungkan WhatsApp ke AI" jauh lebih sering daripada nama produknya,
  // dan halaman ini yang menjawabnya. Dia juga tautan yang paling sering
  // dibagikan ke rekan atau pegawai.
  { jalur: "/panduan", prioritas: 0.8 },
  { jalur: "/kontak", prioritas: 0.6 },
  { jalur: "/privasi", prioritas: 0.4 },
  { jalur: "/ketentuan", prioritas: 0.4 },
  { jalur: "/pengembalian", prioritas: 0.4 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  // Tanpa alamat situs di .env, alamat mutlaknya tidak bisa disusun dan peta
  // situs yang isinya jalur relatif ditolak Google. Lebih baik kosong daripada
  // salah.
  if (!ALAMAT_SITUS) return [];

  return HALAMAN.map(({ jalur, prioritas }) => ({
    url: `${ALAMAT_SITUS}${jalur === "/" ? "" : jalur}`,
    changeFrequency: "monthly" as const,
    priority: prioritas,
  }));
}
