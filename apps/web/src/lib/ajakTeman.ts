import "server-only";
import {
  BULAN_GRATIS_PENGAJAK,
  BULAN_GRATIS_YANG_DIAJAK,
  buatKodeAjak,
  getPlan,
  prisma,
} from "@palwise/db";

/**
 * Pastikan sebuah workspace punya kode ajak. Dibuat malas saat pertama dibuka,
 * jadi workspace lama ikut kebagian tanpa perlu migrasi data.
 */
export async function pastikanKodeAjak(workspaceId: string): Promise<string> {
  const ws = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  if (ws.kodeAjak) return ws.kodeAjak;

  // Tabrakan kode sangat kecil kemungkinannya, tapi tetap harus ditangani
  // karena kolomnya unik dan gagal simpan akan membuat halaman error.
  for (let percobaan = 0; percobaan < 8; percobaan++) {
    const kode = buatKodeAjak();
    try {
      const baru = await prisma.workspace.update({
        where: { id: workspaceId },
        data: { kodeAjak: kode },
      });
      return baru.kodeAjak!;
    } catch {
      // kodenya sudah dipakai, coba lagi
    }
  }
  throw new Error("Gagal membuat kode ajak, coba lagi sebentar.");
}

/** Cari workspace pemilik sebuah kode. Null kalau kodenya tidak ada. */
export async function cariPengajak(kode: string): Promise<string | null> {
  if (!kode) return null;
  const ws = await prisma.workspace.findUnique({
    where: { kodeAjak: kode },
    select: { id: true },
  });
  return ws?.id ?? null;
}

/**
 * Cairkan hadiah saat sebuah workspace pertama kali berlangganan berbayar.
 *
 * Aman dipanggil berkali-kali: hadiahnya dikunci oleh `hadiahAjakCair`, jadi
 * orang tidak bisa memanennya berulang dengan naik turun paket.
 *
 * DIPANGGIL DARI SATU TEMPAT SAJA: /api/pembayaran/midtrans, sesudah uangnya
 * benar-benar masuk.
 *
 * Dulu dipanggil dari tombol ganti paket, dan waktu itu tombol ganti paket
 * langsung menulis `plan` ke database tanpa bayar. Jadi hadiahnya cair dari
 * perpindahan paket yang tidak dibayar sepeser pun: satu orang membuat lima
 * akun, tiap akun menekan "Pindah ke Pro", dan bulan gratisnya cair semua.
 * Justru bentuk kecurangan yang seluruh aturan "cair saat berlangganan, bukan
 * saat mendaftar" di ajak.ts dibuat untuk mencegah.
 *
 * BULAN GRATIS SENGAJA TIDAK MEMICUNYA. Kalau memicu, rantainya bisa berputar:
 * C mengajak A, A mengajak B, B bayar, A dapat sebulan gratis, lalu A memakai
 * bulan gratis itu dan C ikut dapat hadiah dari uang yang tidak pernah ada.
 * Hadiah hanya boleh lahir dari uang, tidak dari hadiah.
 */
export async function cairkanHadiahAjak(workspaceId: string): Promise<{
  cair: boolean;
  pengajak?: string;
}> {
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!ws) return { cair: false };

  if (ws.hadiahAjakCair) return { cair: false };
  if (!ws.diajakOleh) return { cair: false };

  // Mengajak diri sendiri. Kalau dibiarkan, workspace yang sama ditambah dua
  // kali dalam satu transaksi dan orangnya panen dua bulan gratis sekaligus.
  if (ws.diajakOleh === ws.id) {
    await prisma.workspace.update({
      where: { id: ws.id },
      data: { hadiahAjakCair: true },
    });
    return { cair: false };
  }

  // Hanya paket berbayar yang menghitung. Ini inti aturannya: hadiah cair saat
  // temannya membayar, bukan saat dia mendaftar.
  if (getPlan(ws.plan).pricePerMonth <= 0) return { cair: false };

  const pengajak = await prisma.workspace.findUnique({
    where: { id: ws.diajakOleh },
    select: { id: true, name: true },
  });
  if (!pengajak) return { cair: false };

  await prisma.$transaction([
    prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        hadiahAjakCair: true,
        bulanGratis: { increment: BULAN_GRATIS_YANG_DIAJAK },
      },
    }),
    prisma.workspace.update({
      where: { id: pengajak.id },
      data: { bulanGratis: { increment: BULAN_GRATIS_PENGAJAK } },
    }),
  ]);

  return { cair: true, pengajak: pengajak.name };
}

export interface RingkasanAjak {
  kode: string;
  diajak: number;
  sudahBerlangganan: number;
  bulanGratis: number;
}

export async function ringkasanAjak(workspaceId: string): Promise<RingkasanAjak> {
  const kode = await pastikanKodeAjak(workspaceId);

  const [ws, diajak, sudahBerlangganan] = await Promise.all([
    prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } }),
    prisma.workspace.count({ where: { diajakOleh: workspaceId } }),
    prisma.workspace.count({
      where: { diajakOleh: workspaceId, hadiahAjakCair: true },
    }),
  ]);

  return { kode, diajak, sudahBerlangganan, bulanGratis: ws.bulanGratis };
}
