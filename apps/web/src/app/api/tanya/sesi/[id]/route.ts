import { NextResponse } from "next/server";
import { prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Isi satu utas. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireUser();

  // Kepemilikan diperiksa di kueri yang sama, bukan sesudahnya. Utas ruang
  // perintah berisi nama dan nomor pelanggan, jadi id yang ditebak orang lain
  // tidak boleh pernah mengembalikan satu baris pun.
  const sesi = await prisma.sesiTanya.findFirst({
    where: { id, workspaceId: user.workspaceId },
    include: { pesan: { orderBy: { createdAt: "asc" } } },
  });
  if (!sesi) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({
    id: sesi.id,
    judul: sesi.judul,
    mode: sesi.mode,
    pesan: sesi.pesan.map((p) => ({
      id: p.id,
      peran: p.peran,
      teks: p.teks,
      alat: JSON.parse(p.alat || "[]") as string[],
      usul: p.usul ? JSON.parse(p.usul) : null,
      usulStatus: p.usulStatus,
      usulPesan: p.usulPesan,
      createdAt: p.createdAt,
    })),
  });
}

/** Buang satu utas beserta isinya. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireUser();

  const hasil = await prisma.sesiTanya.deleteMany({
    where: { id, workspaceId: user.workspaceId },
  });
  if (hasil.count === 0) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
