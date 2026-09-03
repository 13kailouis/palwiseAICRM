import {
  JATAH_RUANG_COBA_HARIAN,
  getPlan,
  periodeBerikutnya,
  prisma,
  type Workspace,
} from "@palwise/db";

export interface QuotaState {
  used: number;
  limit: number;
  remaining: number;
  resetAt: Date;
  exhausted: boolean;
}

/** Reset otomatis kalau periode bulanannya sudah lewat. */
export async function getQuota(workspaceId: string): Promise<QuotaState> {
  let ws = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });

  if (ws.quotaResetAt.getTime() <= Date.now()) {
    // Penanda peringatan ikut dibersihkan di sini. Kalau tidak, bulan depan
    // pemilik toko tidak diperingatkan lagi karena penandanya masih terisi.
    ws = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        aiCreditsUsed: 0,
        // Dihitung dari batas LAMA, bukan dari sekarang. Penolan ini malas dan
        // baru jalan waktu ada pesan masuk, jadi memakai "sekarang" membuat
        // tanggal jatuh tempo bergeser mengikuti kapan pelanggan kebetulan chat.
        quotaResetAt: periodeBerikutnya(ws.quotaResetAt),
        quotaWarnedAt: null,
        quotaExhaustedAt: null,
      },
    });

    // Pelanggan juga boleh dikabari lagi kalau kuotanya habis lagi nanti.
    await prisma.conversation.updateMany({
      where: { workspaceId, quotaNoticeSentAt: { not: null } },
      data: { quotaNoticeSentAt: null },
    });
  }

  const limit = getPlan(ws.plan).aiCredits;
  return {
    used: ws.aiCreditsUsed,
    limit,
    remaining: Math.max(0, limit - ws.aiCreditsUsed),
    resetAt: ws.quotaResetAt,
    exhausted: ws.aiCreditsUsed >= limit,
  };
}

export async function consumeCredit(workspaceId: string, amount = 1): Promise<void> {
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { aiCreditsUsed: { increment: amount } },
  });
}

/**
 * Ambil satu jatah balasan, kalau memang masih ada.
 *
 * Pengecekan dan pemotongannya jadi satu perintah, supaya beberapa pelanggan
 * yang chat pada detik yang sama tidak sama-sama lolos. Dulu terpisah: semua
 * mengecek sisa jatah lebih dulu, semuanya melihat "masih ada satu", lalu
 * semuanya dibalas. Delapan chat barengan di sisa satu jatah menghasilkan
 * tujuh balasan kelebihan.
 *
 * @returns true kalau jatahnya berhasil diambil.
 */
export async function pesanKredit(workspaceId: string): Promise<boolean> {
  const kuota = await getQuota(workspaceId);

  const hasil = await prisma.workspace.updateMany({
    where: { id: workspaceId, aiCreditsUsed: { lt: kuota.limit } },
    data: { aiCreditsUsed: { increment: 1 } },
  });

  return hasil.count === 1;
}

/** Kembalikan jatah yang sudah diambil, dipakai kalau AI-nya gagal menjawab. */
export async function kembalikanKredit(workspaceId: string): Promise<void> {
  await prisma.workspace.updateMany({
    where: { id: workspaceId, aiCreditsUsed: { gt: 0 } },
    data: { aiCreditsUsed: { decrement: 1 } },
  });
}

/**
 * Apakah workspace ini emailnya sudah dikonfirmasi.
 *
 * Yang diperiksa PEMILIKNYA, bukan siapa pun yang kebetulan ada di dalamnya:
 * cuma pemilik yang alamatnya jadi kunci cadangan akun, dan cuma dia yang bisa
 * mengkonfirmasi. Workspace tanpa pemilik (tidak seharusnya ada) dihitung
 * belum, karena menebak ke arah yang lebih longgar berarti lubangnya terbuka
 * justru di keadaan yang paling aneh.
 */
async function emailSudahDikonfirmasi(workspaceId: string): Promise<boolean> {
  const pemilik = await prisma.user.findFirst({
    where: { workspaceId, role: "owner" },
    select: { emailVerifiedAt: true },
  });
  return !!pemilik?.emailVerifiedAt;
}

/**
 * Jatah ruang coba, terpisah dari kuota balasan pelanggan.
 *
 * Dulu menguji di halaman "Coba dulu" ikut memotong kuota utama. Untuk pengguna
 * paket gratis itu fatal: jatahnya habis buat menguji, dan asistennya tidak
 * pernah sempat membuktikan diri ke pelanggan sungguhan.
 *
 * SEBELUM EMAILNYA DIKONFIRMASI, JATAHNYA TIDAK LAHIR LAGI TIAP HARI.
 *
 * Angkanya sama, yang berubah bentuknya: 30 sekali seumur akun, bukan 30 per
 * hari. Sesudah dikonfirmasi, jatah hariannya jalan seperti biasa.
 *
 * Alasannya bukan menyaring pendaftar. Dari dua jalur pakai AI di paket gratis,
 * balasan WhatsApp sudah direm kenyataan: tiap akun wajib men-scan QR dengan
 * nomor WhatsApp sungguhan, dan satu akun gratis cuma boleh satu nomor. Mau
 * seratus akun pun tetap butuh seratus nomor. Ruang coba tidak punya rem
 * seperti itu sama sekali, dan justru dia yang jatahnya LAHIR LAGI TIAP HARI.
 * Bentuk harian itu yang bikin akun sampah layak dibuat, bukan besar jatahnya:
 * satu akun sampah berarti 30 balasan gratis per hari, selamanya.
 *
 * YANG SENGAJA TIDAK DILAKUKAN: memblokir AI-nya sampai email dikonfirmasi.
 * Email sekali pakai gratis dan instan, jadi tembok itu polisi tidur buat yang
 * niat curang, tapi dinding betulan buat pemilik warung yang emailnya nyasar ke
 * spam. Yang hilang di situ orang yang berhenti di menit pertama tanpa pernah
 * melihat asistennya menjawab, dan buat produk yang belum punya nama, itu jauh
 * lebih mahal daripada 30 balasan.
 *
 * Ini juga BUKAN pengganti rem pendaftaran, dan dia memang punya remnya
 * sendiri: lihat [remPendaftaran] di paket db, yang membatasi jumlah akun baru
 * per alamat IP. Yang di sini membatasi seberapa jauh satu akun bisa dipakai;
 * yang di sana membatasi berapa banyak akun yang bisa dibuat. Dua pekerjaan
 * yang berbeda, dan salah satunya saja tidak cukup.
 */
export async function ambilJatahRuangCoba(workspaceId: string): Promise<{
  terpakai: number;
  batas: number;
  habis: boolean;
  /** Jatahnya masih bentuk sekali-seumur-akun, belum harian. */
  belumKonfirmasi: boolean;
}> {
  let ws = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  const terkonfirmasi = await emailSudahDikonfirmasi(workspaceId);

  const sehari = 24 * 60 * 60 * 1000;
  if (terkonfirmasi && Date.now() - ws.playgroundResetAt.getTime() >= sehari) {
    ws = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { playgroundUsed: 0, playgroundResetAt: new Date() },
    });
  }

  return {
    terpakai: ws.playgroundUsed,
    batas: JATAH_RUANG_COBA_HARIAN,
    habis: ws.playgroundUsed >= JATAH_RUANG_COBA_HARIAN,
    belumKonfirmasi: !terkonfirmasi,
  };
}

/** Sama seperti pesanKredit, tapi untuk jatah harian ruang coba. */
export async function pesanJatahRuangCoba(workspaceId: string): Promise<boolean> {
  await ambilJatahRuangCoba(workspaceId); // sekalian reset kalau hari sudah ganti

  const hasil = await prisma.workspace.updateMany({
    where: { id: workspaceId, playgroundUsed: { lt: JATAH_RUANG_COBA_HARIAN } },
    data: { playgroundUsed: { increment: 1 } },
  });

  return hasil.count === 1;
}

export async function kembalikanJatahRuangCoba(workspaceId: string): Promise<void> {
  await prisma.workspace.updateMany({
    where: { id: workspaceId, playgroundUsed: { gt: 0 } },
    data: { playgroundUsed: { decrement: 1 } },
  });
}

export function planOf(ws: Workspace) {
  return getPlan(ws.plan);
}
