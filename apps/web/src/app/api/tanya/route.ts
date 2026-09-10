import { NextResponse } from "next/server";
import { mintaSambunganWhatsApp, prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";
import { streamWorker, WorkerError } from "@/lib/worker";

export const dynamic = "force-dynamic";

/** Satu perintah di ruang perintah. */
export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json().catch(() => ({}));

  const sesiId = String(body?.sesiId ?? "");
  const pesan = String(body?.pesan ?? "").trim();

  if (!pesan) {
    return NextResponse.json({ error: "Perintahnya kosong" }, { status: 400 });
  }
  if (pesan.length > 2000) return NextResponse.json({ error: "Pesan maksimal 2.000 karakter. Ringkas dulu ya." }, { status: 400 });

  // Utasnya dipastikan milik akun ini DI SINI, sebelum apa pun dikirim ke
  // worker. Worker memeriksa lagi, dan dua pemeriksaan itu memang disengaja:
  // yang di sini menjaga jalur dashboard, yang di sana menjaga endpoint-nya
  // sendiri.
  const sesi = await prisma.sesiTanya.findFirst({
    where: { id: sesiId, workspaceId: user.workspaceId },
    select: { id: true },
  });
  if (!sesi) {
    return NextResponse.json({ error: "Utasnya tidak ketemu" }, { status: 404 });
  }

  // Device linking is a first-party control, not an image search or an LLM task.
  // Persist only the card marker; short-lived QR credentials are fetched live.
  if (mintaSambunganWhatsApp(pesan)) {
    const hasil = await prisma.$transaction(async tx => {
      const pemilik = await tx.pesanTanya.create({ data: { sesiId: sesi.id, peran: "pemilik", teks: pesan } });
      const jawaban = await tx.pesanTanya.create({ data: {
        sesiId: sesi.id, peran: "palwise",
        teks: "Tautkan WhatsApp lewat kartu di bawah.",
        alat: JSON.stringify(["sambungkan_whatsapp"]),
      } });
      const utas = await tx.sesiTanya.findUniqueOrThrow({ where: { id: sesi.id } });
      await tx.sesiTanya.update({ where: { id: sesi.id }, data: { updatedAt: new Date(), ...(utas.judul ? {} : { judul: pesan.slice(0, 70) }) } });
      return [pemilik, jawaban];
    });
    return NextResponse.json({ pesan: hasil.map(p => ({ ...p, alat: JSON.parse(p.alat), hasilBaca: [], usul: null })) });
  }

  // The answer streams from the worker as server-sent events and is passed straight through.
  // no-transform keeps compression from buffering it; if the owner leaves, the worker still saves.
  try {
    const alir = await streamWorker("/tanya/alir", { workspaceId: user.workspaceId, sesiId: sesi.id, pesan }, req.signal);
    return new Response(alir.body, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        "x-accel-buffering": "no",
      },
    });
  } catch (err) {
    if (err instanceof WorkerError && err.status === 429) {
      return NextResponse.json(err.data ?? { error: err.message }, { status: 429 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menjalankan perintah" },
      { status: 502 },
    );
  }
}
