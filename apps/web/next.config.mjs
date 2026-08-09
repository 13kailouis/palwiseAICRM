import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");

// .env di root repo dipakai bersama worker & web.
dotenv.config({ path: path.join(root, ".env") });

/** @type {import('next').NextConfig} */
const nextConfig = {
  // @palwise/db dikonsumsi sebagai TypeScript source, jadi harus di-transpile.
  // Folder hasil build bisa dipindah lewat NEXT_DIST_DIR.
  //
  // Ini bukan hiasan. "next dev" dan "next build" sama-sama menulis ke .next,
  // dan kalau keduanya jalan bersamaan yang satu merusak yang lain. Rusaknya
  // diam-diam dan menyesatkan: halaman tetap muncul tapi berkas JavaScript-nya
  // 404 dan tidak ada tombol yang berfungsi, atau muncul "Cannot find module
  // './7389.js'" yang menyebut berkas yang tidak pernah kamu sentuh.
  //
  // Jadi kalau perlu build sementara pemilik proyek sedang menjalankan
  // "npm run dev", pakai folder lain dan port lain:
  //   NEXT_DIST_DIR=.next-uji npm run build --workspace=@palwise/web
  //   NEXT_DIST_DIR=.next-uji npx next start -p 3100
  distDir: process.env.NEXT_DIST_DIR || ".next",

  transpilePackages: ["@palwise/db"],
  outputFileTracingRoot: root,
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    WORKER_URL: process.env.WORKER_URL,
    INTERNAL_TOKEN: process.env.INTERNAL_TOKEN,

    // Midtrans. Server key TIDAK boleh sampai ke browser, dan yang menjaganya
    // bukan blok ini melainkan "server-only" di lib/midtrans.ts: Next.js cuma
    // menyisipkan nilai ini ke bundel yang benar-benar menyebutnya, dan yang
    // menyebutnya hanya modul server. Client key sengaja tidak ada di sini
    // sama sekali, karena Snap dipakai lewat pengalihan halaman, bukan lewat
    // JavaScript di browser.
    MIDTRANS_SERVER_KEY: process.env.MIDTRANS_SERVER_KEY ?? "",
    MIDTRANS_PRODUCTION: process.env.MIDTRANS_PRODUCTION ?? "",

    // Siapa yang boleh membuka /app/founder. Kosong = halamannya 404.
    FOUNDER_EMAILS: process.env.FOUNDER_EMAILS ?? "",

    // .env dibaca lewat dotenv di atas, bukan oleh Next.js sendiri, jadi dua
    // alamat ini harus disebut di sini supaya ikut terbawa ke middleware.
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "",
  },
  eslint: { ignoreDuringBuilds: true },

  /**
   * Kepala pengaman, dipasang di aplikasinya sendiri.
   *
   * Caddy juga memasang yang sama, dan itu memang disengaja. Yang di sini
   * tetap berlaku kalau suatu hari Palwise dijalankan tanpa Caddy di
   * depannya, misalnya waktu diuji di jaringan lokal atau dipindah ke tempat
   * lain. Pengaman yang cuma hidup di berkas penataan server itu pengaman
   * yang hilang begitu servernya diganti.
   *
   * Yang paling penting X-Frame-Options. Tanpa itu siapa pun bisa menaruh
   * dashboard di dalam bingkai tembus pandang di situsnya sendiri lalu
   * menumpuk tombol palsu di atasnya; yang diklik korban tombol asli seperti
   * "Hapus pelanggan", dan karena dia memang sedang login, permintaannya sah
   * sepenuhnya.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },

  experimental: {
    // Tiga lapis batas ukuran unggahan, dan urutannya penting.
    //
    //   lib/batas.ts MAKS_BYTE       10 MB   <- ini yang bicara ke orangnya
    //   serverActions.bodySizeLimit  12 MB
    //   middlewareClientMaxBodySize  14 MB
    //
    // Yang paling kecil harus milik kita, supaya penolakannya selalu memakai
    // kalimat yang kita tulis sendiri. Dua lapis Next.js di atasnya cuma jaring
    // pengaman, dan kalau salah satunya lebih ketat, dialah yang kena duluan
    // dan kalimatnya bukan bahasa manusia.
    serverActions: {
      // Bawaan Next.js cuma 1 MB. Hampir semua foto dari HP lebih besar dari
      // itu, jadi fiturnya praktis tidak bisa dipakai.
      bodySizeLimit: "12mb",
    },

    // Bawaannya 10 MB, sama persis dengan batas kita, dan itulah bugnya.
    // Middleware kita mengarahkan palwise.id ke app.palwise.id, jadi dia jalan
    // di /app/galeri juga, dan Next.js menahan seluruh isi permintaan lebih
    // dulu supaya middleware sempat membacanya. Berkas 10 MB ditambah
    // pembungkus formulir lewat sedikit dari 10 MB, isinya dipotong di tengah,
    // lalu pembaca formulirnya pecah dengan "Unexpected end of form" dan
    // balasannya 500. Pemeriksaan ukuran kita tidak pernah sempat jalan.
    middlewareClientMaxBodySize: "14mb",
  },

  // @palwise/db ditulis sebagai ESM murni, jadi impor internalnya memakai
  // akhiran ".js" (syarat Node). Webpack perlu diberi tahu bahwa ".js" boleh
  // diselesaikan ke berkas ".ts" yang sebenarnya.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
  // Turbopack tidak punya padanan extensionAlias seperti webpack di atas, jadi
  // tiap berkas dalam @palwise/db harus disebut satu per satu. Dulu cuma
  // plans.js yang terdaftar, dan akibatnya "export * from" yang lain gagal
  // diam-diam: halamannya 500 dengan pesan "Export PLANS doesn't exist",
  // seolah-olah kodenya yang salah padahal cuma pemetaan berkasnya kurang.
  //
  // KALAU MENAMBAH BERKAS BARU DI packages/db/src, TAMBAHKAN DI SINI JUGA.
  // Dijaga oleh selftest supaya tidak terlupa.
  // JANGAN pakai "next dev --turbopack" di proyek ini. Sudah dicoba
  // 2026-08-02 dan gagal, dan gagalnya menyesatkan.
  //
  // @palwise/db ditulis ESM murni, jadi impor internalnya memakai akhiran
  // ".js" (syarat Node) padahal berkasnya ".ts". Webpack menanganinya lewat
  // extensionAlias di bawah. Turbopack tidak punya padanannya, cuma
  // resolveAlias per berkas. Memetakan keenam berkasnya satu per satu dengan
  // alamat lengkap memang menghilangkan "Module not found", tapi
  // "export * from" di index.ts tetap tidak diteruskan, jadi tiap halaman 500
  // dengan "Export PLANS doesn't exist in target module" seolah-olah kodenya
  // yang salah. Bikin orang mencari bug di tempat yang keliru.
  //
  // Syarat supaya turbopack bisa dipakai: hilangkan akhiran ".js" dari impor
  // internal @palwise/db, dan pastikan worker (jalan lewat tsx) tetap hidup
  // tanpa akhiran itu. Selama belum, dev tetap webpack.
  turbopack: {
    resolveAlias: {
      "./plans.js": "./plans.ts",
    },
  },
};

export default nextConfig;
