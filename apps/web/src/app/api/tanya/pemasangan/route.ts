import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { bacaPemasangan } from "@/lib/pemasangan";

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
  return NextResponse.json(await bacaPemasangan(user.workspaceId));
}
