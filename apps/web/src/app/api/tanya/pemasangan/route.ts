import { NextResponse } from "next/server";
import { prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Tiga langkah pemasangan, untuk pita kemajuan di utas "Pasang asisten".
 *
 * Dihitung dengan cara yang PERSIS SAMA dengan kotak "Tinggal N langkah lagi"
 * di Ringkasan. Kalau berbeda, orang yang baru saja disuruh Palwise menekan
 * Simpan akan kembali ke Ringkasan dan melihat langkah itu masih merah, lalu
 * berhenti mempercayai salah satu dari dua layar itu.
 */
export async function GET() {
  const user = await requireUser();
  const workspaceId = user.workspaceId;

  const [agent, channel] = await Promise.all([
    prisma.agent.findFirst({ where: { workspaceId }, orderBy: { createdAt: "asc" } }),
    prisma.channel.findFirst({ where: { workspaceId, status: "connected" } }),
  ]);

  const infoSiap = agent
    ? await prisma.knowledgeSource.count({ where: { agentId: agent.id, status: "ready" } })
    : 0;

  return NextResponse.json({
    caraBicara: !!agent?.behaviorPrompt,
    info: infoSiap > 0,
    jumlahInfo: infoSiap,
    nomor: !!channel,
  });
}
