import { getPlan, prisma } from "@palwise/db";
import { log } from "../lib/log.js";
import { getQuota } from "./quota.js";

/**
 * Memberi tahu pemilik toko soal kuota, lewat WhatsApp-nya sendiri.
 *
 * Sebelum ini kuota habis gagal dalam diam: pelanggan chat lalu tidak dibalas,
 * dan pemilik toko tidak tahu apa-apa sampai dia kebetulan membuka dashboard.
 * Untuk toko yang sedang ramai itu lebih buruk daripada tidak pakai bot sama
 * sekali, karena pelanggannya merasa diabaikan.
 *
 * Pesannya dikirim ke nomor toko itu sendiri, jadi muncul di WhatsApp pemilik
 * tanpa perlu tahu nomor pribadinya.
 */

const AMBANG_PERINGATAN = 0.8;

type PengirimPesan = (jid: string, teks: string) => Promise<void>;

/** Cari nomor toko yang sedang tersambung, untuk dikirimi pesan ke diri sendiri. */
async function nomorTokoAktif(workspaceId: string): Promise<string | null> {
  const channel = await prisma.channel.findFirst({
    where: { workspaceId, status: "connected", phoneNumber: { not: null } },
  });
  if (!channel?.phoneNumber) return null;
  return channel.phoneNumber.replace(/^\+/, "") + "@s.whatsapp.net";
}

/**
 * Dipanggil setelah tiap balasan terpakai. Mengirim satu peringatan saat kuota
 * menipis, dan satu lagi saat benar-benar habis. Tidak pernah berulang dalam
 * periode yang sama.
 */
export async function periksaDanKabari(
  workspaceId: string,
  kirim: PengirimPesan,
): Promise<void> {
  try {
    // getQuota bisa mereset periode dan membersihkan penandanya, jadi data
    // workspace dibaca SESUDAH itu, bukan sebelum.
    //
    // Penandanya cukup dicek kosong atau tidak. Dulu dibandingkan dengan
    // tanggal reset yang letaknya di masa depan, sehingga syaratnya selalu
    // terpenuhi dan pemilik toko diperingatkan pada setiap pesan yang masuk.
    const kuota = await getQuota(workspaceId);
    const segar = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!segar) return;
    const paket = getPlan(segar.plan);
    const belumPernah = (cap: Date | null) => !cap;

    if (kuota.exhausted && belumPernah(segar.quotaExhaustedAt)) {
      // Nomornya dicari DULU. Kalau penandanya dicap sebelum pesannya benar-
      // benar terkirim, peringatan hilang selamanya waktu nomornya kebetulan
      // sedang tidak tersambung.
      const jid = await nomorTokoAktif(workspaceId);
      if (!jid) return;

      await kirim(
        jid,
        `⚠️ Palwise: jatah balasan bulan ini HABIS.\n\n` +
          `Paket ${paket.name} kamu ${paket.aiCredits.toLocaleString("id-ID")} balasan, ` +
          `dan semuanya sudah terpakai.\n\n` +
          `Mulai sekarang chat pelanggan TIDAK dibalas otomatis. Balas manual dulu, ` +
          `atau naikkan paket di dashboard supaya asistenmu jalan lagi.`,
      );

      await prisma.workspace.update({
        where: { id: workspaceId },
        data: { quotaExhaustedAt: new Date() },
      });
      log.warn(`workspace ${workspaceId} kehabisan kuota, pemilik diberi tahu`);
      return;
    }

    const rasio = kuota.limit > 0 ? kuota.used / kuota.limit : 0;
    if (rasio >= AMBANG_PERINGATAN && !kuota.exhausted && belumPernah(segar.quotaWarnedAt)) {
      const jid = await nomorTokoAktif(workspaceId);
      if (!jid) return;

      await kirim(
        jid,
        `Palwise: sisa ${kuota.remaining.toLocaleString("id-ID")} balasan bulan ini.\n\n` +
          `Kalau habis, chat pelanggan berhenti dibalas otomatis. ` +
          `Naikkan paket di dashboard kalau perlu tambahan.`,
      );

      await prisma.workspace.update({
        where: { id: workspaceId },
        data: { quotaWarnedAt: new Date() },
      });
    }
  } catch (err) {
    // Gagal memberi tahu tidak boleh sampai menggagalkan balasan ke pelanggan.
    log.warn(`gagal mengabari soal kuota: ${err instanceof Error ? err.message : err}`);
  }
}

/**
 * Pesan ke pelanggan saat jatah habis, satu kali per obrolan.
 *
 * Tanpa ini pelanggan mengirim pesan lalu didiamkan begitu saja, dan dia
 * mengira tokonya yang tidak peduli.
 */
export async function kabariPelangganSekali(
  conversationId: string,
): Promise<string | null> {
  const percakapan = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });
  if (!percakapan || percakapan.quotaNoticeSentAt) return null;

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { quotaNoticeSentAt: new Date() },
  });

  return "Halo kak, pesannya sudah kami terima ya. Tim kami akan membalas sebentar lagi 🙏";
}
