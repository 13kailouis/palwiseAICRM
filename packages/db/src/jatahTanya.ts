import { randomUUID } from "node:crypto";
import { prisma } from "./index.js";
import { getPlan, KUOTA_TANYA, TANYA_BELUM_VERIFIKASI, type PlanId } from "./plans.js";

export type AlasanBatasTanya = "verifikasi" | "bulanan" | "harian" | "cepat" | "percobaan";
export interface JatahTanya {
  paket: PlanId;
  namaPaket: string;
  terpakai: number;
  batas: number;
  sisa: number;
  harian: { terpakai: number; batas: number; sisa: number };
  belumKonfirmasi: boolean;
  habis: boolean;
  alasan: AlasanBatasTanya | null;
  pesan: string | null;
  resetAt: string | null;
  resetBulanan: string;
}

/** Kalender WIB, sama pada server UTC dan laptop Windows. */
export function periodeTanya(now = new Date()) {
  const lokal = new Date(now.getTime() + 7 * 3_600_000);
  const y = lokal.getUTCFullYear(), m = lokal.getUTCMonth(), d = lokal.getUTCDate();
  const tanggal = (bulan: number, hari: number) => new Date(Date.UTC(y, bulan, hari) - 7 * 3_600_000);
  return { hari: tanggal(m, d), besok: tanggal(m, d + 1), bulan: tanggal(m, 1), berikutnya: tanggal(m + 1, 1) };
}

async function konteks(workspaceId: string, now: Date) {
  const ws = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { plan: true, langgananSampai: true } });
  // Jangan bergantung pada jeda scheduler untuk mencabut kuota paket kedaluwarsa.
  const paket = getPlan(ws.langgananSampai && ws.langgananSampai <= now ? "free" : ws.plan);
  const owner = await prisma.user.findFirst({ where: { workspaceId, role: "owner", emailVerifiedAt: { not: null } }, select: { id: true } });
  const belumKonfirmasi = paket.id === "free" && !owner;
  const periode = periodeTanya(now);
  return { ws, paket, belumKonfirmasi, periode, kuota: KUOTA_TANYA[paket.id] };
}

export async function ambilJatahTanya(workspaceId: string, now = new Date()): Promise<JatahTanya> {
  const { paket, belumKonfirmasi, periode, kuota } = await konteks(workspaceId, now);
  const hitung = (dari: Date, ditagih: boolean) => prisma.pemakaianTanya.count({ where: {
    workspaceId, createdAt: { gte: dari }, ...(ditagih ? { status: { not: "failed" } } : {}),
  } });
  const [bulanan, harian, semua, cepat, percobaan] = await Promise.all([
    hitung(periode.bulan, true), hitung(periode.hari, true),
    belumKonfirmasi ? hitung(new Date(0), true) : 0,
    hitung(new Date(now.getTime() - 60_000), false), hitung(periode.hari, false),
  ]);
  const batas = belumKonfirmasi ? TANYA_BELUM_VERIFIKASI : kuota.bulanan;
  const terpakai = belumKonfirmasi ? semua : bulanan;
  const alasan: AlasanBatasTanya | null = terpakai >= batas ? (belumKonfirmasi ? "verifikasi" : "bulanan")
    : harian >= kuota.harian ? "harian" : percobaan >= kuota.harian + 5 ? "percobaan" : cepat >= 3 ? "cepat" : null;
  const reset = alasan === "verifikasi" ? null : alasan === "cepat" ? new Date(now.getTime() + 60_000)
    : alasan === "harian" || alasan === "percobaan" ? periode.besok : periode.berikutnya;
  const tanggal = periode.berikutnya.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long" });
  const pesan = alasan === "verifikasi" ? `Jatah coba ${TANYA_BELUM_VERIFIKASI} pertanyaan AI habis. Verifikasi email untuk memakai kuota gratis ${kuota.bulanan} per bulan.`
    : alasan === "bulanan" ? `Kuota Tanya bulan ini habis. Terisi lagi ${tanggal}${paket.id === "pro" ? "." : ", atau pilih paket dengan kuota lebih besar."}`
    : alasan === "harian" ? "Batas Tanya hari ini tercapai. Bisa digunakan lagi besok pukul 00.00 WIB."
    : alasan === "cepat" ? "Terlalu banyak pertanyaan sekaligus. Tunggu satu menit, lalu coba lagi."
    : alasan === "percobaan" ? "Batas percobaan hari ini tercapai. Coba lagi besok pukul 00.00 WIB." : null;
  return { paket: paket.id, namaPaket: paket.name, terpakai, batas, sisa: Math.max(0, batas - terpakai),
    harian: { terpakai: harian, batas: kuota.harian, sisa: Math.max(0, kuota.harian - harian) },
    belumKonfirmasi, habis: !!alasan, alasan, pesan, resetAt: reset?.toISOString() ?? null, resetBulanan: periode.berikutnya.toISOString() };
}

export class BatasTanyaError extends Error {
  constructor(readonly jatah: JatahTanya) { super(jatah.pesan ?? "Kuota berubah. Coba lagi."); }
}

/** Satu INSERT bersyarat: hitung dan reservasi atomik, termasuk tab/perangkat lain. */
export async function pesanJatahTanya(workspaceId: string, now = new Date()): Promise<string> {
  const { ws, kuota, belumKonfirmasi, periode } = await konteks(workspaceId, now);
  const id = randomUUID();
  const mulai = belumKonfirmasi ? new Date(0) : periode.bulan;
  const batas = belumKonfirmasi ? TANYA_BELUM_VERIFIKASI : kuota.bulanan;
  const menit = new Date(now.getTime() - 60_000);
  const jumlah = await prisma.$executeRaw`
    INSERT INTO PemakaianTanya (id, workspaceId, createdAt, status)
    SELECT ${id}, ${workspaceId}, ${now}, 'reserved'
    WHERE EXISTS (SELECT 1 FROM Workspace WHERE id = ${workspaceId} AND plan = ${ws.plan}
      AND langgananSampai IS ${ws.langgananSampai})
    AND (SELECT COUNT(*) FROM PemakaianTanya WHERE workspaceId = ${workspaceId} AND createdAt >= ${mulai} AND status != 'failed') < ${batas}
    AND (SELECT COUNT(*) FROM PemakaianTanya WHERE workspaceId = ${workspaceId} AND createdAt >= ${periode.hari} AND status != 'failed') < ${kuota.harian}
    AND (SELECT COUNT(*) FROM PemakaianTanya WHERE workspaceId = ${workspaceId} AND createdAt >= ${menit}) < 3
    AND (SELECT COUNT(*) FROM PemakaianTanya WHERE workspaceId = ${workspaceId} AND createdAt >= ${periode.hari}) < ${kuota.harian + 5}
  `;
  if (jumlah !== 1) throw new BatasTanyaError(await ambilJatahTanya(workspaceId, now));
  return id;
}

/** ID reservasi mencegah refund ganda dan tidak memotong pemakaian periode baru. */
export async function selesaikanJatahTanya(id: string, berhasil: boolean) {
  await prisma.pemakaianTanya.updateMany({ where: { id, status: "reserved" }, data: {
    status: berhasil ? "success" : "failed", selesaiPada: new Date(),
  } });
}
