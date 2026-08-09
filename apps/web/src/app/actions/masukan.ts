"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";
import { bolehLihatFounder } from "@/lib/founder";

export interface MasukanState {
  ok?: boolean;
  error?: string;
}

const JENIS = ["bug", "saran", "lainnya"];
const MAKS_ISI = 2_000;

/**
 * Kirim masukan, saran, atau laporan bug.
 *
 * Tidak ada pemberitahuan ke mana pun, dan itu pilihan sadar: yang belum dibaca
 * ditandai di halaman founder. Kalau nanti mau dikabari lewat WhatsApp, jalurnya
 * sudah ada di `kirimKeNomorToko` milik worker.
 *
 * Identitas pengirimnya DISALIN, bukan diambil lewat relasi, supaya masukan dari
 * orang yang nanti berhenti tidak ikut terhapus bersama akunnya. Justru masukan
 * itu yang paling perlu dibaca.
 */
export async function kirimMasukanAction(
  _prev: MasukanState,
  formData: FormData,
): Promise<MasukanState> {
  const user = await requireUser();

  const jenis = String(formData.get("jenis") ?? "saran");
  const isi = String(formData.get("isi") ?? "").trim();
  const halaman = String(formData.get("halaman") ?? "").trim();

  // Batas bawahnya sengaja rendah. "Tombol simpan error" itu laporan bug yang
  // sah dan cuma 20 huruf, dan menolaknya berarti kehilangan laporan justru dari
  // orang yang sedang kesal dan tidak akan mencoba dua kali.
  if (isi.length < 5) {
    return { error: "Tulis dulu masukannya ya, minimal beberapa kata." };
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: user.workspaceId },
    select: { name: true },
  });

  await prisma.masukan.create({
    data: {
      jenis: JENIS.includes(jenis) ? jenis : "lainnya",
      isi: isi.slice(0, MAKS_ISI),
      halaman: halaman.slice(0, 200) || null,
      workspaceId: user.workspaceId,
      namaUsaha: workspace?.name ?? null,
      emailPengirim: user.email,
    },
  });

  return { ok: true };
}

/** Tandai satu masukan sudah dibaca. Cuma founder. */
export async function tandaiMasukanDibacaAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!bolehLihatFounder(user.email)) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.masukan.update({
    where: { id },
    data: { dibacaPada: new Date() },
  });

  revalidatePath("/app/founder");
}
