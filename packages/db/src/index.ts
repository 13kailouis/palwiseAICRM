import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __palwisePrisma: PrismaClient | undefined;
}

// Satu instance dipakai ulang supaya hot-reload Next.js tidak membuka
// koneksi SQLite berkali-kali.
export const prisma =
  global.__palwisePrisma ??
  new PrismaClient({
    log: process.env.PRISMA_LOG === "1" ? ["query", "warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__palwisePrisma = prisma;
}

/**
 * Setelan SQLite yang menentukan apakah dua proses bisa menulis berbarengan.
 *
 * Palwise menjalankan dua proses ke satu berkas database: dashboard dan mesin
 * WhatsApp. Dengan setelan bawaan, keduanya saling mengunci dan penulisan bisa
 * gagal dengan "database is locked" tepat saat pelanggan sedang chat.
 *
 * - WAL membuat pembacaan tidak memblokir penulisan, dan sebaliknya.
 * - busy_timeout menyuruh menunggu 5 detik dulu sebelum menyerah, bukan
 *   langsung gagal.
 *
 * Dijalankan sekali saat modulnya dimuat, jadi kedua proses kebagian.
 * Aman diulang, dan tidak berlaku untuk Postgres nanti.
 */
if (process.env.DATABASE_URL?.startsWith("file:")) {
  void (async () => {
    try {
      // journal_mode MENGEMBALIKAN nilai, jadi harus lewat queryRaw.
      // Dulu dipanggil lewat executeRaw, gagal diam-diam, dan WAL tidak pernah
      // benar-benar menyala padahal komentarnya bilang sudah.
      await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;");
      await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 5000;");
      await prisma.$queryRawUnsafe("PRAGMA synchronous = NORMAL;");
    } catch {
      // Bukan hal fatal. Kalau gagal, database tetap jalan seperti sebelumnya.
    }
  })();
}

// Re-export eksplisit, bukan `export *`. @prisma/client adalah CommonJS dan
// deteksi named-export otomatisnya tidak bisa diandalkan dari modul ESM.
export { PrismaClient, Prisma } from "@prisma/client";
export type {
  Workspace,
  User,
  Agent,
  KnowledgeSource,
  KnowledgeChunk,
  Channel,
  Contact,
  Conversation,
  Message,
  Pembayaran,
} from "@prisma/client";

export * from "./plans.js";
export * from "./ajak.js";
export * from "./reset.js";
export * from "./remMasuk.js";
export * from "./verifikasi.js";
export * from "./balasan.js";
export * from "./jatah.js";
export * from "./langganan.js";
export * from "./seedBantuan.js";
export * from "./teks.js";

/** Helper kecil untuk kolom JSON yang disimpan sebagai string di SQLite. */
export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function stringifyJson(value: unknown): string {
  return JSON.stringify(value ?? []);
}

/**
 * Penanda kontak buatan sistem untuk halaman "Coba dulu".
 *
 * Kontak ini bukan pelanggan sungguhan, jadi harus dikecualikan dari daftar
 * pelanggan, hitungan pipeline, ringkasan, dan kotak masuk. Definisinya
 * ditaruh di satu tempat supaya tidak ada halaman yang lupa menyaringnya.
 */
export const AWALAN_RUANG_COBA = "playground:";

/** Untuk query yang tabel utamanya Contact. */
export const HANYA_PELANGGAN_ASLI = {
  NOT: { waJid: { startsWith: AWALAN_RUANG_COBA } },
} as const;

/** Untuk query yang tabel utamanya Conversation. */
export const HANYA_OBROLAN_ASLI = {
  contact: { NOT: { waJid: { startsWith: AWALAN_RUANG_COBA } } },
} as const;

export function adalahRuangCoba(waJid: string | null | undefined): boolean {
  return !!waJid?.startsWith(AWALAN_RUANG_COBA);
}

/**
 * Nama yang ditampilkan untuk sebuah kontak.
 * Prioritas: nama CRM → nama profil WhatsApp → nomor telepon.
 */
export function displayName(contact: {
  name?: string | null;
  waPushName?: string | null;
  phone?: string | null;
}): string {
  return (
    contact.name?.trim() ||
    contact.waPushName?.trim() ||
    contact.phone?.trim() ||
    "Tanpa nama"
  );
}
