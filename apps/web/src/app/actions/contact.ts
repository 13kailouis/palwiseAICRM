"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, stringifyJson } from "@palwise/db";
import { requireUser } from "@/lib/auth";

const STAGES = ["baru", "tertarik", "negosiasi", "closing", "selesai", "batal"];

export async function updateContactAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  const contact = await prisma.contact.findFirst({
    where: { id, workspaceId: user.workspaceId },
  });
  if (!contact) return;

  const data: Record<string, unknown> = {};

  const stage = String(formData.get("stage") ?? "");
  if (STAGES.includes(stage)) {
    data.stage = stage;
    // Kalau tim yang menandai selesai, hitung mundur tanya kabar mulai dari
    // sekarang. Kalau dikembalikan ke tahap lain, patokannya dibatalkan.
    if (stage === "selesai" && contact.stage !== "selesai") {
      data.closedAt = new Date();
    } else if (stage !== "selesai") {
      data.closedAt = null;
    }
  }

  // Janji temu.
  //
  // Kolom kosong berarti "hapus janjinya", dan itu memang yang diharapkan orang
  // waktu dia mengosongkan kotaknya lalu menyimpan. Bedanya dengan AI: AI tidak
  // pernah boleh menghapus, pemiliknya boleh.
  if (formData.has("janjiPada")) {
    const v = String(formData.get("janjiPada") ?? "").trim();
    const d = v ? new Date(v) : null;
    data.janjiPada = d && !Number.isNaN(d.getTime()) ? d : null;
    if (!data.janjiPada) data.janjiCatatan = null;
  }
  // Cuma disimpan kalau waktunya ikut dikirim dan sah. Catatan tanpa waktu itu
  // setengah kabar yang bikin orang mengira ada janji padahal tidak ada yang
  // tahu kapan.
  if (formData.has("janjiCatatan") && data.janjiPada) {
    data.janjiCatatan = String(formData.get("janjiCatatan") ?? "").trim() || null;
  }

  // Jadwal yang diketik sendiri oleh pemiliknya langsung dianggap pasti: kalau
  // dia yang mengetik jamnya, dia sudah melihat kalendernya.
  //
  // Menaikkan status janji yang DICATAT AI bukan di sini, tapi lewat
  // /api/kontak/[id]/pastikan-janji, karena di sana ada pilihan mengabari
  // pelanggannya sekalian dan urutan kirim-dulu-baru-tandai harus dijaga.
  if (formData.has("janjiPada")) {
    data.janjiDipastikan = data.janjiPada !== null;
  }

  // Menandai masalahnya beres. Cuma pemilik toko yang boleh, bukan AI.
  if (formData.get("bereskanMasalah") === "1") {
    data.masalah = null;
    data.masalahSejak = null;
  }

  if (formData.has("name")) data.name = String(formData.get("name") ?? "").trim();
  if (formData.has("email")) {
    const email = String(formData.get("email") ?? "").trim();
    data.email = email || null;
  }
  if (formData.has("businessName")) {
    const v = String(formData.get("businessName") ?? "").trim();
    data.businessName = v || null;
  }
  // Bidang usaha ikut bisa dikoreksi. Dulu tidak, jadi tebakan AI yang meleset
  // ("Bidang usaha: kopi" untuk klinik) menempel selamanya dan tidak ada cara
  // membetulkannya lewat layar mana pun.
  if (formData.has("industry")) {
    const v = String(formData.get("industry") ?? "").trim();
    data.industry = v || null;
  }
  if (formData.has("notes")) data.notes = String(formData.get("notes") ?? "").trim();
  if (formData.has("tags")) {
    const tags = String(formData.get("tags") ?? "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 10);
    data.tags = stringifyJson(tags);
  }

  if (Object.keys(data).length > 0) {
    await prisma.contact.update({ where: { id }, data });
  }
  revalidatePath("/app/kontak");
  revalidatePath(`/app/kontak/${id}`);
}

/**
 * Hapus satu pelanggan beserta seluruh obrolannya.
 *
 * Sesudah menghapus, halaman profilnya sudah tidak ada, jadi harus dilempar
 * balik ke daftar. Tanpa redirect, orangnya berdiri di halaman yang isinya
 * "tidak ditemukan" dan mengira penghapusannya gagal.
 */
export async function deleteContactAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const contact = await prisma.contact.findFirst({
    where: { id, workspaceId: user.workspaceId },
  });
  if (contact) await prisma.contact.delete({ where: { id } });
  revalidatePath("/app/kontak");
  redirect("/app/kontak");
}
