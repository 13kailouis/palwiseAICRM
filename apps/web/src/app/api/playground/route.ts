import { NextResponse } from "next/server";
import { prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";
import { callWorker } from "@/lib/worker";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json().catch(() => ({}));

  // Asisten yang diminta harus dipastikan milik akun ini sebelum dipakai.
  const requestedId = String(body?.agentId ?? "");
  const agent =
    (requestedId
      ? await prisma.agent.findFirst({
          where: { id: requestedId, workspaceId: user.workspaceId },
        })
      : null) ??
    (await prisma.agent.findFirst({
      where: { workspaceId: user.workspaceId },
      orderBy: { createdAt: "asc" },
    }));

  if (!agent) {
    return NextResponse.json({ error: "Belum ada asisten." }, { status: 400 });
  }

  try {
    const result = await callWorker("/playground", {
      method: "POST",
      body: {
        agentId: agent.id,
        message: body?.message,
        reset: body?.reset === true,
      },
      timeoutMs: 90_000,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menghubungi AI" },
      { status: 502 },
    );
  }
}
