import "server-only";
import { getPlan, prisma } from "@palwise/db";

/**
 * Penjaga untuk dua jalur impor yang memanggil AI: telusur website dan baca
 * berkas.
 *
 * DUA LUBANG YANG DITUTUP DI SINI.
 *
 * Pertama, pekerjaan yang pasti terbuang. Dulu orang bisa menunggu dua menit
 * sebuah website ditelusuri dan dirapikan AI, lalu baru diberi tahu "Paket Coba
 * Gratis muat 10 catatan" waktu menekan simpan. Pemeriksaan yang sama persis
 * sudah ada di save-import, cuma dijalankan terlalu belakangan.
 *
 * Kedua, dan ini yang memakan uang sungguhan: dua rute itu memanggil model
 * TANPA meteran apa pun. Mereka tidak memotong jatah balasan, dan memang tidak
 * boleh memotongnya karena satuannya beda. Jadi tanpa rem, satu akun gratis
 * bisa menelusuri seratus website berturut-turut dan tagihannya jatuh ke kita.
 *
 * Remnya sengaja pendek. Yang perlu dicegah cuma pemanggilan beruntun oleh
 * skrip; orang sungguhan yang salah ketik alamat lalu mengulang tidak pernah
 * menyentuh batas ini karena alamat yang salah gagal sebelum model dipanggil.
 */

/** Jarak minimal antar impor yang berhasil, dalam detik. */
export const JEDA_IMPOR_DETIK = 45;

export interface HasilPenjaga {
  boleh: boolean;
  alasan?: string;
}

export async function bolehImporSekarang(
  workspaceId: string,
): Promise<HasilPenjaga> {
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
  });
  const plan = getPlan(workspace.plan);

  const terpakai = await prisma.knowledgeSource.count({
    where: { agent: { workspaceId } },
  });
  if (terpakai >= plan.maxKnowledgeSources) {
    return {
      boleh: false,
      alasan: `Catatan info bisnismu sudah penuh (${plan.maxKnowledgeSources} di paket ${plan.name}), jadi hasilnya tidak akan bisa disimpan. Hapus yang tidak dipakai dulu, atau naikkan paket.`,
    };
  }

  if (workspace.imporTerakhir) {
    const lewat = Date.now() - workspace.imporTerakhir.getTime();
    const sisa = Math.ceil((JEDA_IMPOR_DETIK * 1000 - lewat) / 1000);
    if (sisa > 0) {
      return {
        boleh: false,
        alasan: `Barusan sudah ada yang diambil. Tunggu ${sisa} detik lagi ya.`,
      };
    }
  }

  return { boleh: true };
}

/**
 * Dicatat SETELAH impornya benar-benar selesai, bukan di awal.
 *
 * Kalau dicatat di awal, penelusuran yang gagal di tengah (alamatnya mati,
 * webnya kosong) tetap menghabiskan jatah jedanya, dan orangnya harus menunggu
 * gara-gara sesuatu yang tidak pernah memakan biaya model sama sekali.
 */
export async function catatImporSelesai(workspaceId: string): Promise<void> {
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { imporTerakhir: new Date() },
  });
}
