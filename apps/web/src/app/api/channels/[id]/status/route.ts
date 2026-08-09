import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";
import { callWorker } from "@/lib/worker";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireUser();

  const channel = await prisma.channel.findFirst({
    where: { id, workspaceId: user.workspaceId },
  });
  if (!channel) {
    return NextResponse.json({ error: "Channel tidak ditemukan" }, { status: 404 });
  }

  let live: any = null;
  try {
    live = await callWorker(`/channels/${id}/status`, { timeoutMs: 5000 });
  } catch {
    // worker mati — pakai data DB saja
  }

  // Status yang benar-benar berlaku, bukan yang terakhir sempat tersimpan.
  //
  // Baris ini dulu berbunyi `live?.status ?? channel.status`, dengan komentar
  // yang menyatakan status runtime lebih akurat. Padahal `live.status` itu
  // status dari DATABASE yang kebetulan dibacakan worker, dan `runtimeStatus`
  // yang benar-benar tahu keadaan soket dikirim worker lalu tidak pernah
  // dipakai sama sekali.
  //
  // Bedanya baru terasa waktu keduanya berselisih, dan justru itu saat yang
  // paling penting: worker hidup tapi nomornya tidak jalan, misalnya karena di
  // luar jatah paket atau tidak pernah berhasil disambungkan. Layarnya tetap
  // berkata "Nomor ini sudah jalan" untuk nomor yang tidak melayani siapa pun.
  //
  // Kalau worker hidup, dialah yang menentukan. `runtimeStatus` kosong berarti
  // tidak ada sesi sama sekali, dan itu artinya memang tidak tersambung, apa
  // pun yang tertulis di database.
  //
  // Satu pengecualian: "logged_out". Itu keadaan yang cuma database yang tahu,
  // karena sesinya memang sudah dihapus dan runtime tidak punya apa-apa untuk
  // dilaporkan. Dia bentuk yang lebih spesifik dari "tidak tersambung", dan
  // membuangnya berarti pemiliknya kehilangan satu-satunya keterangan bahwa
  // nomornya dicabut dari HP, bukan sekadar mati.
  const status = live
    ? (live.runtimeStatus ??
      (channel.status === "logged_out" ? "logged_out" : "disconnected"))
    : channel.status;
  const qr = live?.qr ?? channel.lastQr;

  let qrDataUrl: string | null = null;
  if (status === "qr" && qr) {
    qrDataUrl = await QRCode.toDataURL(qr, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: "L",
    });
  }

  return NextResponse.json({
    status,
    qrDataUrl,
    phoneNumber: live?.phoneNumber ?? channel.phoneNumber,
    error: live?.error ?? channel.lastError,
    workerUp: !!live,
  });
}
