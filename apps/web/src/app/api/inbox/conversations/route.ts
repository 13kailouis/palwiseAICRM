import { NextResponse } from "next/server";
import { HANYA_OBROLAN_ASLI, displayName, prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Baris pratinjau di daftar obrolan.
 *
 * Lampiran tanpa caption dulu cuma jadi "[image]", yang tidak memberi tahu apa
 * pun. Kalau captionnya kosong, pakai bacaan AI atas lampirannya, misalnya
 * "foto bukti transfer BCA Rp 340.000".
 */
function pratinjau(
  m: { mediaType: string; content: string; mediaSummary: string | null } | undefined,
): string {
  if (!m) return "";
  if (m.mediaType === "text") return m.content;
  return `[${m.mediaType}] ${m.content || m.mediaSummary || ""}`.trim();
}

export async function GET(req: Request) {
  const user = await requireUser();
  const filter = new URL(req.url).searchParams.get("filter") ?? "all";

  // Obrolan ruang coba tidak ikut, supaya kotak masuk hanya berisi orang asli.
  const where: any = { workspaceId: user.workspaceId, ...HANYA_OBROLAN_ASLI };
  if (filter === "open") where.status = "open";
  if (filter === "human") {
    where.status = "open";
    where.needsHuman = true;
  }
  if (filter === "duluin") where.status = "open";

  /**
   * "Duluin ini": urutkan menurut siapa yang paling perlu dipegang, bukan
   * siapa yang paling baru menulis.
   *
   * Ini menjawab pertanyaan yang benar-benar dipunyai pemilik usaha tiap pagi
   * dan tidak pernah bisa dijawab kotak masuk mana pun: dari empat puluh chat
   * ini, saya mulai dari mana. Urutan waktu menjawab pertanyaan yang berbeda,
   * yaitu siapa yang barusan menulis, dan itu jarang sama dengan siapa yang
   * paling mahal kalau ditinggalkan.
   *
   * Kuncinya satu kolom, `rasaPrioritas`, dan aturan pitanya ada di
   * packages/rasa → prioritas(). Ditaruh di sana, bukan di sini, karena itu
   * keputusan produk ("kalau ditinggal satu jam lagi, apa yang hilang"), bukan
   * keputusan tampilan.
   *
   * Diurutkan di database, bukan di JavaScript, karena kolomnya memang sengaja
   * didatarkan untuk ini. Menyortir di sini berarti seluruh daftar harus dimuat
   * dulu sebelum bisa dipotong 100.
   */
  const urutan =
    filter === "duluin"
      ? [{ rasaPrioritas: "desc" as const }, { lastMessageAt: "desc" as const }]
      : [{ lastMessageAt: "desc" as const }];

  const conversations = await prisma.conversation.findMany({
    where,
    orderBy: urutan,
    take: 100,
    include: {
      contact: true,
      // Catatan sistem tidak ikut jadi pratinjau. Dia keterangan untuk pemilik
      // usaha, bukan ucapan siapa pun, dan kalau ikut dia menutupi pesan
      // terakhir yang sebenarnya justru di baris tempat orang memindai cepat.
      messages: {
        where: { role: { not: "system" } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  /**
   * Hitungan singkat di atas daftar, dan yang POSITIF disebut duluan.
   *
   * Ini bukan hiasan. Lencana "marah" merah menarik mata jauh lebih kuat
   * daripada lencana "mau beli" yang hitam, jadi tanpa baris ini kotak masuk
   * secara sistematis membuat kabar buruk lebih terlihat daripada kabar baik.
   * Yang memakai layar ini pemilik usaha kecil yang sudah cemas soal uang, dan
   * layar yang tiap pagi menyodorkan ancaman duluan lama-lama tidak dibuka
   * lagi. Produk yang tidak dibuka tidak menolong siapa pun.
   *
   * Yang dihitung selalu SELURUH obrolan yang masih jalan, bukan cuma yang
   * sedang tampil, supaya angkanya tidak berubah tiap ganti saringan.
   */
  const [siapBeli, perluDitenangkan] = await Promise.all([
    prisma.conversation.count({
      where: {
        workspaceId: user.workspaceId,
        ...HANYA_OBROLAN_ASLI,
        status: "open",
        rasaLabel: "panas",
      },
    }),
    prisma.conversation.count({
      where: {
        workspaceId: user.workspaceId,
        ...HANYA_OBROLAN_ASLI,
        status: "open",
        rasaLabel: { in: ["marah", "kesal"] },
      },
    }),
  ]);

  return NextResponse.json({
    ringkas: { siapBeli, perluDitenangkan },
    conversations: conversations.map((c) => ({
      id: c.id,
      name: displayName(c.contact),
      waFotoPath: c.contact.waFotoPath,
      phone: c.contact.phone,
      stage: c.contact.stage,
      aiEnabled: c.aiEnabled,
      needsHuman: c.needsHuman,
      status: c.status,
      unreadCount: c.unreadCount,
      lastMessageAt: c.lastMessageAt,
      preview: pratinjau(c.messages[0]),
      lastRole: c.messages[0]?.role ?? null,
      rasaLabel: c.rasaLabel,
      rasaAlasan: c.rasaAlasan,
    })),
  });
}
