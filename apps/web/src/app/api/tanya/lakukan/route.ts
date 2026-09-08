import { NextResponse } from "next/server";
import { prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";
import { callWorker } from "@/lib/worker";

export const dynamic = "force-dynamic";

/**
 * Kerjakan atau batalkan usul yang tampil sebagai kartu.
 *
 * Isi pesannya TIDAK ikut dikirim dari layar. Yang dikirim cuma id barisnya,
 * dan worker membaca isinya sendiri dari database. Kalau teksnya boleh datang
 * dari klien, kartu yang dibaca pemilik toko dan pesan yang sampai ke
 * pelanggan bisa berbeda, dan seluruh gunanya menampilkan dulu jadi hilang.
 */
export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json().catch(() => ({}));

  const pesanId = String(body?.pesanId ?? "");
  const batal = body?.batal === true;

  const baris = await prisma.pesanTanya.findFirst({
    where: { id: pesanId, sesi: { workspaceId: user.workspaceId } },
    select: { id: true },
  });
  if (!baris) {
    return NextResponse.json({ error: "Usulnya tidak ketemu" }, { status: 404 });
  }

  try {
    const hasil = await callWorker(batal ? "/tanya/batal" : "/tanya/lakukan", {
      method: "POST",
      body: {
        workspaceId: user.workspaceId,
        pesanId: baris.id,
        ambilAlih: body?.ambilAlih === true,
      },
      timeoutMs: 60_000,
    });
    return NextResponse.json(hasil);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengirim" },
      { status: 502 },
    );
  }
}
