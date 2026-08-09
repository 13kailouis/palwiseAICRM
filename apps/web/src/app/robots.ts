import type { MetadataRoute } from "next";
import { ALAMAT_SITUS, JALUR_APP } from "@/lib/situs";

/**
 * robots.txt.
 *
 * Middleware sudah lama mengecualikan "/robots.txt" dari pengalihannya, tapi
 * berkasnya sendiri tidak pernah ada, jadi yang dilayani cuma halaman 404.
 *
 * Yang dilarang persis daftar jalur dashboard yang sudah dipakai middleware,
 * bukan daftar baru yang diketik ulang. Kalau ditulis ulang, suatu hari ada
 * halaman dashboard baru yang lupa ditambahkan di sini dan dia diam-diam masuk
 * hasil pencarian Google.
 *
 * Kenapa dashboard perlu dilarang sama sekali: satu aplikasi ini melayani dua
 * alamat, jadi app.palwise.id ikut menerima robots.txt yang sama. Halaman masuk
 * dan daftar yang terindeks bukan cuma sampah di hasil pencarian, dia juga
 * bersaing dengan halaman jualan untuk kata kunci yang sama.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: JALUR_APP.map((jalur) => `${jalur}/`).concat(JALUR_APP),
    },
    ...(ALAMAT_SITUS ? { sitemap: `${ALAMAT_SITUS}/sitemap.xml` } : {}),
  };
}
