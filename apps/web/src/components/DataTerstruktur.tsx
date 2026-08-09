import { SEMUA_PAKET } from "@palwise/db";
import { ALAMAT_SITUS } from "@/lib/situs";

/**
 * Keterangan yang dibaca mesin, bukan orang.
 *
 * Google memakainya untuk kartu hasil pencarian, dan mesin jawaban seperti
 * Google AI Overviews, ChatGPT, dan Perplexity memakainya untuk menjawab
 * pertanyaan orang TANPA mereka membuka situsnya.
 *
 * Kenapa ini penting justru untuk Palwise: pembeda utamanya harga. Kalau mesin
 * jawaban ditanya "asisten WhatsApp yang murah apa" lalu harus menebak harga
 * dari kalimat pemasaran, dia bisa salah menyebut angkanya, dan yang tersebar
 * adalah harga yang salah dari sumber yang kelihatan resmi. Dengan blok ini,
 * angka yang dia baca sama persis dengan yang ada di kartu harga.
 *
 * SEMUANYA DITURUNKAN DARI SUMBER YANG SAMA dengan yang tampil di layar:
 * harga dari SEMUA_PAKET, tanya jawab dari daftar yang sama yang digambar di
 * halamannya. Kalau diketik ulang di sini, suatu hari yang dibaca mesin dan
 * yang dibaca orang berbeda, dan itu bentuk kebohongan yang paling sulit
 * ketahuan karena tidak ada manusia yang pernah melihatnya.
 */

function Blok({ isi }: { isi: object }) {
  return (
    <script
      type="application/ld+json"
      // Sengaja dirapatkan tanpa spasi. Isinya tidak pernah dibaca manusia,
      // dan tiap halaman memuatnya di setiap kunjungan.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(isi) }}
    />
  );
}

export function DataTerstruktur({
  tanyaJawab,
}: {
  tanyaJawab: { t: string; j: string }[];
}) {
  const asal = ALAMAT_SITUS || "";

  const organisasi = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Palwise",
    description:
      "Asisten WhatsApp otomatis untuk usaha kecil di Indonesia. Membalas chat pelanggan, mencatat calon pembeli, dan menjaga janji temu.",
    ...(asal ? { url: asal, logo: `${asal}/logo.png` } : {}),
    areaServed: { "@type": "Country", name: "Indonesia" },
  };

  const produk = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Palwise",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "id-ID",
    description:
      "Asisten WhatsApp yang membalas pertanyaan pelanggan soal harga, jadwal, dan cara pesan dalam hitungan detik, memakai info bisnis yang diisi pemiliknya sendiri. Mencatat data pelanggan dan janji temu otomatis dari obrolan.",
    ...(asal ? { url: asal } : {}),
    // Tiap paket jadi satu penawaran dengan harganya sendiri. Ini yang dibaca
    // mesin jawaban waktu ditanya "harganya berapa".
    offers: SEMUA_PAKET.map((p) => ({
      "@type": "Offer",
      name: p.name,
      price: p.pricePerMonth,
      priceCurrency: "IDR",
      // Tanpa ini, harga bulanan bisa terbaca sebagai harga sekali bayar.
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: p.pricePerMonth,
        priceCurrency: "IDR",
        referenceQuantity: {
          "@type": "QuantitativeValue",
          value: 1,
          unitCode: "MON",
        },
      },
      description: `${p.aiCredits.toLocaleString("id-ID")} balasan per bulan, ${p.maxChannels} nomor WhatsApp.`,
    })),
    featureList: [
      "Balas chat WhatsApp otomatis 24 jam",
      "Jawaban diambil dari info bisnis yang diisi pemiliknya, bukan dikarang",
      "Baca foto dan pesan suara dari pelanggan",
      "Kirim foto, video, dan berkas PDF ke pelanggan",
      "Catat data pelanggan otomatis dari obrolan",
      "Catat janji temu, tatap muka maupun online",
      "Ingatkan pelanggan sebelum janji temunya",
      "Sapa lagi pelanggan yang menghilang",
      "Ringkasan AI tiap pelanggan",
      "Pasang cukup scan QR, tanpa daftar ke Meta",
    ],
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: tanyaJawab.map((x) => ({
      "@type": "Question",
      name: x.t,
      acceptedAnswer: { "@type": "Answer", text: x.j },
    })),
  };

  return (
    <>
      <Blok isi={organisasi} />
      <Blok isi={produk} />
      <Blok isi={faq} />
    </>
  );
}
