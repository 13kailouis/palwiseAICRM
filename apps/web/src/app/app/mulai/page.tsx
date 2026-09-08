import { redirect } from "next/navigation";
import { JUDUL_PASANG, SAPAAN_PASANG, prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Pintu masuk pemasangan lewat obrolan.
 *
 * Halaman ini tidak menggambar apa pun. Dia menyiapkan utas pemasangan lalu
 * melempar ke ruang perintah, supaya alamat yang dibagikan dan ditaruh di
 * tombol cukup satu yang gampang diingat, dan supaya orang yang membukanya dua
 * kali tidak berakhir dengan dua utas pemasangan setengah jalan.
 */
export default async function MulaiPage() {
  const user = await requireUser();

  // Utas pemasangan yang sudah ada dipakai lagi, bukan dibuat baru. Orang
  // berhenti di tengah dan kembali besoknya, dan waktu itu terjadi yang paling
  // buruk adalah kehilangan semua yang sudah dia ceritakan lalu ditanyai
  // "usahamu jualan apa" dari awal.
  const lama = await prisma.sesiTanya.findFirst({
    where: { workspaceId: user.workspaceId, mode: "pasang" },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  if (lama) redirect(`/app/tanya?s=${lama.id}`);

  const sesi = await prisma.sesiTanya.create({
    data: { workspaceId: user.workspaceId, mode: "pasang", judul: JUDUL_PASANG },
  });
  await prisma.pesanTanya.create({
    data: { sesiId: sesi.id, peran: "palwise", teks: SAPAAN_PASANG },
  });

  redirect(`/app/tanya?s=${sesi.id}`);
}
