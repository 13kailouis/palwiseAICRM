/**
 * Isi kotak masuk dengan enam obrolan contoh supaya lencana rasa dan urutan
 * "Duluin ini" bisa dilihat sendiri di layar.
 *
 * Jalankan: npm run contoh:rasa
 *
 * Aman diulang: pesan lama obrolan-obrolan ini dihapus dulu dan bacaannya
 * dikosongkan, jadi hasilnya sama tiap kali. Tanpa itu, menjalankannya dua kali
 * membuat "belum dibalas" menumpuk dan semua contohnya berubah jadi kesal.
 *
 * Cuma menyentuh enam nomor di bawah. Obrolan lain di workspace itu tidak
 * disentuh sama sekali.
 */
import { prisma } from "@palwise/db";
import {
  appendMessage,
  getOrCreateContact,
  getOrCreateConversation,
} from "../core/conversation.js";

/** "c" = pesan pelanggan, "a" = balasan asisten. */
type Giliran = ["c" | "a", string];

const CONTOH: [string, string, Giliran[]][] = [
  ["628121110001", "Bu Sari", [["c", "Halo kak, mau tanya arabika gayo masih ready?"]]],
  ["628121110002", "Pak Andi", [["c", "Transfer kemana ya kak? saya mau ambil 2 kg"]]],
  ["628121110003", "Rina", [["c", "kok mahal banget ya kak"], ["c", "ada diskon ga?"]]],
  [
    "628121110004",
    "Dimas",
    [["c", "kok lama banget sih balesnya"], ["c", "dari tadi saya nunggu loh"]],
  ],
  ["628121110005", "Bu Lina", [["c", "makasih banyak kak, ramah banget pelayanannya"]]],
  [
    "628121110006",
    "Toko Jaya",
    [["c", "yaudah kalau gitu"], ["c", "udah dapet yang lain kak"]],
  ],
  // Yang paling penting ditunjukkan: orang yang mundur karena tidak sanggup,
  // dan sama sekali tidak mengatakannya. Yang bikin kalimat terakhirnya berarti
  // bukan kata-katanya, tapi letaknya — tepat sesudah harga disebut.
  [
    "628121110007",
    "Mas Yudi",
    [
      ["c", "Halo kak, paket perawatan lengkapnya berapaan ya?"],
      ["a", "Halo kak! Paket lengkapnya Rp 2.850.000 untuk 6 kali kunjungan ya."],
      ["c", "oh gitu ya kak"],
    ],
  ],
];

async function main() {
  const ws = await prisma.workspace.findFirst({ orderBy: { createdAt: "asc" } });
  if (!ws) throw new Error("belum ada workspace, jalankan npm run db:seed dulu");

  for (const [nomor, nama, pesan] of CONTOH) {
    const k = await getOrCreateContact({
      workspaceId: ws.id,
      waJid: `${nomor}@s.whatsapp.net`,
    });
    await prisma.contact.update({ where: { id: k.id }, data: { name: nama } });
    const c = await getOrCreateConversation({ workspaceId: ws.id, contactId: k.id });
    await prisma.message.deleteMany({ where: { conversationId: c.id } });
    await prisma.conversation.update({
      where: { id: c.id },
      data: {
        rasaState: null,
        rasaLabel: null,
        rasaAlasan: null,
        rasaKesal: 0,
        rasaMinat: 0,
        rasaPrioritas: 0,
        rasaYakin: 0,
        rasaSaat: null,
        rasaSerahkan: false,
        needsHuman: false,
        handoffAt: null,
        handoffReason: null,
      },
    });
    for (const [peran, teks] of pesan) {
      await appendMessage({
        conversationId: c.id,
        workspaceId: ws.id,
        role: peran === "a" ? "ai" : "customer",
        content: teks,
      });
    }
    const akhir = await prisma.conversation.findUniqueOrThrow({ where: { id: c.id } });
    console.log(`${nama.padEnd(10)} ${String(akhir.rasaLabel).padEnd(8)} ${akhir.rasaAlasan ?? ""}`);
  }
}

main().finally(() => prisma.$disconnect());
