import { NextResponse } from "next/server";
import { prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";

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
  const data: Record<string, unknown> = {};

  if (typeof body.aiEnabled === "boolean") {
    data.aiEnabled = body.aiEnabled;
    // Menyerahkan lagi ke AI berarti tanda eskalasi sudah selesai ditangani.
    if (body.aiEnabled) {
      data.needsHuman = false;
      data.handoffReason = null;
    }
  }
  if (body.status === "open" || body.status === "resolved") {
    data.status = body.status;
  }
  if (body.needsHuman === false) {
    data.needsHuman = false;
    data.handoffReason = null;
    // Ikut dikosongkan. Kolom ini yang menghitung berapa lama eskalasinya
    // menggantung, jadi kalau ditinggal terisi, eskalasi berikutnya langsung
    // dianggap sudah lewat jendela tunggunya.
    data.handoffAt = null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Tidak ada yang diubah" }, { status: 400 });
  }

  await prisma.conversation.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
