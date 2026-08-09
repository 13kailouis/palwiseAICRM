import { NextResponse } from "next/server";
import { prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";
import { callWorker } from "@/lib/worker";

export const dynamic = "force-dynamic";

/**
 * Minta AI meringkas obrolan seorang pelanggan.
 *
 * Kepemilikannya dicek di sini, bukan di worker. Worker percaya pada token
 * internal, jadi kalau pemeriksaan ini dilewat, siapa pun yang sudah masuk bisa
 * meringkas pelanggan milik workspace lain hanya dengan menebak id-nya.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireUser();

  const contact = await prisma.contact.findFirst({
    where: { id, workspaceId: user.workspaceId },
    select: { id: true },
  });
  if (!contact) {
    return NextResponse.json({ error: "Pelanggan tidak ditemukan" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));

  try {
    const hasil = await callWorker(`/contacts/${id}/ringkas`, {
      method: "POST",
      body: { paksa: body?.paksa === true },
      timeoutMs: 60_000,
    });
    return NextResponse.json(hasil);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal meringkas" },
      { status: 502 },
    );
  }
}
