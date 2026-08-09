"use server";

import { revalidatePath } from "next/cache";
import { bolehPakai, pesanTerkunci, prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";
import { callWorker } from "@/lib/worker";
import { buatKode, hapusBerkas, kenaliJenis, periksaBerkas, simpanBerkas } from "@/lib/berkas";
// Batasnya tinggal di lib/batas.ts, bukan di sini, karena berkas "use server"
// cuma boleh mengekspor fungsi async. Lihat catatan di sana.
import { MAKS_BERKAS } from "@/lib/batas";

export interface GaleriState {
  ok?: boolean;
  error?: string;
  message?: string;
}

async function pastikanMilikSendiri(agentId: string, workspaceId: string) {
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, workspaceId },
    select: { id: true },
  });
  if (!agent) throw new Error("Asisten ini bukan milik akun kamu.");
  return agent.id;
}

export async function tambahBerkasAction(
  _prev: GaleriState,
  formData: FormData,
): Promise<GaleriState> {
  try {
    const user = await requireUser();

    const workspace = await prisma.workspace.findUniqueOrThrow({
      where: { id: user.workspaceId },
    });
    if (!bolehPakai(workspace.plan, "kirimMedia")) {
      return { error: pesanTerkunci("kirimMedia", workspace.plan) };
    }

    const diminta = String(formData.get("agentId") ?? "");
    const agentId = diminta
      ? await pastikanMilikSendiri(diminta, user.workspaceId)
      : (
          await prisma.agent.findFirstOrThrow({
            where: { workspaceId: user.workspaceId },
            orderBy: { createdAt: "asc" },
          })
        ).id;

    const jumlah = await prisma.mediaAsset.count({ where: { agentId } });
    if (jumlah >= MAKS_BERKAS) {
      return {
        error: `Satu asisten muat ${MAKS_BERKAS} berkas. Hapus yang tidak terpakai dulu.`,
      };
    }

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { error: "Pilih gambarnya dulu." };
    }

    // Pemeriksaan yang sama persis dengan yang sudah jalan di browser. Yang di
    // browser itu demi kecepatan, yang di sini demi keamanan: formulir bisa
    // dikirim tanpa lewat halaman kita sama sekali.
    const keluhan = periksaBerkas(file);
    if (keluhan) return { error: keluhan };

    const jenis = kenaliJenis(file)!;

    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();

    if (!name) return { error: "Kasih judul dulu, ini yang jadi keterangan di WhatsApp." };
    if (description.length < 10) {
      return {
        error:
          "Jelaskan dulu kapan gambar ini pantas dikirim. Tanpa itu asistenmu tidak tahu kapan memakainya.",
      };
    }

    // Kode harus unik per asisten, karena inilah yang disebut AI saat memilih.
    let code = buatKode(name);
    const dipakai = await prisma.mediaAsset.findMany({
      where: { agentId },
      select: { code: true },
    });
    const daftar = new Set(dipakai.map((d) => d.code));
    if (daftar.has(code)) {
      let n = 2;
      while (daftar.has(`${code}-${n}`)) n++;
      code = `${code}-${n}`;
    }

    const isi = Buffer.from(await file.arrayBuffer());
    const fileName = simpanBerkas(isi, jenis.ext);

    const aset = await prisma.mediaAsset.create({
      data: {
        agentId,
        code,
        name: name.slice(0, 100),
        description: description.slice(0, 300),
        fileName,
        mimeType: file.type || `application/${jenis.ext}`,
        kind: jenis.kind,
        sizeBytes: isi.length,
      },
    });

    revalidatePath("/app/galeri");

    // Gambar bisa dikirim tanpa langkah ini. Membacanya yang membuat isinya
    // ikut diketahui, supaya foto daftar harga bukan cuma bisa dikirim tapi
    // juga bisa dijawab pertanyaannya.
    const bacaIsinya = formData.get("bacaIsinya") === "on" && jenis.kind === "image";
    if (!bacaIsinya) {
      return { ok: true, message: `"${name}" siap dikirim asistenmu.` };
    }

    try {
      await callWorker(`/assets/${aset.id}/read`, {
        method: "POST",
        timeoutMs: 180_000,
      });
      revalidatePath("/app/galeri");
      revalidatePath("/app/knowledge");
      return {
        ok: true,
        message: `"${name}" siap dikirim, dan isinya sudah dihafal juga.`,
      };
    } catch (err) {
      return {
        ok: true,
        message: `"${name}" siap dikirim, tapi isinya belum sempat dibaca: ${
          err instanceof Error ? err.message : "mesinnya sedang bermasalah"
        } Klik "Baca isinya" di daftar untuk mencoba lagi.`,
      };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Gagal menyimpan." };
  }
}

export async function ubahBerkasAction(
  _prev: GaleriState,
  formData: FormData,
): Promise<GaleriState> {
  try {
    const user = await requireUser();
    const id = String(formData.get("id") ?? "");

    const aset = await prisma.mediaAsset.findFirst({
      where: { id, agent: { workspaceId: user.workspaceId } },
    });
    if (!aset) return { error: "Berkas ini bukan milik akun kamu." };

    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    if (!name) return { error: "Judulnya tidak boleh kosong." };
    if (description.length < 10) {
      return { error: "Keterangan kapan dikirimnya terlalu pendek." };
    }

    await prisma.mediaAsset.update({
      where: { id },
      data: { name: name.slice(0, 100), description: description.slice(0, 300) },
    });

    revalidatePath("/app/galeri");
    return { ok: true, message: "Perubahan tersimpan." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Gagal menyimpan." };
  }
}

/** Baca ulang isi gambar, atau baca untuk pertama kali. */
export async function bacaIsiBerkasAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  const aset = await prisma.mediaAsset.findFirst({
    where: { id, agent: { workspaceId: user.workspaceId } },
  });
  if (!aset) return;

  try {
    await callWorker(`/assets/${id}/read`, { method: "POST", timeoutMs: 180_000 });
  } catch {
    // Alasan gagalnya sudah dicatat worker di kolom readError.
  }

  revalidatePath("/app/galeri");
  revalidatePath("/app/knowledge");
}

export async function hapusBerkasAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  const aset = await prisma.mediaAsset.findFirst({
    where: { id, agent: { workspaceId: user.workspaceId } },
  });
  if (!aset) return;

  // Catatan hasil bacaannya ikut dihapus, kalau tidak asisten tetap menjawab
  // dari harga di gambar yang sudah tidak ada.
  if (aset.knowledgeSourceId) {
    await prisma.knowledgeSource
      .delete({ where: { id: aset.knowledgeSourceId } })
      .catch(() => null);
  }

  await prisma.mediaAsset.delete({ where: { id } });
  hapusBerkas(aset.fileName);
  revalidatePath("/app/galeri");
  revalidatePath("/app/knowledge");
}
