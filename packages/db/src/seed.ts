import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@palwise.id";
const DEMO_PASSWORD = "demo1234";

const BEHAVIOR_PROMPT = `Kamu adalah customer service untuk bisnis bernama Kopi Nusantara.
Namamu adalah Nara.

TUGASMU
- Memberi informasi produk & harga yang jelas dan singkat.
- Menggali kebutuhan calon pembeli lalu mengarahkan ke pemesanan.

GAYA BICARA
- Ramah, santai, pakai "kak". Boleh pakai emoji secukupnya.
- Balasan singkat, maksimal 3 kalimat per bubble.
- Jangan pernah mengarang harga atau stok. Kalau tidak tahu, bilang akan dicek tim.

ALUR
- Kalau ini chat pertama, tanyakan dulu nama dan kebutuhannya.
- Setelah tahu kebutuhannya, rekomendasikan 1-2 produk yang paling cocok.
- Kalau customer sudah tertarik, minta nama lengkap, alamat, dan jumlah pesanan.

BATASAN
- Jangan menjawab pertanyaan yang tidak berkaitan dengan Kopi Nusantara.
- Jangan menjanjikan diskon yang tidak ada di knowledge base.`;

const SAMPLE_KNOWLEDGE = `PRODUK & HARGA KOPI NUSANTARA

1. Arabika Gayo 200gr — Rp 85.000
   Rasa: floral, citrus, body medium. Roast level: medium.
   Cocok untuk: V60, tubruk, aeropress.

2. Arabika Toraja 200gr — Rp 92.000
   Rasa: dark chocolate, rempah, body tebal. Roast level: medium-dark.
   Cocok untuk: espresso, moka pot, tubruk.

3. Robusta Temanggung 200gr — Rp 55.000
   Rasa: pahit tegas, karamel, caffeine tinggi. Roast level: dark.
   Cocok untuk: kopi susu, espresso.

4. Paket Sampler (3 x 100gr) — Rp 120.000
   Isi: Gayo, Toraja, Temanggung. Cocok untuk yang baru mau coba.

PENGIRIMAN
- Dikirim dari Bandung. JNE, J&T, SiCepat.
- Order sebelum jam 14.00 dikirim hari yang sama.
- Gratis ongkir untuk pembelian di atas Rp 300.000 (khusus Pulau Jawa).

PEMBAYARAN
- Transfer BCA / Mandiri, QRIS, atau COD (khusus Bandung).
- Pesanan diproses setelah bukti transfer diterima.

GARANSI & RETUR
- Kalau kemasan rusak atau salah kirim, kami ganti penuh. Lapor maksimal 3 hari
  setelah paket diterima, sertakan foto.
- Kopi yang sudah dibuka tidak bisa diretur.

JAM OPERASIONAL
- Senin-Sabtu 09.00-17.00 WIB. Minggu libur.
- Di luar jam itu chat tetap dibalas AI, tim manusia balas keesokan harinya.

GROSIR / RESELLER
- Minimal 5 kg, harga khusus. Diarahkan ke tim sales.`;

/**
 * Menolak jalan di server sungguhan, dan ini KODE bukan lagi kalimat di panduan.
 *
 * Akun demonya `demo@palwise.id` dengan password `demo1234`, dua-duanya tertulis
 * di dalam berkas ini. Sejak repo Palwise jadi publik di GitHub (9 Agustus 2026),
 * password itu bukan lagi rahasia siapa pun: dia bisa dibaca semua orang di
 * internet.
 *
 * Selama ini satu-satunya yang mencegah akun itu ada di server sungguhan adalah
 * satu kalimat di `bisnis/07-pasang-di-vps.md` yang berbunyi "jangan jalankan
 * npm run db:seed di server". Kalimat di dokumen bukan pengaman. Sekali ada yang
 * menjalankannya di server, entah karena panik, karena mengira databasenya
 * kosong, atau karena menyalin perintah dari catatan lama, langsung ada akun
 * hidup dengan password yang diketahui seluruh internet, dan di dalamnya ada
 * kotak masuk WhatsApp beserta seluruh data pelanggan.
 *
 * Pola yang sama dengan `INTERNAL_TOKEN` di worker: nilai bawaan yang tertulis di
 * dalam kode WAJIB membuat prosesnya menolak jalan waktu production, bukan cuma
 * memunculkan peringatan yang bisa dilewati.
 *
 * Kalau suatu hari benar-benar perlu memasang data contoh di server, ganti
 * passwordnya lebih dulu dan jangan pakai jalan pintas mematikan pemeriksaan ini.
 */
function tolakDiProduction() {
  if (process.env.NODE_ENV !== "production") return;

  console.error(
    [
      "",
      "npm run db:seed DITOLAK karena NODE_ENV=production.",
      "",
      `Perintah ini membuat akun ${DEMO_EMAIL} dengan password ${DEMO_PASSWORD},`,
      "dan password itu tertulis di dalam kode yang repo-nya publik. Di server",
      "sungguhan itu berarti akun hidup yang passwordnya diketahui semua orang,",
      "lengkap dengan kotak masuk WhatsApp dan data pelanggan di dalamnya.",
      "",
      "Yang mungkin kamu cari: npm run db:push (menyiapkan tabel, tanpa data",
      "contoh) atau npm run akun:bantuan (akun bantuan Palwise dengan password",
      "acak yang dicetak sekali).",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

async function main() {
  tolakDiProduction();

  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    console.log(`✓ Akun demo sudah ada: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
    return;
  }

  const workspace = await prisma.workspace.create({
    data: { name: "Kopi Nusantara", plan: "growth" },
  });

  await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
      name: "Demo Owner",
      workspaceId: workspace.id,
    },
  });

  const agent = await prisma.agent.create({
    data: {
      workspaceId: workspace.id,
      name: "Nara — CS & Sales",
      behaviorPrompt: BEHAVIOR_PROMPT,
      welcomeMessage:
        "Halo kak! 👋 Saya Nara dari Kopi Nusantara.\nAda yang bisa saya bantu hari ini?",
      handoffCondition:
        "Kalau customer minta bicara dengan manusia, komplain berat, minta harga grosir/reseller, atau sudah kirim bukti transfer.",
      followUpEnabled: true,
      followUpAfterHours: 24,
    },
  });

  // status "pending" — worker akan meng-indeks otomatis saat start
  // (butuh GEMINI_API_KEY untuk bikin embedding).
  await prisma.knowledgeSource.create({
    data: {
      agentId: agent.id,
      type: "text",
      title: "Katalog & SOP Kopi Nusantara",
      content: SAMPLE_KNOWLEDGE,
      status: "pending",
    },
  });

  await prisma.channel.create({
    data: {
      workspaceId: workspace.id,
      agentId: agent.id,
      name: "WhatsApp Utama",
      type: "whatsapp_qr",
      status: "disconnected",
    },
  });

  console.log("✓ Workspace demo dibuat.");
  console.log(`  Login : ${DEMO_EMAIL}`);
  console.log(`  Passwd: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
