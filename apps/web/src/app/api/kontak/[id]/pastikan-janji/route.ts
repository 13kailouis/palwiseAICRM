import { NextResponse } from "next/server";
import { prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";
import { callWorker } from "@/lib/worker";

export const dynamic = "force-dynamic";

/**
 * Pastikan jadwal, dan kalau diminta, kabari pelanggannya sekalian.
 *
 * URUTANNYA SENGAJA: kirim dulu, baru tandai pasti. Kalau dibalik, pengiriman
 * yang gagal meninggalkan keadaan paling berbahaya di seluruh fitur ini,
 * jadwal yang tertulis "sudah dipastikan" padahal tidak ada satu pun pesan yang
 * pernah sampai ke pelanggannya. Pemiliknya akan menganggap urusan itu beres.
 *
 * Ini juga TIDAK mematikan asisten di obrolan itu, berbeda dengan membalas
 * manual dari kotak masuk. Memastikan jadwal bukan tanda pemiliknya mau
 * mengambil alih percakapannya.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireUser();

  const contact = await prisma.contact.findFirst({
    where: { id, workspaceId: user.workspaceId },
    include: {
      conversations: {
        where: { channelId: { not: null } },
        orderBy: { lastMessageAt: "desc" },
        take: 1,
        select: { id: true },
      },
    },
  });
  if (!contact) {
    return NextResponse.json({ error: "Pelanggan tidak ditemukan" }, { status: 404 });
  }
  if (!contact.janjiPada) {
    return NextResponse.json(
      { error: "Belum ada janji yang bisa dipastikan." },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const kabari = body?.kabari === true;
  const teks = String(body?.teks ?? "").trim();

  if (kabari) {
    const obrolan = contact.conversations[0];
    if (!obrolan) {
      return NextResponse.json(
        {
          error:
            "Pelanggan ini belum punya obrolan lewat nomor WhatsApp yang tersambung, jadi pesannya tidak bisa dikirim. Pakai “Cukup pastikan” saja.",
        },
        { status: 400 },
      );
    }
    if (!teks) {
      return NextResponse.json({ error: "Pesannya kosong." }, { status: 400 });
    }

    try {
      await callWorker(`/conversations/${obrolan.id}/reply`, {
        method: "POST",
        body: { text: teks },
        timeoutMs: 30_000,
      });
    } catch (err) {
      return NextResponse.json(
        {
          error:
            (err instanceof Error ? err.message : "Gagal mengirim") +
            " Jadwalnya belum ditandai pasti, jadi kamu bisa coba lagi.",
        },
        { status: 502 },
      );
    }
  }

  await prisma.contact.update({
    where: { id: contact.id },
    data: { janjiDipastikan: true },
  });

  return NextResponse.json({ ok: true, terkirim: kabari });
}
