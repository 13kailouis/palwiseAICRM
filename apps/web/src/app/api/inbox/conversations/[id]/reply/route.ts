import { NextResponse } from "next/server";
import { prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";
import { callWorker } from "@/lib/worker";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireUser();

  const conversation = await prisma.conversation.findFirst({
    where: { id, workspaceId: user.workspaceId },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const text = String(body?.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "Pesan kosong" }, { status: 400 });
  }

  try {
    await callWorker(`/conversations/${id}/reply`, {
      method: "POST",
      body: { text },
      timeoutMs: 30_000,
    });

    // Agen manusia membalas = AI otomatis mundur, dan tanda "butuh manusia"
    // sudah tidak relevan lagi.
    await prisma.conversation.update({
      where: { id },
      data: {
        aiEnabled: false,
        needsHuman: false,
        handoffReason: null,
        handoffAt: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengirim" },
      { status: 502 },
    );
  }
}
