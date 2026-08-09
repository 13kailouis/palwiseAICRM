import { prisma } from "@palwise/db";

import { getLlm } from "../ai/provider.js";
import { textMessage } from "../ai/types.js";
import { log } from "../lib/log.js";

/**
 * Ringkasan obrolan satu pelanggan, ditulis AI atas permintaan pemilik toko.
 *
 * SENGAJA TIDAK OTOMATIS. Obrolan yang ramai bisa puluhan pesan sehari, dan
 * meringkas ulang tiap pesan berarti membayar model puluhan kali untuk satu
 * paragraf yang mungkin tidak pernah dibuka. Jadi dibuat waktu tombolnya
 * diklik, disimpan, lalu dipakai ulang sampai ada pesan baru.
 *
 * Juga sengaja TIDAK memotong jatah balasan. Jatah itu satuannya "balasan ke
 * pelanggan", dan angka pemakaian di Ringkasan memakai satuan yang sama. Kalau
 * ringkasan ikut memotongnya, dua angka di satu layar jadi beda artinya dan
 * pemilik toko mengira salah satunya bohong. Biayanya ditahan dengan cara lain:
 * satu klik satu panggilan, dan tidak memanggil sama sekali kalau tidak ada
 * pesan baru sejak ringkasan terakhir.
 */

/** Sebanyak ini pesan terakhir yang dibaca. Cukup untuk menangkap alurnya. */
const MAKS_PESAN = 40;

/**
 * Jarak minimal antar pembuatan ulang.
 *
 * Ringkasan sengaja tidak memotong jatah balasan, dan itu meninggalkan satu
 * lubang: tombol "Buat ulang" memaksa panggilan model walau tidak ada pesan
 * baru, jadi tanpa rem, seratus klik berarti seratus panggilan yang tidak
 * ditagihkan ke siapa pun. Satu menit cukup untuk mencegah itu tanpa pernah
 * terasa oleh orang yang memang cuma mau memperbaiki hasil yang meleset.
 */
const JEDA_PAKSA_MS = 60 * 1000;

/** Potong tiap pesan supaya satu pesan panjang tidak menelan seluruh jatah. */
const MAKS_HURUF_PESAN = 400;

const SISTEM = `Kamu membantu pemilik usaha kecil di Indonesia membaca cepat satu obrolan WhatsApp
dengan calon pembelinya.

Tulis MAKSIMAL 5 baris. Satu baris satu poin, masing-masing diawali "- ".
Pakai bahasa Indonesia sehari-hari yang dipakai pemilik toko, bukan bahasa laporan.
Jangan memakai kata "pelanggan tersebut", "yang bersangkutan", atau istilah teknis.

Yang wajib masuk kalau memang ada di obrolan:
- apa yang dia cari atau sudah dia beli
- angka yang disebut: harga, jumlah, nominal transfer
- sudah sejauh mana, misalnya masih nanya-nanya, sudah pesan, atau sudah kirim bukti bayar
- apa yang dia tunggu dari kita sekarang
- keluhan atau janji yang belum ditepati, kalau ada

JANGAN mengarang apa pun yang tidak ada di obrolan. Kalau obrolannya masih terlalu
sedikit untuk disimpulkan, tulis satu baris saja apa adanya.
Jangan menutup dengan basa-basi atau saran umum.`;

export interface HasilRingkasan {
  ringkasan: string;
  ringkasanAt: Date;
  /** true kalau yang dikembalikan ringkasan lama karena belum ada pesan baru. */
  dariSimpanan: boolean;
}

/**
 * Buat atau ambil ringkasan seorang pelanggan.
 *
 * @param paksa Buat ulang walaupun belum ada pesan baru. Dipakai kalau pemilik
 *   toko menekan "Buat ulang" karena hasilnya dirasa meleset.
 */
export async function ringkasPelanggan(
  contactId: string,
  paksa = false,
): Promise<HasilRingkasan> {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    include: {
      conversations: {
        orderBy: { lastMessageAt: "desc" },
        take: 1,
        select: { id: true, lastMessageAt: true },
      },
    },
  });
  if (!contact) throw new Error("Pelanggan tidak ditemukan");

  const obrolan = contact.conversations[0];
  if (!obrolan) throw new Error("Pelanggan ini belum punya obrolan");

  // Belum ada pesan baru sejak ringkasan terakhir, jadi tidak ada yang perlu
  // dibayar ulang.
  if (
    !paksa &&
    contact.ringkasan &&
    contact.ringkasanAt &&
    contact.ringkasanAt.getTime() >= obrolan.lastMessageAt.getTime()
  ) {
    return {
      ringkasan: contact.ringkasan,
      ringkasanAt: contact.ringkasanAt,
      dariSimpanan: true,
    };
  }

  // Rem untuk "Buat ulang". Lihat [JEDA_PAKSA_MS].
  if (
    paksa &&
    contact.ringkasanAt &&
    Date.now() - contact.ringkasanAt.getTime() < JEDA_PAKSA_MS
  ) {
    throw new Error(
      "Ringkasannya baru saja dibuat. Tunggu sebentar sebelum membuat ulang.",
    );
  }

  const pesan = await prisma.message.findMany({
    where: { conversationId: obrolan.id },
    orderBy: { createdAt: "desc" },
    take: MAKS_PESAN,
    select: { role: true, content: true, mediaType: true, mediaSummary: true },
  });

  if (pesan.length === 0) throw new Error("Obrolannya masih kosong");

  const transkrip = pesan
    .reverse()
    .map((m) => {
      const siapa =
        m.role === "customer" ? "Pelanggan" : m.role === "human" ? "Tim" : "Asisten";
      // Lampiran tidak bisa dibaca ulang, tapi bacaan AI atas lampirannya
      // tersimpan. Tanpa ini, obrolan yang isinya bukti transfer terbaca
      // sebagai obrolan kosong.
      const isi =
        m.mediaType !== "text"
          ? `[${m.mediaType}${m.mediaSummary ? `: ${m.mediaSummary}` : ""}] ${m.content}`
          : m.content;
      return `${siapa}: ${isi.trim().slice(0, MAKS_HURUF_PESAN)}`;
    })
    .join("\n");

  // Janji temu ikut disebut karena itu satu-satunya hal di obrolan yang punya
  // tenggat. Ringkasan yang menyebut "sudah bayar" tapi tidak menyebut "datang
  // Sabtu jam 10" kehilangan satu-satunya baris yang perlu ditindak hari ini.
  const janji =
    contact.janjiPada && contact.janjiPada.getTime() > Date.now()
      ? `Janji temu: ${contact.janjiPada.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })} jam ${contact.janjiPada.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        })}${contact.janjiCatatan ? ` untuk ${contact.janjiCatatan}` : ""}${
          contact.janjiDipastikan ? " (sudah dipastikan)" : " (belum dipastikan)"
        }`
      : "";

  const catatan = [
    contact.name && `Nama: ${contact.name}`,
    contact.businessName && `Nama usaha: ${contact.businessName}`,
    contact.masalah && `Keluhan yang tercatat: ${contact.masalah}`,
    janji,
    `Tahap sekarang: ${contact.stage}`,
  ]
    .filter(Boolean)
    .join("\n");

  const llm = getLlm();
  const keluaran = await llm.complete({
    system: SISTEM,
    messages: [
      textMessage(
        "user",
        `${catatan}\n\n=== ISI OBROLAN ===\n${transkrip}\n\n=== TUGAS ===\nRingkas obrolan di atas.`,
      ),
    ],
    temperature: 0.2,
    maxTokens: 400,
  });

  const bersih = rapikan(keluaran);
  if (!bersih) throw new Error("Ringkasannya kosong, coba lagi sebentar lagi");

  const ringkasanAt = new Date();
  await prisma.contact.update({
    where: { id: contact.id },
    data: { ringkasan: bersih, ringkasanAt },
  });
  log.info(`ringkasan dibuat untuk kontak ${contact.id}`);

  return { ringkasan: bersih, ringkasanAt, dariSimpanan: false };
}

/**
 * Buang pagar markdown dan baris kosong berlebih.
 *
 * Model kadang membungkus jawabannya dalam ``` walaupun tidak diminta, dan
 * pagar yang ikut tersimpan akan tampil apa adanya di layar pemilik toko.
 */
function rapikan(teks: string): string {
  return teks
    .replace(/^\s*```[a-z]*\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .split("\n")
    .map((b) => b.trimEnd())
    .filter((b, i, arr) => b.trim() !== "" || (i > 0 && arr[i - 1].trim() !== ""))
    .join("\n")
    .trim()
    .slice(0, 1200);
}
