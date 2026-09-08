import { NextResponse } from "next/server";
import { getPlan, prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Only owned channels are listed. QR credentials stay in the status endpoint. */
export async function GET() {
  const user = await requireUser();
  const [channels, workspace] = await Promise.all([
    prisma.channel.findMany({ where: { workspaceId: user.workspaceId, type: "whatsapp_qr" }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, status: true, phoneNumber: true } }),
    prisma.workspace.findUniqueOrThrow({ where: { id: user.workspaceId }, select: { plan: true, _count: { select: { channels: true } } } }),
  ]);
  const plan = getPlan(workspace.plan);
  return NextResponse.json({ channels, used: workspace._count.channels, max: plan.maxChannels, planName: plan.name }, { headers: { "Cache-Control": "no-store" } });
}
