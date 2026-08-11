"use server";

import { revalidatePath } from "next/cache";
import { getPlan, prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";
import { callWorker } from "@/lib/worker";

export interface KnowledgeState {
  ok?: boolean;
  error?: string;
  message?: string;
}

const MAX_CONTENT = 200_000; // karakter

/**
 * Rapikan jadi satu baris, untuk judul yang diambil dari isinya.
 *
 * Judul dibuat dari 60 huruf pertama isi catatan, dan isi catatan hampir selalu
 * ditempel dari tempat lain, jadi 60 huruf itu sering memuat pindah baris di
 * tengahnya. Yang tersimpan lalu berbunyi
 * "Harga remap mobil bensin 1.500.000\r\nHarga remap mobil diesel", dan di
 * layar terbaca sebagai satu kalimat sambung yang membingungkan. Terlihat di
 * akun sungguhan 11 Agustus 2026.
 */
function satuBaris(teks: string): string {
  return teks.replace(/\s+/g, " ").trim();
}

/**
 * Info bisnis menempel ke satu asisten. Kalau formnya menyebut asisten mana,
 * pakai itu (setelah dipastikan miliknya); kalau tidak, pakai yang pertama.
 */
async function resolveAgentId(
  workspaceId: string,
  requested: string | null,
): Promise<string> {
  if (requested) {
    const owned = await prisma.agent.findFirst({
      where: { id: requested, workspaceId },
      select: { id: true },
    });
    if (owned) return owned.id;
  }

  const agent = await prisma.agent.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
  });
  if (!agent) throw new Error("Belum ada asisten di akun ini.");
  return agent.id;
}

// Catatan: tipe "website" dan "file" tidak lewat sini. Keduanya butuh proses
// baca yang panjang dengan laporan kemajuan, lalu hasilnya diperiksa pengguna
// sebelum disimpan. Jalurnya ada di /api/knowledge/scrape,
// /api/knowledge/extract-file, dan /api/knowledge/save-import.
// Yang lewat sini cuma "text" dan "qna", yang isinya diketik langsung.

/**
 * Buang pembungkus blok kode dari hasil salinan AI lain.
 *
 * Perintahnya memang menyuruh membungkus hasilnya dalam blok kode supaya
 * batasnya jelas, jadi tanda kutip tiganya hampir pasti ikut tersalin.
 * Membiarkannya berarti tanda itu ikut dihafal sebagai isi.
 */
function buangBlokKode(teks: string): string {
  let hasil = teks.trim();

  // Beberapa AI menambahkan kalimat pengantar sebelum bloknya.
  const mulai = hasil.indexOf("```");
  if (mulai >= 0) {
    const akhir = hasil.lastIndexOf("```");
    if (akhir > mulai) {
      hasil = hasil.slice(mulai + 3, akhir);
      // Baris pertama bisa berisi nama bahasa, misalnya "markdown" atau "text".
      hasil = hasil.replace(/^[a-z]*\r?\n/i, "");
    } else {
      hasil = hasil.slice(mulai + 3).replace(/^[a-z]*\r?\n/i, "");
    }
  }

  return hasil.trim();
}

export async function addKnowledgeAction(
  _prev: KnowledgeState,
  formData: FormData,
): Promise<KnowledgeState> {
  try {
    const user = await requireUser();
    const agentId = await resolveAgentId(
      user.workspaceId,
      String(formData.get("agentId") ?? "") || null,
    );

    const workspace = await prisma.workspace.findUniqueOrThrow({
      where: { id: user.workspaceId },
    });
    const plan = getPlan(workspace.plan);
    const count = await prisma.knowledgeSource.count({
      where: { agent: { workspaceId: user.workspaceId } },
    });
    if (count >= plan.maxKnowledgeSources) {
      return {
        error: `Paket ${plan.name} muat ${plan.maxKnowledgeSources} catatan. Naikkan paket dulu kalau mau nambah.`,
      };
    }

    const type = String(formData.get("type") ?? "text");
    let title = String(formData.get("title") ?? "").trim();
    let content = "";

    if (type === "qna") {
      const question = String(formData.get("question") ?? "").trim();
      const answer = String(formData.get("answer") ?? "").trim();
      if (!question || !answer) {
        return { error: "Pertanyaan dan jawabannya diisi dulu ya." };
      }
      title = title || satuBaris(question).slice(0, 80);
      content = `Pertanyaan: ${question}\nJawaban: ${answer}`;
    } else if (type === "ai") {
      content = buangBlokKode(String(formData.get("content") ?? ""));
      if (content.length < 40) {
        return {
          error:
            "Jawabannya belum ditempel, atau isinya terlalu sedikit. Salin semua isi blok kodenya, bukan cuma sebagian.",
        };
      }
      title = title || "Pengetahuan dari AI lain";
    } else {
      content = String(formData.get("content") ?? "").trim();
      if (content.length < 20) {
        return { error: "Isinya terlalu pendek." };
      }
      title = title || satuBaris(content).slice(0, 60);
    }

    if (content.length > MAX_CONTENT) {
      content = content.slice(0, MAX_CONTENT);
    }

    // Catatan yang isinya sama persis TIDAK ditambah dua kali.
    //
    // Terlihat di akun sungguhan 11 Agustus 2026: satu pemilik usaha punya
    // enam catatan berjudul sama, dan dua pasang di antaranya tersimpan
    // berjarak EMPAT DETIK dengan isi yang identik huruf per huruf. Itu bukan
    // orang yang mengetik dua kali, itu satu tombol yang tertekan dua kali.
    //
    // Ruginya bukan cuma daftar yang berantakan. Pencarian mengambil sejumlah
    // potongan per pertanyaan, jadi salinan yang sama saling berebut tempat di
    // situ dan mendorong keluar catatan lain yang justru dibutuhkan.
    const kembar = await prisma.knowledgeSource.findFirst({
      where: { agentId, content },
      select: { title: true },
    });
    if (kembar) {
      return {
        ok: true,
        message: `Isinya sama persis dengan catatan "${kembar.title}" yang sudah ada, jadi tidak ditambah lagi. Kalau mau mengubah isinya, buka catatan itu dan sunting di sana.`,
      };
    }

    const source = await prisma.knowledgeSource.create({
      data: { agentId, type, title, content, status: "pending" },
    });

    // Embedding dibuat di worker (dia yang pegang API key AI).
    try {
      await callWorker(`/knowledge/${source.id}/index`, { method: "POST" });
    } catch {
      return {
        ok: true,
        message:
          "Tersimpan, tapi belum sempat dihafal karena mesinnya sedang mati. Klik Hafalkan lagi kalau sudah menyala.",
      };
    }

    revalidatePath("/app/knowledge");
    return { ok: true, message: `"${title}" sudah dihafal.` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Gagal menyimpan." };
  }
}

/**
 * Ubah isi catatan yang sudah tersimpan, lalu hafalkan ulang.
 *
 * Menghafal ulang wajib: potongan lama beserta angka penandanya dibuat dari
 * teks yang lama, jadi kalau tidak diperbarui, asisten masih menjawab pakai
 * versi sebelum diedit.
 */
export async function updateKnowledgeAction(
  _prev: KnowledgeState,
  formData: FormData,
): Promise<KnowledgeState> {
  try {
    const user = await requireUser();
    const id = String(formData.get("id") ?? "");

    const owned = await prisma.knowledgeSource.findFirst({
      where: { id, agent: { workspaceId: user.workspaceId } },
    });
    if (!owned) return { error: "Catatan ini bukan milik akun kamu." };

    const content = String(formData.get("content") ?? "").trim();
    if (content.length < 20) return { error: "Isinya terlalu pendek." };

    const title =
      String(formData.get("title") ?? "").trim().slice(0, 120) || owned.title;

    const unchanged = content === owned.content && title === owned.title;
    if (unchanged) {
      return { ok: true, message: "Tidak ada yang berubah." };
    }

    await prisma.knowledgeSource.update({
      where: { id },
      data: {
        title,
        content: content.slice(0, MAX_CONTENT),
        // Ditandai belum dihafal sampai proses di bawah berhasil.
        status: "pending",
        error: null,
      },
    });

    try {
      await callWorker(`/knowledge/${id}/index`, { method: "POST" });
    } catch {
      revalidatePath("/app/knowledge");
      return {
        ok: true,
        message:
          "Perubahan tersimpan, tapi belum sempat dihafal karena mesinnya sedang mati. Klik Hafalkan lagi kalau sudah menyala.",
      };
    }

    revalidatePath("/app/knowledge");
    return { ok: true, message: "Perubahan tersimpan dan sudah dihafal ulang." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Gagal menyimpan." };
  }
}

export async function reindexKnowledgeAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const owned = await prisma.knowledgeSource.findFirst({
    where: { id, agent: { workspaceId: user.workspaceId } },
  });
  if (!owned) return;

  try {
    await callWorker(`/knowledge/${id}/index`, { method: "POST" });
  } catch {
    // status error sudah dicatat worker
  }
  revalidatePath("/app/knowledge");
}

export async function deleteKnowledgeAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const owned = await prisma.knowledgeSource.findFirst({
    where: { id, agent: { workspaceId: user.workspaceId } },
  });
  if (!owned) return;

  try {
    await callWorker(`/knowledge/${id}/delete`, { method: "POST" });
  } catch {
    // Jalur cadangan waktu worker mati atau sedang error.
    //
    // Menghapus langsung ke database berarti worker tidak pernah diberi tahu,
    // jadi cache vektornya masih memegang catatan yang barusan dibuang dan
    // asistennya tetap menyebutkan isinya ke pelanggan. Dulu itu berlangsung
    // sampai ada yang kebetulan menyalakan ulang prosesnya, dan untuk catatan
    // harga yang sengaja dihapus itu justru yang paling merugikan.
    //
    // Sekarang cache-nya memeriksa sendiri lewat sidik jari isi tabel, jadi
    // penghapusan langsung begini ikut ketahuan pada pesan berikutnya. Baris
    // ini aman, dan komentarnya ditinggal supaya tidak ada yang membuang
    // pemeriksaan itu dengan alasan "toh selalu lewat worker".
    await prisma.knowledgeSource.delete({ where: { id } }).catch(() => null);
  }
  revalidatePath("/app/knowledge");
}
