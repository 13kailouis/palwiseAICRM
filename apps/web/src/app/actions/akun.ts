"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  UMUR_VERIFIKASI_JAM,
  mintaVerifikasiEmail,
  prisma,
} from "@palwise/db";
import {
  kirimEmail,
  suratEmailDiganti,
  suratVerifikasi,
} from "@/lib/email";
import { asalApp } from "@/lib/situs";
import {
  createSession,
  hashPassword,
  requireUser,
  verifyPassword,
} from "@/lib/auth";

export interface AkunState {
  error?: string;
  pesan?: string;
}

/**
 * Kirim (atau kirim ulang) tautan konfirmasi email ke alamat yang berlaku
 * sekarang. Dipakai tombol di garis peringatan dan di halaman Akun.
 */
export async function kirimVerifikasiAction(
  _prev: AkunState,
  _formData: FormData,
): Promise<AkunState> {
  const user = await requireUser();
  const hasil = await mintaVerifikasiEmail(user.id);

  if (!hasil.token) {
    if (hasil.alasan === "sudah_terkonfirmasi") {
      return { pesan: "Emailnya sudah dikonfirmasi." };
    }
    if (hasil.alasan === "terlalu_sering") {
      return {
        error:
          "Sudah beberapa kali dikirim dalam sejam terakhir. Cek kotak masuk " +
          "dan folder spam dulu ya, atau tunggu sebentar.",
      };
    }
    return { error: "Gagal menyiapkan tautan. Coba lagi sebentar lagi." };
  }

  const kepala = await headers();
  const tautan = `${asalApp(kepala.get("host") ?? undefined)}/verifikasi?token=${encodeURIComponent(hasil.token)}`;
  const surat = suratVerifikasi(user.name || "kak", tautan, UMUR_VERIFIKASI_JAM);
  const kirim = await kirimEmail({ ...surat, ke: hasil.email! });

  if (!kirim.terkirim && kirim.alasan !== "RESEND_API_KEY belum diisi") {
    return { error: "Emailnya gagal dikirim dari pihak kami. Coba lagi sebentar lagi." };
  }

  revalidatePath("/app/akun");
  return { pesan: `Tautan konfirmasi dikirim ke ${hasil.email}. Cek juga folder spam.` };
}

/**
 * Ganti alamat email.
 *
 * Password sekarang wajib diketik ulang. Tanpa itu, siapa pun yang sempat
 * memakai laptop orang yang lupa keluar bisa memindahkan akunnya ke alamat
 * sendiri, dan pemilik aslinya terkunci permanen.
 */
export async function gantiEmailAction(
  _prev: AkunState,
  formData: FormData,
): Promise<AkunState> {
  const user = await requireUser();
  const emailBaru = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!emailBaru || !password) {
    return { error: "Email baru dan password sekarang wajib diisi." };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailBaru)) {
    return { error: "Emailnya kelihatannya salah tulis." };
  }

  const baris = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(password, baris.passwordHash))) {
    return { error: "Password sekarang salah." };
  }
  if (emailBaru === baris.email) {
    return { error: "Itu email yang sekarang dipakai." };
  }

  const dipakaiOrangLain = await prisma.user.findUnique({ where: { email: emailBaru } });
  if (dipakaiOrangLain) {
    return { error: "Email itu sudah dipakai akun lain." };
  }

  const emailLama = baris.email;

  await prisma.user.update({
    where: { id: user.id },
    // Statusnya kembali jadi belum dikonfirmasi. Alamat baru belum dibuktikan
    // siapa pun, dan menganggapnya terbukti karena yang lama sudah, keliru.
    data: { email: emailBaru, emailVerifiedAt: null },
  });

  // Alamat LAMA dikabari. Ini pengaman sesungguhnya: kalau bukan pemiliknya
  // yang mengganti, cuma lewat surat ini dia bisa tahu.
  const kabar = suratEmailDiganti(baris.name || "kak", emailBaru);
  await kirimEmail({ ...kabar, ke: emailLama });

  // Lalu tautan konfirmasi ke alamat baru.
  const hasil = await mintaVerifikasiEmail(user.id);
  if (hasil.token) {
    const kepala = await headers();
    const tautan = `${asalApp(kepala.get("host") ?? undefined)}/verifikasi?token=${encodeURIComponent(hasil.token)}`;
    const surat = suratVerifikasi(baris.name || "kak", tautan, UMUR_VERIFIKASI_JAM);
    await kirimEmail({ ...surat, ke: emailBaru });
  }

  revalidatePath("/app/akun");
  revalidatePath("/app");
  return {
    pesan: `Email diganti jadi ${emailBaru}. Tautan konfirmasi sudah dikirim ke sana.`,
  };
}

/**
 * Ganti password dari dalam dashboard.
 *
 * Perangkat lain ikut terlempar keluar, tapi yang sedang dipakai tidak. Kalau
 * ikut terlempar, orang yang baru saja mengganti passwordnya langsung
 * dilempar ke halaman masuk, dan itu terasa seperti gagal padahal berhasil.
 */
export async function gantiSandiAction(
  _prev: AkunState,
  formData: FormData,
): Promise<AkunState> {
  const user = await requireUser();
  const lama = String(formData.get("lama") ?? "");
  const baru = String(formData.get("baru") ?? "");
  const ulangi = String(formData.get("ulangi") ?? "");

  if (!lama || !baru) return { error: "Semua kolom wajib diisi." };
  if (baru.length < 8) return { error: "Password baru minimal 8 huruf." };
  if (baru !== ulangi) return { error: "Dua password barunya belum sama." };

  const baris = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(lama, baris.passwordHash))) {
    return { error: "Password sekarang salah." };
  }
  if (lama === baru) return { error: "Password barunya sama dengan yang lama." };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(baru),
      sessionVersion: { increment: 1 },
      // Sama seperti di jalur lupa password: ganti password melepas rem
      // tebak-tebakan, karena passwordnya sudah bukan yang sedang ditebak.
      gagalMasuk: 0,
      gagalMasukSejak: null,
    },
  });

  // Dibuat ulang setelah nomornya naik, jadi hanya sesi ini yang bertahan.
  await createSession(user.id);

  revalidatePath("/app/akun");
  return {
    pesan: "Password diganti. Perangkat lain yang masih terbuka diminta masuk ulang.",
  };
}