/**
 * Cadangkan database.
 *
 * Jalankan: npm run db:backup
 *
 * Menyalin berkas database sambil aplikasinya tetap jalan itu berbahaya:
 * hasilnya bisa setengah jadi. Perintah VACUUM INTO milik SQLite membuat
 * salinan yang konsisten tanpa perlu menghentikan apa pun.
 *
 * Untuk Postgres nanti, pakai pg_dump dan tinggalkan berkas ini.
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const SIMPAN_BERAPA = 14;

function stempelWaktu(): string {
  const d = new Date();
  const dua = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${dua(d.getMonth() + 1)}${dua(d.getDate())}` +
    `-${dua(d.getHours())}${dua(d.getMinutes())}`
  );
}

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.startsWith("file:")) {
    console.log(
      "Database ini bukan SQLite. Untuk Postgres, pakai pg_dump atau cadangan otomatis dari penyedianya.",
    );
    return;
  }

  const folder = path.resolve(process.cwd(), "data", "cadangan");
  fs.mkdirSync(folder, { recursive: true });

  const tujuan = path.join(folder, `palwise-${stempelWaktu()}.db`);
  const prisma = new PrismaClient();

  try {
    // Jalur harus disisipkan langsung karena PRAGMA dan VACUUM tidak menerima
    // parameter. Nilainya kita sendiri yang susun, bukan dari pengguna.
    await prisma.$executeRawUnsafe(`VACUUM INTO '${tujuan.replace(/\\/g, "/")}'`);
  } finally {
    await prisma.$disconnect();
  }

  const ukuran = fs.statSync(tujuan).size;
  console.log(`Cadangan dibuat: ${tujuan}`);
  console.log(`Ukuran         : ${(ukuran / 1024).toFixed(0)} KB`);

  // Buang cadangan lama supaya tidak menumpuk tanpa batas.
  const semua = fs
    .readdirSync(folder)
    .filter((f) => f.startsWith("palwise-") && f.endsWith(".db"))
    .sort()
    .reverse();

  const dibuang = semua.slice(SIMPAN_BERAPA);
  for (const f of dibuang) {
    fs.rmSync(path.join(folder, f), { force: true });
  }

  console.log(
    `Tersimpan      : ${Math.min(semua.length, SIMPAN_BERAPA)} cadangan terakhir` +
      (dibuang.length ? `, ${dibuang.length} yang lama dibuang` : ""),
  );
}

main().catch((err) => {
  console.error("Gagal membuat cadangan:", err);
  process.exit(1);
});
