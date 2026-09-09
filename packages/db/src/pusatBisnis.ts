import { prisma, displayName, HANYA_OBROLAN_ASLI, HANYA_PELANGGAN_ASLI, getPlan, periodeBerikutnya, terpakaiSekarang } from "./index.js";

const HARI = 86_400_000;
export function awalHariWib(waktu: Date) {
  return new Date(Math.floor((waktu.getTime() + 7 * 3_600_000) / HARI) * HARI - 7 * 3_600_000);
}

/** Read-only, tenant-scoped brief. Lists are bounded; counts cover the entire workspace. */
export async function muatPusatBisnis(workspaceId: string, hari: 7 | 30 = 7, sekarang = new Date()) {
  const mulai = new Date(awalHariWib(sekarang).getTime() - (hari - 1) * HARI);
  const sebelumnya = new Date(mulai.getTime() - hari * HARI);
  // Compare equal elapsed spans, including the same partial day in the previous period.
  const akhirSebelumnya = new Date(sekarang.getTime() - hari * HARI);
  const kontak = { workspaceId, ...HANYA_PELANGGAN_ASLI };
  const obrolan = { workspaceId, ...HANYA_OBROLAN_ASLI };
  const prioritasWhere = { ...obrolan, status: "open", OR: [{ needsHuman: true }, { contact: { ...HANYA_PELANGGAN_ASLI, masalah: { not: null } } }] };
  const peluangWhere = { ...obrolan, status: "open", needsHuman: false,
    contact: { ...HANYA_PELANGGAN_ASLI, stage: { in: ["tertarik", "negosiasi", "closing"] }, masalah: null },
    lastMessageAt: { lte: new Date(sekarang.getTime() - HARI), gte: new Date(sekarang.getTime() - 30 * HARI) },
    OR: [{ followUpMutedUntil: null }, { followUpMutedUntil: { lte: sekarang } }],
  };
  const janjiWhere = { ...kontak, janjiPada: { gte: awalHariWib(sekarang) } };
  const ukur = async (gte: Date, lt: Date) => {
    const waktu = { gte, lt };
    const [pesan, aktif, baru, klaim] = await Promise.all([
      prisma.message.count({ where: { role: "customer", createdAt: waktu, conversation: obrolan } }),
      prisma.contact.count({ where: { ...kontak, conversations: { some: { workspaceId, messages: { some: { role: "customer", createdAt: waktu } } } } } }),
      prisma.contact.count({ where: { ...kontak, createdAt: waktu } }),
      prisma.contact.count({ where: { ...kontak, klaimBayarSejak: waktu } }),
    ]);
    return { pesan, aktif, baru, klaim };
  };
  const [workspace, kini, lalu, prioritas, jumlahPrioritas, peluang, jumlahPeluang, janji, jumlahJanji, tahap, terbaru, kanal, info, agent] = await Promise.all([
    prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } }),
    ukur(mulai, sekarang), ukur(sebelumnya, akhirSebelumnya),
    prisma.conversation.findMany({ where: prioritasWhere, orderBy: [{ rasaPrioritas: "desc" }, { handoffAt: "asc" }, { lastMessageAt: "asc" }], take: 8, include: { contact: true } }),
    prisma.conversation.count({ where: prioritasWhere }),
    prisma.conversation.findMany({ where: peluangWhere, orderBy: { lastMessageAt: "asc" }, take: 8, include: { contact: true } }),
    prisma.conversation.count({ where: peluangWhere }),
    prisma.contact.findMany({ where: janjiWhere, orderBy: { janjiPada: "asc" }, take: 8 }),
    prisma.contact.count({ where: janjiWhere }),
    prisma.contact.groupBy({ by: ["stage"], where: kontak, _count: { _all: true } }),
    prisma.conversation.findMany({ where: obrolan, orderBy: { lastMessageAt: "desc" }, take: 5, include: { contact: true, messages: { orderBy: { createdAt: "desc" }, take: 1, select: { content: true, role: true } } } }),
    prisma.channel.findMany({ where: { workspaceId }, select: { name: true, status: true } }),
    prisma.knowledgeSource.count({ where: { agent: { workspaceId }, status: "ready" } }),
    prisma.agent.findFirst({ where: { workspaceId }, select: { behaviorPrompt: true }, orderBy: { createdAt: "asc" } }),
  ]);
  const baris = (c: typeof prioritas[number], alasan: string) => ({ id: c.id, kontakId: c.contactId, nama: displayName(c.contact), nomor: c.contact.phone, tahap: c.contact.stage, alasan, waktu: c.lastMessageAt.toISOString() });
  return {
    usaha: workspace.name, hari, diperbarui: sekarang.toISOString(), mulai: mulai.toISOString(), kini, lalu,
    prioritas: prioritas.map(c => baris(c, c.contact.masalah || c.handoffReason || "Asisten meminta bantuanmu")), jumlahPrioritas,
    peluang: peluang.map(c => baris(c, `Tahap ${c.contact.stage} · tidak ada pesan selama ${Math.max(1, Math.floor((sekarang.getTime() - c.lastMessageAt.getTime()) / HARI))} hari`)), jumlahPeluang,
    janji: janji.map(c => ({ id: c.id, nama: displayName(c), waktu: c.janjiPada!.toISOString(), catatan: c.janjiCatatan, dipastikan: c.janjiDipastikan })), jumlahJanji,
    tahap: tahap.map(t => ({ nama: t.stage, jumlah: t._count._all })),
    terbaru: terbaru.map(c => ({ ...baris(c, ""), cuplikan: c.messages[0]?.content.slice(0, 130) || "Belum ada pesan", peran: c.messages[0]?.role, perluBantuan: c.needsHuman })),
    kanal, info, caraBicara: !!agent?.behaviorPrompt?.trim(),
    paket: getPlan(workspace.plan).name,
    resetBalasan: periodeBerikutnya(workspace.quotaResetAt, sekarang).toISOString(),
    balasan: { terpakai: terpakaiSekarang(workspace.aiCreditsUsed, workspace.quotaResetAt, sekarang), batas: getPlan(workspace.plan).aiCredits },
  };
}

export type PusatBisnis = Awaited<ReturnType<typeof muatPusatBisnis>>;

export function teksPusatBisnis(data: PusatBisnis) {
  return `Data tercatat di Palwise, ${data.hari} hari sampai ${data.diperbarui} (batas hari WIB). Periode pembanding memiliki durasi yang sama. Status kanal dari catatan terakhir; periksa status_whatsapp untuk koneksi terkini.\n` +
    `Pesan masuk: ${data.kini.pesan} (sebelumnya ${data.lalu.pesan}). Pelanggan yang chat: ${data.kini.aktif} (sebelumnya ${data.lalu.aktif}). Pelanggan baru: ${data.kini.baru} (sebelumnya ${data.lalu.baru}). Klaim pembayaran: ${data.kini.klaim} (sebelumnya ${data.lalu.klaim}); BUKAN pembayaran terverifikasi atau omzet.\n` +
    `Prioritas: ${data.jumlahPrioritas} obrolan; peluang: ${data.jumlahPeluang} obrolan; janji mulai hari ini: ${data.jumlahJanji}.\n` +
    `Tahap CRM saat ini (bukan konversi penjualan): ${data.tahap.map(t => `${t.nama}: ${t.jumlah}`).join(", ") || "belum ada"}.\n` +
    `Prioritas (maksimal 8):\n${data.prioritas.map(c => `- ${c.nama} (id: ${c.kontakId}): ${c.alasan}`).join("\n") || "Tidak ada."}\n` +
    `Peluang follow up (maksimal 8):\n${data.peluang.map(c => `- ${c.nama} (id: ${c.kontakId}): ${c.alasan}`).join("\n") || "Tidak ada yang memenuhi kriteria."}\n` +
    `Peluang dipilih dari tahap tertarik/negosiasi/closing, tidak aktif 1–30 hari, tanpa masalah, tidak meminta manusia, dan tidak dijeda. Baca obrolan sebelum menyusun draf; jangan anggap mereka siap membeli.\n` +
    `Janji (maksimal 8):\n${data.janji.map(c => `- ${c.nama}: ${c.waktu}, ${c.dipastikan ? "dipastikan pemilik" : "belum dipastikan"}, ${c.catatan || "tanpa catatan"}`).join("\n") || "Tidak ada."}\n` +
    `Kesiapan: ${data.info} info bisnis, cara bicara ${data.caraBicara ? "ada" : "belum ada"}. Kanal: ${data.kanal.map(k => `${k.name}: ${k.status}`).join(", ") || "belum ada"}.\nTidak ada data omzet, biaya iklan, atau sumber akuisisi dalam laporan ini. Jangan mengarang angka tersebut. Pisahkan temuan data dari saran eksperimen.`;
}
