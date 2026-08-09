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

async function main() {
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
