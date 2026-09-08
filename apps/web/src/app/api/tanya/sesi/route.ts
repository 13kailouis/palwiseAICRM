import { NextResponse } from "next/server";
import { JUDUL_PASANG, SAPAAN_PASANG, prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Daftar utas ruang perintah, yang terbaru dipakai di atas. */
export async function GET() {
  const user = await requireUser();

  const sesi = await prisma.sesiTanya.findMany({
    where: { workspaceId: user.workspaceId },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: { id: true, judul: true, mode: true, updatedAt: true },
  });

  return NextResponse.json({ sesi });
}

/**
 * Utas baru.
 *
 * Kalau utas kosong yang paling atas masih ada, dia yang dipakai lagi. Tanpa
 * ini, menekan "Baru" tiga kali meninggalkan tiga baris kosong tak berjudul di
 * daftar riwayat, dan daftar yang penuh sampah berhenti dibaca orang.
 */
export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json().catch(() => ({}));
  const mode = body?.mode === "pasang" ? "pasang" : "perintah";

  const kosong = await prisma.sesiTanya.findFirst({
    where: { workspaceId: user.workspaceId, judul: "", mode },
    orderBy: { updatedAt: "desc" },
  });
  if (kosong) {
    const adaIsinya = await prisma.pesanTanya.count({
      where: { sesiId: kosong.id, peran: "pemilik" },
    });
    if (adaIsinya === 0) {
      return NextResponse.json({ id: kosong.id, mode, dipakaiUlang: true });
    }
  }

  const sesi = await prisma.sesiTanya.create({
    data: {
      workspaceId: user.workspaceId,
      mode,
      // Utas pemasangan sudah punya judul sejak lahir, karena di sini yang
      // bicara duluan Palwise, bukan pemiliknya. Judul dari "pesan pertama"
      // tidak akan pernah terisi kalau pesan pertamanya bukan dari dia.
      judul: mode === "pasang" ? JUDUL_PASANG : "",
    },
  });

  // Kalimat pembukanya ditulis LANGSUNG ke database, tanpa memanggil model.
  //
  // Ini kalimat pertama yang dibaca orang yang baru mendaftar. Dia tidak boleh
  // berubah-ubah tiap kali, tidak boleh gagal karena Google sedang penuh, dan
  // tidak boleh memakan jatah sebelum orangnya mengetik apa pun.
  if (mode === "pasang") {
    await prisma.pesanTanya.create({
      data: { sesiId: sesi.id, peran: "palwise", teks: SAPAAN_PASANG },
    });
  }

  return NextResponse.json({ id: sesi.id, mode });
}
