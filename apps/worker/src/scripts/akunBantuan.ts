/**
 * Siapkan akun bantuan Palwise, lengkap sampai tinggal scan QR.
 *
 * Jalankan: npm run akun:bantuan
 *
 * Aman diulang. Kalau akunnya sudah ada, yang diperbarui cuma isi info
 * bisnisnya, sandinya tidak disentuh.
 *
 * Ditaruh di paket worker, bukan web, karena setelah catatannya dibuat dia
 * harus langsung dihafalkan, dan yang bisa menghafalkan cuma worker.
 */
import { randomBytes } from "node:crypto";
import { prisma, seedAkunBantuan } from "@palwise/db";
import { indexSource } from "../ai/rag.js";
import { aiConfigured } from "../env.js";

/**
 * Sandi acak, BUKAN kata yang gampang ditebak.
 *
 * Akun ini memegang nomor WhatsApp bantuan Palwise. Kalau jebol, orang lain
 * bisa membalas atas nama Palwise ke pengguna yang sedang minta tolong, dan
 * tidak ada kerusakan yang lebih cepat menghabiskan kepercayaan daripada itu.
 */
function buatSandi(): string {
  return randomBytes(12).toString("base64url");
}

async function main() {
  const hasil = await seedAkunBantuan(buatSandi());

  console.log("");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(" AKUN BANTUAN PALWISE SIAP");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("");
  console.log(` Email  : ${hasil.email}`);
  if (hasil.sandiBaru) {
    console.log(` Sandi  : ${hasil.sandiBaru}`);
    console.log("");
    console.log(" ^ Catat sekarang. Sandi ini tidak ditampilkan lagi, dan");
    console.log("   tidak diganti kalau skrip ini dijalankan lagi.");
  } else {
    console.log(" Sandi  : (tidak diubah, akunnya memang sudah ada)");
  }
  console.log("");

  // Hafalkan catatannya sekarang, jangan menunggu worker dinyalakan ulang.
  const catatan = await prisma.knowledgeSource.findMany({
    where: { agentId: hasil.agentId, status: "pending" },
    select: { id: true, title: true },
  });

  if (!aiConfigured()) {
    console.log(` Info bisnis: ${catatan.length} catatan dibuat, BELUM dihafal.`);
    console.log("   Kunci AI belum diisi. Nanti dihafal sendiri begitu");
    console.log("   worker dinyalakan dengan kunci yang benar.");
  } else {
    let berhasil = 0;
    for (const c of catatan) {
      try {
        await indexSource(c.id);
        berhasil++;
      } catch (err) {
        // Gagal menghafal satu catatan bukan alasan membatalkan semuanya.
        // Yang gagal tetap berstatus pending dan akan dicoba lagi otomatis
        // waktu worker dinyalakan.
        console.log(
          `   Gagal menghafal "${c.title}": ${err instanceof Error ? err.message : err}`,
        );
      }
    }
    console.log(` Info bisnis: ${berhasil} dari ${catatan.length} catatan sudah dihafal.`);
  }

  console.log("");
  console.log(" TINGGAL SATU LANGKAH");
  console.log(" 1. Masuk ke dashboard pakai email dan sandi di atas.");
  console.log(" 2. Buka Nomor WhatsApp, klik Sambungkan, scan QR-nya.");
  console.log("");
  console.log(" SESUDAH TERSAMBUNG, JANGAN LUPA");
  console.log(" Isi nomor itu ke IDENTITAS.waBantuan di");
  console.log(" apps/web/src/lib/identitas.ts, supaya tombol");
  console.log(' "Tanya dulu lewat WhatsApp" muncul di halaman depan.');
  console.log("");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("");
}

main()
  .catch((err) => {
    console.error("\nGagal menyiapkan akun bantuan:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
