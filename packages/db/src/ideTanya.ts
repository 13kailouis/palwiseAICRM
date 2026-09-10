import { displayName, HANYA_OBROLAN_ASLI, HANYA_PELANGGAN_ASLI, prisma } from "./index.js";

export interface IdeTanya { ikon: "chat" | "pelanggan" | "kirim" | "whatsapp" | "info" | "asisten" | "ringkasan" | "kalender"; judul: string; pesan: string; }

/** Shuffled copy; suggestions rotate between loads instead of showing the same three forever. */
function acak<T>(daftar: T[]): T[] {
  return daftar.map((x) => [Math.random(), x] as const).sort((a, b) => a[0] - b[0]).map(([, x]) => x);
}

/** Always-useful owner requests. One or two rotate in behind the data-driven ones. */
const IDE_UMUM: IdeTanya[] = [
  { ikon: "kalender", judul: "Rencana hari ini", pesan: "Susun prioritas kerja hari ini dari keluhan, obrolan yang membutuhkan tim, dan janji. Berikan 3 langkah konkret berdasarkan data, jangan buat draf pesan dulu." },
  { ikon: "ringkasan", judul: "Ringkas minggu ini", pesan: "Ringkas kondisi bisnis 7 hari terakhir dari data akun saya: chat masuk, pelanggan baru, dan yang perlu ditindaklanjuti." },
  { ikon: "pelanggan", judul: "Cari peluang", pesan: "Analisis peluang follow up dari data bisnis. Sebutkan nama, alasan, dan langkah berikutnya. Jangan buat atau kirim pesan dulu." },
  { ikon: "asisten", judul: "Ubah sapaan pertama", pesan: "Bantu saya mengubah sapaan pertama asisten. Tampilkan sapaan yang sekarang dulu, lalu tawarkan satu versi yang lebih baik." },
  { ikon: "info", judul: "Perbarui info bisnis", pesan: "Bantu perbarui info bisnis. Tampilkan catatan yang tersimpan, lalu tanyakan bagian mana yang ingin saya tambah, edit, atau hapus." },
  { ikon: "asisten", judul: "Atur jam kerja", pesan: "Tampilkan setelan jam kerja asisten sekarang, lalu tanyakan jam kerja tim saya supaya bisa diatur." },
];

/** Suggestions come from the owner's current workspace, without an AI call. */
export async function muatIdeTanya(workspaceId: string) {
  const [workspace, agent, nomor, tertarik, menunggu, prospek, keluhan] = await Promise.all([
    prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { name: true } }),
    prisma.agent.findFirst({ where: { workspaceId }, orderBy: { createdAt: "asc" },
      select: { behaviorPrompt: true, _count: { select: { knowledgeSources: true } } } }),
    prisma.channel.count({ where: { workspaceId, status: "connected" } }),
    prisma.contact.count({ where: { workspaceId, stage: "tertarik", ...HANYA_PELANGGAN_ASLI } }),
    prisma.conversation.findMany({ where: { workspaceId, needsHuman: true, status: "open", ...HANYA_OBROLAN_ASLI },
      orderBy: { handoffAt: "asc" }, take: 5, select: { contact: { select: { id: true, name: true, waPushName: true, phone: true } } } }),
    prisma.contact.findMany({ where: { workspaceId, ...HANYA_PELANGGAN_ASLI, stage: { in: ["tertarik", "negosiasi", "closing"] }, conversations: { some: { status: "open" } } },
      orderBy: { updatedAt: "desc" }, take: 6, select: { id: true, name: true, waPushName: true, phone: true } }),
    prisma.contact.count({ where: { workspaceId, ...HANYA_PELANGGAN_ASLI, masalah: { not: null } } }),
  ]);
  const ide: IdeTanya[] = [];
  const sasaran = (k: { name: string; waPushName: string | null; phone: string | null }) =>
    JSON.stringify(displayName(k)) + (k.phone ? ` (nomor ${k.phone})` : "");
  // Data-driven ideas come first and stay; which customer they name rotates among the candidates.
  const dibalas = acak(menunggu.map(m => m.contact).filter(k => displayName(k) !== "Tanpa nama"))[0];
  if (dibalas) ide.push({ ikon: "chat", judul: `Bantu balas ${displayName(dibalas)}`, pesan: `Siapkan draf balasan untuk ${sasaran(dibalas)} sesuai obrolan terakhirnya.` });
  if (keluhan) ide.push({ ikon: "chat", judul: `${keluhan} keluhan terbuka`, pesan: "Tampilkan keluhan pelanggan yang masih terbuka, urutkan dari yang paling mendesak." });
  if (tertarik) ide.push({ ikon: "pelanggan", judul: `${tertarik} pelanggan tertarik`, pesan: "Cek siapa saja pelanggan yang tertarik" });
  const calon = acak(prospek.filter(k => k.id !== dibalas?.id && displayName(k) !== "Tanpa nama"))[0];
  if (calon) ide.push({ ikon: "kirim", judul: `Follow up ${displayName(calon)}`, pesan: `Siapkan draf follow up untuk ${sasaran(calon)} sesuai obrolan terakhirnya.` });
  if (!nomor) ide.push({ ikon: "whatsapp", judul: "Sambungkan WhatsApp", pesan: "Tampilkan QR untuk menyambungkan nomor WhatsApp saya" });
  if (!agent?._count.knowledgeSources) ide.push({ ikon: "info", judul: "Lengkapi info bisnis", pesan: "Bantu saya melengkapi info bisnis. Cek dulu apa yang sudah tersimpan dan tanyakan satu hal yang masih kurang." });
  if (!agent?.behaviorPrompt?.trim()) ide.push({ ikon: "asisten", judul: "Siapkan asisten", pesan: "Bantu menyiapkan cara bicara asisten sesuai bisnis saya. Periksa dulu info bisnis yang sudah tersimpan." });
  // Then one or two general requests, shuffled, so the row changes from visit to visit.
  const tetap = ide.slice(0, 5);
  const umum = acak(IDE_UMUM).slice(0, Math.max(1, 5 - tetap.length));
  return { usaha: workspace.name, ide: [...tetap, ...umum].slice(0, 6) };
}
