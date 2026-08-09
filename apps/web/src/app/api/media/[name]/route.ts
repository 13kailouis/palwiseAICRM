import { prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";
import { WORKER_BASE } from "@/lib/worker";

export const dynamic = "force-dynamic";

const TOKEN = process.env.INTERNAL_TOKEN || "palwise-dev-token";

/**
 * Sajikan lampiran dari pelanggan.
 *
 * Tahu nama berkasnya saja tidak cukup. Berkas itu harus benar-benar milik
 * salah satu obrolan di akun yang sedang login, kalau tidak foto pelanggan
 * satu bisnis bisa diintip bisnis lain.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const user = await requireUser();

  const bersih = name.replace(/[/\\]/g, "");

  // Boleh dilihat kalau berkas ini muncul di salah satu obrolan milik akun ini,
  // atau memang berkas galeri milik salah satu asistennya.
  const [pesan, aset] = await Promise.all([
    prisma.message.findFirst({
      where: {
        mediaPath: bersih,
        conversation: { workspaceId: user.workspaceId },
      },
      select: { id: true },
    }),
    prisma.mediaAsset.findFirst({
      where: { fileName: bersih, agent: { workspaceId: user.workspaceId } },
      select: { id: true },
    }),
  ]);

  if (!pesan && !aset) {
    return new Response("Tidak ditemukan", { status: 404 });
  }

  const res = await fetch(`${WORKER_BASE}/media/${encodeURIComponent(bersih)}`, {
    headers: { "x-internal-token": TOKEN },
    cache: "no-store",
  }).catch(() => null);

  if (!res || !res.ok || !res.body) {
    return new Response("Lampirannya tidak bisa diambil", { status: 502 });
  }

  return new Response(res.body, {
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/octet-stream",
      // Setahun, dan ditandai tidak akan pernah berubah.
      //
      // Nama berkasnya UUID acak dan tidak pernah dipakai ulang, jadi satu
      // alamat selamanya menunjuk isi yang sama persis. Dengan batas satu jam
      // seperti sebelumnya, foto bukti transfer yang sama diunduh ulang tiap
      // kali kotak masuk dibuka setelah lewat sejam, dan itu jatuh ke satu VPS
      // yang juga menjalankan mesin WhatsApp dan AI.
      //
      // "private" wajib tetap ada: lampiran ini milik satu akun, jadi cuma
      // boleh disimpan di browser orangnya, tidak boleh di cache bersama.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
