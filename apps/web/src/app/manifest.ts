import type { MetadataRoute } from "next";

/**
 * manifest.webmanifest.
 *
 * Gunanya bukan bikin Palwise jadi aplikasi. Yang dicari di sini: waktu pemilik
 * usaha menambahkan dashboard ke layar depan HP-nya, yang muncul logo Palwise
 * dengan nama yang benar, bukan potongan tangkapan layar dengan judul URL.
 *
 * Itu bukan hal kecil untuk produk yang dibuka dari HP setiap hari, dan memang
 * begitu cara pemakaiannya: yang memegang WhatsApp usaha hampir selalu memegang
 * HP, bukan laptop.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Palwise, asisten WhatsApp untuk usaha",
    short_name: "Palwise",
    description:
      "Balas chat pelanggan otomatis, catat calon pembeli, dan jaga janji temu tidak ada yang kelewat.",
    start_url: "/app",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1a5ce8",
    lang: "id",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      // "maskable" supaya Android boleh memotongnya jadi bulat tanpa memakan
      // tandanya. Tanpa penanda ini, sebagian peluncur menaruh logo kita di
      // dalam kotak putih dengan tepi yang tidak rapi.
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
