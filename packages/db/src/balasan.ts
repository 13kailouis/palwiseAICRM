import { prisma } from "./index.js";

/**
 * Menghitung BALASAN, bukan baris pesan.
 *
 * Satu balasan bisa dipecah jadi beberapa bubble supaya terbaca seperti orang
 * mengetik beneran, dan tiap bubble disimpan sebagai satu baris Message
 * sendiri. Jadi menghitung baris berarti menghitung bubble.
 *
 * Bug sungguhan 2026-08-02: halaman Ringkasan menulis "Chat dibalas minggu ini
 * 53" sementara kartu di bawahnya menulis "Pemakaian bulan ini 19". Keduanya
 * benar menurut hitungannya masing-masing, tapi 53 itu bubble dan 19 itu
 * balasan. Pemilik toko wajar mengira salah satunya bohong, dan begitu satu
 * angka diragukan, semua angka di halaman itu ikut diragukan.
 *
 * Aturannya sekarang: kalau dua angka muncul di satu layar, satuannya harus
 * sama. Jatah balasan dihitung per balasan, jadi semua yang lain ikut.
 *
 * Ruang coba juga dibuang di sini. Ruang coba punya jatah harian sendiri dan
 * TIDAK memotong jatah balasan pelanggan, jadi memasukkannya ke angka ini
 * membuatnya tidak mungkin cocok dengan kartu jatah.
 */
export async function hitungBalasan(
  workspaceId: string,
  sejak: Date,
): Promise<number> {
  // LAG melihat peran pesan sebelumnya di percakapan yang sama. Sebuah baris
  // "ai" dihitung cuma kalau sebelumnya BUKAN "ai", artinya dia bubble pertama
  // dari satu giliran. Bubble kedua dan ketiga ikut giliran itu, tidak dihitung
  // lagi. Ini SQL standar, jalan di SQLite maupun Postgres.
  const hasil = await prisma.$queryRaw<{ n: bigint | number }[]>`
    SELECT COUNT(*) AS n FROM (
      SELECT
        m."role" AS peran,
        LAG(m."role") OVER (
          PARTITION BY m."conversationId"
          ORDER BY m."createdAt", m."id"
        ) AS sebelumnya,
        m."createdAt" AS waktu
      FROM "Message" m
      JOIN "Conversation" c ON c."id" = m."conversationId"
      JOIN "Contact" k ON k."id" = c."contactId"
      WHERE c."workspaceId" = ${workspaceId}
        AND (k."waJid" IS NULL OR k."waJid" NOT LIKE 'playground:%')
    ) t
    WHERE t.peran = 'ai'
      AND (t.sebelumnya IS NULL OR t.sebelumnya <> 'ai')
      AND t.waktu >= ${sejak}
  `;

  return Number(hasil[0]?.n ?? 0);
}

/**
 * Sama, tapi untuk SEMUA workspace. Dipakai halaman founder.
 *
 * Ada karena halaman founder sempat memakai `prisma.message.count({ role: "ai" })`
 * dan itu menghitung BUBBLE, bukan balasan. Di sebelahnya ada kartu "Pendapatan
 * per balasan" yang dihitung dari angka itu, jadi satu kesalahan satuan langsung
 * membuat angka soal uang jadi terlalu kecil, dan justru angka itu yang dipakai
 * memutuskan harga.
 *
 * Persis bug yang sama dengan yang dulu bikin Ringkasan menulis 53 di sebelah 19.
 * SQL-nya disamakan dengan [hitungBalasan] supaya keduanya tidak bisa berbeda,
 * cuma tanpa saringan workspace.
 */
export async function hitungBalasanSemua(sejak: Date): Promise<number> {
  const hasil = await prisma.$queryRaw<{ n: bigint | number }[]>`
    SELECT COUNT(*) AS n FROM (
      SELECT
        m."role" AS peran,
        LAG(m."role") OVER (
          PARTITION BY m."conversationId"
          ORDER BY m."createdAt", m."id"
        ) AS sebelumnya,
        m."createdAt" AS waktu
      FROM "Message" m
      JOIN "Conversation" c ON c."id" = m."conversationId"
      JOIN "Contact" k ON k."id" = c."contactId"
      WHERE (k."waJid" IS NULL OR k."waJid" NOT LIKE 'playground:%')
    ) t
    WHERE t.peran = 'ai'
      AND (t.sebelumnya IS NULL OR t.sebelumnya <> 'ai')
      AND t.waktu >= ${sejak}
  `;

  return Number(hasil[0]?.n ?? 0);
}
