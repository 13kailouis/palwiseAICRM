import { NextResponse } from "next/server";
import { prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";
import { callWorker } from "@/lib/worker";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
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

  try {
    const result = await callWorker(`/channels/${id}/start`, {
      method: "POST",
      timeoutMs: 30_000,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memulai koneksi" },
      { status: 502 },
    );
  }
}
