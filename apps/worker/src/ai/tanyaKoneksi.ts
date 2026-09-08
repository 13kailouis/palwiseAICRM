import { prisma } from "@palwise/db";
import { readChannelRuntimeStatus } from "../wa/runtimeStatus.js";

/** Read-only: an absent runtime session is disconnected, even if the saved status is connected. */
export async function koneksiTanya(workspaceId: string, bacaStatus?: (id: string) => string | null) {
  const channels = await prisma.channel.findMany({
    where: { workspaceId, type: "whatsapp_qr" },
    select: { id: true, name: true, status: true }, orderBy: { createdAt: "asc" },
  });
  const runtime = bacaStatus ?? readChannelRuntimeStatus;
  const nomor = channels.map(c => ({ nama: c.name, status: runtime(c.id) ?? (c.status === "logged_out" ? "logged_out" : "disconnected") }));
  const aktif = nomor.filter(c => c.status === "connected").length;
  const catatan = !nomor.length
    ? "WhatsApp belum ditautkan. Data ini hanya yang tersimpan di Palwise; chat baru belum tersinkron."
    : !aktif
      ? "WhatsApp sedang terputus. Data ini hanya yang tersimpan di Palwise; chat saat terputus belum tersinkron."
      : aktif < nomor.length
        ? `${aktif} dari ${nomor.length} nomor WhatsApp tersambung. Data nomor yang terputus mungkin belum lengkap.`
        : "";
  const label: Record<string, string> = { connected: "tersambung", connecting: "sedang menyambungkan", qr: "menunggu scan QR", logged_out: "tautan dicabut dari WhatsApp", disconnected: "terputus" };
  const ringkas = !nomor.length ? "WhatsApp belum ditautkan." : aktif === nomor.length
    ? `${nomor.length === 1 ? "WhatsApp" : `Semua ${nomor.length} nomor WhatsApp`} tersambung saat diperiksa.`
    : aktif ? `${aktif} dari ${nomor.length} nomor WhatsApp tersambung.` : "WhatsApp sedang terputus. Chat baru belum tersinkron ke Palwise.";
  return { aktif, jumlah: nomor.length, catatan, teks: ringkas + (nomor.length ? "\n\n" + nomor.map(c => `- ${c.nama}: ${label[c.status] ?? "belum tersambung"}`).join("\n") : "") };
}
