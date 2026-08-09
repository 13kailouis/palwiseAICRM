/**
 * Konfirmasi alamat email.
 *
 * Gunanya bukan menyaring pendaftar. Penjaga sungguhan Palwise itu nomor
 * WhatsApp: tanpa nomor yang di-scan, akunnya tidak menghasilkan apa-apa, dan
 * nomor jauh lebih mahal disiapkan daripada email buangan.
 *
 * Gunanya menangkap salah ketik di hari pertama. Alamat email adalah satu-
 * satunya kunci cadangan akun. Orang yang daftar pakai "budi@gmial.com" hari
 * ini masih bisa masuk santai karena hafal passwordnya, lalu kehilangan
 * akunnya enam bulan kemudian waktu lupa, dan tidak ada yang bisa menolong.
 *
 * Sama seperti lupa password, bagian yang menentukan aman atau tidaknya ada di
 * sini supaya bisa diuji tanpa browser dan tanpa mengirim email sungguhan.
 */
import crypto from "node:crypto";
import { prisma } from "./index.js";

/**
 * Berlaku sehari penuh, jauh lebih longgar daripada tautan lupa password.
 *
 * Bedanya disengaja. Tautan lupa password itu kunci masuk, jadi sebentar saja.
 * Tautan ini cuma menandai alamat sebagai benar, dan yang membukanya sering
 * pemilik toko yang baru sempat lihat email besok paginya.
 */
export const UMUR_VERIFIKASI_JAM = 24;

/** Batas permintaan per jam, per akun. */
export const MAKS_VERIFIKASI_PER_JAM = 5;

function sidikJari(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export interface HasilMintaVerifikasi {
  token: string | null;
  /** Alamat yang dituju, untuk yang mengirim emailnya. */
  email?: string;
  alasan?: "sudah_terkonfirmasi" | "terlalu_sering" | "tidak_ada";
}

/** Buat tautan konfirmasi untuk alamat email sebuah akun yang berlaku saat ini. */
export async function mintaVerifikasiEmail(
  userId: string,
): Promise<HasilMintaVerifikasi> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { token: null, alasan: "tidak_ada" };
  if (user.emailVerifiedAt) return { token: null, alasan: "sudah_terkonfirmasi" };

  const sejamLalu = new Date(Date.now() - 60 * 60 * 1000);
  const baruSaja = await prisma.emailVerification.count({
    where: { userId, createdAt: { gte: sejamLalu } },
  });
  if (baruSaja >= MAKS_VERIFIKASI_PER_JAM) {
    return { token: null, alasan: "terlalu_sering" };
  }

  // Tautan lama dibatalkan supaya cuma ada satu yang hidup pada satu waktu.
  await prisma.emailVerification.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = crypto.randomBytes(32).toString("base64url");
  await prisma.emailVerification.create({
    data: {
      userId,
      email: user.email,
      tokenHash: sidikJari(token),
      expiresAt: new Date(Date.now() + UMUR_VERIFIKASI_JAM * 60 * 60 * 1000),
    },
  });

  return { token, email: user.email };
}

export interface HasilVerifikasi {
  ok: boolean;
  email?: string;
  alasan?: "tidak_ditemukan" | "sudah_dipakai" | "kedaluwarsa" | "email_berubah";
}

/**
 * Tukar tautan dengan tanda terkonfirmasi.
 *
 * Tidak perlu login. Orang sering membuka email di HP sementara dashboardnya
 * terbuka di laptop, dan memaksa login dulu di situ membuat sebagian orang
 * berhenti di tengah jalan.
 */
export async function pakaiTokenVerifikasi(token: string): Promise<HasilVerifikasi> {
  if (!token) return { ok: false, alasan: "tidak_ditemukan" };

  const catatan = await prisma.emailVerification.findUnique({
    where: { tokenHash: sidikJari(token) },
    include: { user: true },
  });
  if (!catatan) return { ok: false, alasan: "tidak_ditemukan" };
  if (catatan.usedAt) return { ok: false, alasan: "sudah_dipakai" };
  if (catatan.expiresAt.getTime() <= Date.now()) {
    return { ok: false, alasan: "kedaluwarsa" };
  }

  // Emailnya sudah diganti lagi sejak tautan ini dibuat. Kalau tetap diterima,
  // alamat yang baru ikut ditandai benar padahal tidak ada yang pernah
  // membuktikannya.
  if (catatan.user.email !== catatan.email) {
    await prisma.emailVerification.updateMany({
      where: { id: catatan.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    return { ok: false, alasan: "email_berubah" };
  }

  const dipakai = await prisma.emailVerification.updateMany({
    where: { id: catatan.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (dipakai.count !== 1) return { ok: false, alasan: "sudah_dipakai" };

  await prisma.user.update({
    where: { id: catatan.userId },
    data: { emailVerifiedAt: new Date() },
  });

  return { ok: true, email: catatan.email };
}
