"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";
import { callWorker } from "@/lib/worker";

export interface SambunganState {
  ok?: boolean;
  error?: string;
  message?: string;
}

function jumlahPelanggan(n: number): string {
  return `${n.toLocaleString("id-ID")} pelanggan`;
}

/**
 * Sambungkan Sheet tujuan untuk data pelanggan. Worker langsung menyalin
 * sekali, dan salinan pertama itu sekaligus ujinya: kalau robot belum diberi
 * akses, orangnya tahu di layar ini juga.
 */
export async function pasangSheetPelangganAction(
  _prev: SambunganState,
  formData: FormData,
): Promise<SambunganState> {
  try {
    const user = await requireUser();
    const url = String(formData.get("url") ?? "").trim();
    if (!url) return { error: "Tempel dulu tautan Google Sheet-nya." };

    const hasil = await callWorker<{ jumlah: number }>("/sheets/pelanggan", {
      method: "POST",
      body: { workspaceId: user.workspaceId, url },
      timeoutMs: 120_000,
    });
    revalidatePath("/app/sambungan");
    return {
      ok: true,
      message: `Tersambung. ${jumlahPelanggan(hasil.jumlah)} sudah tersalin ke tab "Pelanggan Palwise".`,
    };
  } catch (err) {
    revalidatePath("/app/sambungan");
    return { error: err instanceof Error ? err.message : "Gagal menyambungkan Sheet." };
  }
}

export async function salinSekarangAction(
  _prev: SambunganState,
  _formData: FormData,
): Promise<SambunganState> {
  try {
    const user = await requireUser();
    const hasil = await callWorker<{ jumlah: number }>("/sheets/pelanggan/salin", {
      method: "POST",
      body: { workspaceId: user.workspaceId },
      timeoutMs: 120_000,
    });
    revalidatePath("/app/sambungan");
    return { ok: true, message: `${jumlahPelanggan(hasil.jumlah)} tersalin barusan.` };
  } catch (err) {
    revalidatePath("/app/sambungan");
    return { error: err instanceof Error ? err.message : "Gagal menyalin." };
  }
}

/**
 * Berhenti menyalin. Isi Sheet-nya TIDAK dihapus: itu Sheet milik dia, dan
 * datanya memang sudah jadi miliknya. Yang berhenti cuma pembaruannya.
 */
export async function putuskanSheetPelangganAction(): Promise<void> {
  const user = await requireUser();
  await prisma.sambunganSheet.deleteMany({ where: { workspaceId: user.workspaceId } });
  revalidatePath("/app/sambungan");
}
