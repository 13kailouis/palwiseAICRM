import { displayName, HANYA_OBROLAN_ASLI, HANYA_PELANGGAN_ASLI, prisma } from "./index.js";

export interface IdeTanya { ikon: "chat" | "pelanggan" | "kirim" | "whatsapp" | "info" | "asisten" | "ringkasan"; judul: string; pesan: string; }

/** Suggestions come from the owner's current workspace, without an AI call. */
export async function muatIdeTanya(workspaceId: string) {
  const [workspace, agent, nomor, tertarik, menunggu, prospek] = await Promise.all([
    prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { name: true } }),
    prisma.agent.findFirst({ where: { workspaceId }, orderBy: { createdAt: "asc" },
      select: { behaviorPrompt: true, _count: { select: { knowledgeSources: true } } } }),
    prisma.channel.count({ where: { workspaceId, status: "connected" } }),
    prisma.contact.count({ where: { workspaceId, stage: "tertarik", ...HANYA_PELANGGAN_ASLI } }),
    prisma.conversation.findFirst({ where: { workspaceId, needsHuman: true, status: "open", ...HANYA_OBROLAN_ASLI },
      orderBy: { handoffAt: "asc" }, select: { contact: { select: { id: true, name: true, waPushName: true, phone: true } } } }),
    prisma.contact.findMany({ where: { workspaceId, ...HANYA_PELANGGAN_ASLI, stage: { in: ["tertarik", "negosiasi", "closing"] }, conversations: { some: { status: "open" } } },
      orderBy: { updatedAt: "desc" }, take: 3, select: { id: true, name: true, waPushName: true, phone: true } }),
  ]);
  const ide: IdeTanya[] = [];
  const sasaran = (k: { name: string; waPushName: string | null; phone: string | null }) =>
    JSON.stringify(displayName(k)) + (k.phone ? ` (nomor ${k.phone})` : "");
  if (menunggu && displayName(menunggu.contact) !== "Tanpa nama") {
    const k = menunggu.contact;
    ide.push({ ikon: "chat", judul: `Bantu balas ${displayName(k)}`, pesan: `Siapkan draf balasan untuk ${sasaran(k)} sesuai obrolan terakhirnya.` });
  }
  if (tertarik) ide.push({ ikon: "pelanggan", judul: `${tertarik} pelanggan tertarik`, pesan: "Cek siapa saja pelanggan yang tertarik" });
  const calon = prospek.find(k => k.id !== menunggu?.contact.id && displayName(k) !== "Tanpa nama");
  if (calon) ide.push({ ikon: "kirim", judul: `Follow up ${displayName(calon)}`, pesan: `Siapkan draf follow up untuk ${sasaran(calon)} sesuai obrolan terakhirnya.` });
  if (!nomor) ide.push({ ikon: "whatsapp", judul: "Sambungkan WhatsApp", pesan: "Tampilkan QR untuk menyambungkan nomor WhatsApp saya" });
  if (!agent?._count.knowledgeSources) ide.push({ ikon: "info", judul: "Lengkapi info bisnis", pesan: "Bantu saya melengkapi info bisnis. Cek dulu apa yang sudah tersimpan dan tanyakan satu hal yang masih kurang." });
  if (!agent?.behaviorPrompt?.trim()) ide.push({ ikon: "asisten", judul: "Siapkan asisten", pesan: "Bantu menyiapkan cara bicara asisten sesuai bisnis saya. Periksa dulu info bisnis yang sudah tersimpan." });
  if (!ide.length) ide.push({ ikon: "ringkasan", judul: "Ringkasan chat hari ini", pesan: "Ringkas jumlah chat hari ini dari data akun saya. Sebutkan kalau belum ada chat." });
  return { usaha: workspace.name, ide: ide.slice(0, 3) };
}
