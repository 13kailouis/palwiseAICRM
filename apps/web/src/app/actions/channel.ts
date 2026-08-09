"use server";

import { revalidatePath } from "next/cache";
import { getPlan, prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";
import { callWorker } from "@/lib/worker";

export interface ChannelState {
  error?: string;
  message?: string;
}

export async function addChannelAction(
  _prev: ChannelState,
  formData: FormData,
): Promise<ChannelState> {
  const user = await requireUser();

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: user.workspaceId },
  });
  const plan = getPlan(workspace.plan);

  const used = await prisma.channel.count({
    where: { workspaceId: user.workspaceId },
  });
  if (used >= plan.maxChannels) {
    return {
      error: `Paket ${plan.name} muat ${plan.maxChannels} nomor. Naikkan paket dulu kalau mau nambah.`,
    };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Kasih nama dulu buat nomornya." };

  const agent = await prisma.agent.findFirst({
    where: { workspaceId: user.workspaceId },
    orderBy: { createdAt: "asc" },
  });

  await prisma.channel.create({
    data: {
      workspaceId: user.workspaceId,
      agentId: agent?.id ?? null,
      name: name.slice(0, 60),
      type: "whatsapp_qr",
    },
  });

  revalidatePath("/app/whatsapp");
  return { message: `Nomor "${name}" ditambahkan. Tinggal scan QR-nya.` };
}

export async function assignAgentAction(formData: FormData) {
  const user = await requireUser();
  const channelId = String(formData.get("channelId") ?? "");
  const agentId = String(formData.get("agentId") ?? "");

  const channel = await prisma.channel.findFirst({
    where: { id: channelId, workspaceId: user.workspaceId },
  });
  if (!channel) return;

  // Pastikan agent yang dipilih memang milik workspace ini.
  const agent = agentId
    ? await prisma.agent.findFirst({
        where: { id: agentId, workspaceId: user.workspaceId },
      })
    : null;

  await prisma.channel.update({
    where: { id: channelId },
    data: { agentId: agent?.id ?? null },
  });

  revalidatePath("/app/whatsapp");
}

export async function renameChannelAction(formData: FormData) {
  const user = await requireUser();
  const channelId = String(formData.get("channelId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const channel = await prisma.channel.findFirst({
    where: { id: channelId, workspaceId: user.workspaceId },
  });
  if (!channel) return;

  await prisma.channel.update({
    where: { id: channelId },
    data: { name: name.slice(0, 60) },
  });
  revalidatePath("/app/whatsapp");
}

export async function deleteChannelAction(formData: FormData) {
  const user = await requireUser();
  const channelId = String(formData.get("channelId") ?? "");

  const channel = await prisma.channel.findFirst({
    where: { id: channelId, workspaceId: user.workspaceId },
  });
  if (!channel) return;

  // Lepas dulu sesi WhatsApp-nya supaya tidak ada koneksi menggantung.
  try {
    await callWorker(`/channels/${channelId}/stop`, {
      method: "POST",
      body: { logout: true },
      timeoutMs: 15_000,
    });
  } catch {
    // worker mati, tidak apa-apa, lanjut hapus datanya
  }

  await prisma.channel.delete({ where: { id: channelId } });
  revalidatePath("/app/whatsapp");
}
