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

  const channel = await prisma.channel.findFirst({
    where: { id, workspaceId: user.workspaceId },
  });
  if (!channel) {
    return NextResponse.json({ error: "Channel tidak ditemukan" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));

  try {
    await callWorker(`/channels/${id}/stop`, {
      method: "POST",
      body: { logout: body?.logout === true },
      timeoutMs: 20_000,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memutus koneksi" },
      { status: 502 },
    );
  }
}
