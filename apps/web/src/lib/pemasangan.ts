import "server-only";
import { prisma, type KeadaanPemasangan } from "@palwise/db";

export async function bacaPemasangan(workspaceId: string): Promise<KeadaanPemasangan> {
  const [agent, channel] = await Promise.all([
    prisma.agent.findFirst({ where: { workspaceId }, orderBy: { createdAt: "asc" } }),
    prisma.channel.findFirst({ where: { workspaceId, status: "connected" } }),
  ]);
  const jumlahInfo = agent ? await prisma.knowledgeSource.count({ where: { agentId: agent.id, status: "ready" } }) : 0;
  return { caraBicara: !!agent?.behaviorPrompt?.trim(), info: jumlahInfo > 0, jumlahInfo, nomor: !!channel };
}
