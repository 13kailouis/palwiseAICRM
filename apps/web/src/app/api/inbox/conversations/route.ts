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

  const conversations = await prisma.conversation.findMany({
    where,
    orderBy: { lastMessageAt: "desc" },
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

  return NextResponse.json({
    conversations: conversations.map((c) => ({
      id: c.id,
      name: displayName(c.contact),
      phone: c.contact.phone,
      stage: c.contact.stage,
      aiEnabled: c.aiEnabled,
      needsHuman: c.needsHuman,
      status: c.status,
      unreadCount: c.unreadCount,
      lastMessageAt: c.lastMessageAt,
      preview: pratinjau(c.messages[0]),
      lastRole: c.messages[0]?.role ?? null,
    })),
  });
}
