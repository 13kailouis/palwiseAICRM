import { NextResponse } from "next/server";
import { displayName, parseJsonArray, prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireUser();

  const conversation = await prisma.conversation.findFirst({
    where: { id, workspaceId: user.workspaceId },
    include: { contact: true, channel: true },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
    take: 300,
  });

  // Membuka percakapan = menandainya sudah dibaca.
  if (conversation.unreadCount > 0) {
    await prisma.conversation.update({
      where: { id },
      data: { unreadCount: 0 },
    });
  }

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      aiEnabled: conversation.aiEnabled,
      needsHuman: conversation.needsHuman,
      handoffReason: conversation.handoffReason,
      status: conversation.status,
      channelConnected: conversation.channel?.status === "connected",
      isPlayground: !conversation.channelId,
    },
    contact: {
      id: conversation.contact.id,
      name: displayName(conversation.contact),
      crmName: conversation.contact.name,
      phone: conversation.contact.phone,
      email: conversation.contact.email,
      businessName: conversation.contact.businessName,
      industry: conversation.contact.industry,
      stage: conversation.contact.stage,
      notes: conversation.contact.notes,
      tags: parseJsonArray(conversation.contact.tags),
      masalah: conversation.contact.masalah,
      janjiPada: conversation.contact.janjiPada,
      janjiCatatan: conversation.contact.janjiCatatan,
      janjiDipastikan: conversation.contact.janjiDipastikan,
      ringkasan: conversation.contact.ringkasan,
      ringkasanAt: conversation.contact.ringkasanAt,
    },
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      mediaType: m.mediaType,
      // Lewat dashboard, bukan langsung ke worker, supaya kepemilikannya dicek.
      mediaUrl: m.mediaPath
        ? `/api/media/${encodeURIComponent(m.mediaPath)}`
        : null,
      // Bacaan AI atas lampirannya, misalnya "foto bukti transfer BCA
      // Rp 340.000". Sudah dihitung waktu pesannya masuk, jadi menampilkannya
      // gratis. Tanpa ini pemilik toko harus memelototi struk sendiri untuk
      // tahu nominalnya, dan nominal itu justru yang paling dia cari.
      mediaSummary: m.mediaSummary,
      createdAt: m.createdAt,
    })),
  });
}
