import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getPlan, prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";
import { callWorker } from "@/lib/worker";

export const dynamic = "force-dynamic";

const MAX_CONTENT = 200_000;

/**
 * Simpan hasil tarikan dari website atau berkas, setelah diperiksa dan
 * mungkin diedit pengguna. Isinya sudah ada, jadi tidak perlu diambil ulang.
 */
export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json().catch(() => ({}));

  const content = String(body?.content ?? "").trim();
  if (content.length < 20) {
    return NextResponse.json({ error: "Isinya terlalu pendek." }, { status: 400 });
  }

  const requestedAgentId = String(body?.agentId ?? "");
  const agent =
    (requestedAgentId
      ? await prisma.agent.findFirst({
          where: { id: requestedAgentId, workspaceId: user.workspaceId },
        })
      : null) ??
    (await prisma.agent.findFirst({
      where: { workspaceId: user.workspaceId },
      orderBy: { createdAt: "asc" },
    }));

  if (!agent) {
    return NextResponse.json({ error: "Belum ada asisten." }, { status: 400 });
  }

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: user.workspaceId },
  });
  const plan = getPlan(workspace.plan);
  const used = await prisma.knowledgeSource.count({
    where: { agent: { workspaceId: user.workspaceId } },
  });
  if (used >= plan.maxKnowledgeSources) {
    return NextResponse.json(
      {
        error: `Paket ${plan.name} muat ${plan.maxKnowledgeSources} catatan. Naikkan paket dulu kalau mau nambah.`,
      },
      { status: 400 },
    );
  }

  const tipe = body?.type === "file" ? "file" : "website";
  const title =
    String(body?.title ?? "").trim().slice(0, 120) ||
    String(body?.sumber ?? "").trim() ||
    (tipe === "file" ? "Dari file" : "Dari website");

  const source = await prisma.knowledgeSource.create({
    data: {
      agentId: agent.id,
      type: tipe,
      title,
      content: content.slice(0, MAX_CONTENT),
      status: "pending",
    },
  });

  try {
    await callWorker(`/knowledge/${source.id}/index`, {
      method: "POST",
      timeoutMs: 120_000,
    });
  } catch (err) {
    return NextResponse.json({
      ok: true,
      warning:
        err instanceof Error
          ? err.message
          : "Tersimpan, tapi belum sempat dihafal. Klik Hafalkan lagi nanti.",
    });
  }

  revalidatePath("/app/knowledge");
  return NextResponse.json({ ok: true });
}
