/**
 * Lupa password.
 *
 * Alurnya: orang minta ganti password, sistem membuat token acak, tokennya
 * dikirim lewat email, lalu ditukar dengan password baru.
 *
 * Bagian yang menentukan aman atau tidaknya ada di sini, bukan di halamannya,
 * supaya bisa diuji tanpa membuka browser dan tanpa mengirim email sungguhan.
 */
import crypto from "node:crypto";
import { prisma } from "./index.js";

/** Token berlaku satu jam. Cukup untuk membuka email, tidak cukup untuk lupa. */
export const UMUR_TOKEN_MENIT = 60;

/**
 * Berapa kali boleh minta dalam sejam, per akun.
 *
 * Dua alasan. Pertama, tanpa batas orang bisa membanjiri kotak masuk orang lain
 * cuma dengan tahu alamat emailnya. Kedua, tiap permintaan itu satu email yang
 * kamu bayar.
 */
export const MAKS_MINTA_PER_JAM = 3;

function sidikJari(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export interface HasilMinta {
  /** Token mentah, hanya ada di sini dan di email. Null kalau ditolak. */
  token: string | null;
  /** Kenapa ditolak. Tidak boleh ditampilkan ke layar, lihat catatan di bawah. */
  alasan?: "email_tidak_ada" | "terlalu_sering";
}

/**
 * Buat token ganti password untuk sebuah email.
 *
 * Yang memanggil TIDAK BOLEH menampilkan bedanya "email tidak ada" dan
 * "berhasil" ke layar. Kalau ditampilkan, siapa pun bisa memakai halaman ini
 * untuk mengecek satu per satu email mana yang punya akun di Palwise, dan itu
 * bocoran daftar pelanggan.
 */
export async function mintaResetSandi(email: string): Promise<HasilMinta> {
  const bersih = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: bersih } });
  if (!user) return { token: null, alasan: "email_tidak_ada" };

  const sejamLalu = new Date(Date.now() - 60 * 60 * 1000);
  const baruSaja = await prisma.passwordReset.count({
    where: { userId: user.id, createdAt: { gte: sejamLalu } },
  });
  if (baruSaja >= MAKS_MINTA_PER_JAM) {
    return { token: null, alasan: "terlalu_sering" };
  }

  // Permintaan lama dibatalkan. Kalau tidak, tautan dari email seminggu lalu
  // masih bisa dipakai, dan orang yang minta ulang justru karena curiga
  // akunnya diintip tidak mendapat apa yang dia kira dia dapat.
  await prisma.passwordReset.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = crypto.randomBytes(32).toString("base64url");
  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      tokenHash: sidikJari(token),
      expiresAt: new Date(Date.now() + UMUR_TOKEN_MENIT * 60 * 1000),
    },
  });

  return { token };
}

export interface HasilTukar {
  ok: boolean;
  userId?: string;
  alasan?: "tidak_ditemukan" | "sudah_dipakai" | "kedaluwarsa";
}

/**
 * Tukar token dengan password baru.
 *
 * `hashSandiBaru` sudah dalam bentuk teracak. Fungsi ini sengaja tidak tahu
 * cara mengacak password, supaya packages/db tidak perlu ikut memikirkan itu.
 */
export async function tukarTokenReset(
  token: string,
  hashSandiBaru: string,
): Promise<HasilTukar> {
  if (!token) return { ok: false, alasan: "tidak_ditemukan" };

  const catatan = await prisma.passwordReset.findUnique({
    where: { tokenHash: sidikJari(token) },
  });
  if (!catatan) return { ok: false, alasan: "tidak_ditemukan" };
  if (catatan.usedAt) return { ok: false, alasan: "sudah_dipakai" };
  if (catatan.expiresAt.getTime() <= Date.now()) {
    return { ok: false, alasan: "kedaluwarsa" };
  }

  // Ditandai terpakai lebih dulu, dan hanya lanjut kalau penandaan itu yang
  // berhasil. Dua permintaan yang datang pada detik yang sama jadi cuma satu
  // yang lolos, sisanya menemukan tokennya sudah terpakai.
  const dipakai = await prisma.passwordReset.updateMany({
    where: { id: catatan.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (dipakai.count !== 1) return { ok: false, alasan: "sudah_dipakai" };

  await prisma.user.update({
    where: { id: catatan.userId },
    data: {
      passwordHash: hashSandiBaru,
      // Semua yang sudah terlanjur masuk ke akun ini ikut terlempar keluar.
      sessionVersion: { increment: 1 },
      // Rem tebak-tebakan password ikut dilepas.
      //
      // Tanpa ini, orang yang terkunci karena ada yang menebak-nebak akunnya
      // lalu melakukan hal yang benar (menekan "Lupa password" dan menggantinya)
      // TETAP tidak bisa masuk sampai jendelanya habis, dengan password yang
      // baru saja dia buat sendiri. Persis hukuman untuk orang yang salah.
      gagalMasuk: 0,
      gagalMasukSejak: null,
    },
  });

  return { ok: true, userId: catatan.userId };
}

/** Apakah tokennya masih bisa dipakai. Untuk memeriksa sebelum menampilkan formulir. */
export async function tokenResetMasihBerlaku(token: string): Promise<boolean> {
  if (!token) return false;
  const catatan = await prisma.passwordReset.findUnique({
    where: { tokenHash: sidikJari(token) },
  });
  return !!catatan && !catatan.usedAt && catatan.expiresAt.getTime() > Date.now();
}
