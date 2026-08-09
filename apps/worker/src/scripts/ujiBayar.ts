/**
 * Uji jalur pembayaran dari ujung ke ujung, tanpa Midtrans dan tanpa uang.
 *
 * Yang dipalsukan cuma NOTIFIKASINYA, dan itu justru inti ujinya: tanda
 * tangannya dihitung dengan rumus Midtrans memakai MIDTRANS_SERVER_KEY yang
 * sama seperti yang dipakai server. Jadi kalau webhook menerima notifikasi dari
 * berkas ini, dia juga akan menerima yang sungguhan, dan kalau dia menolak yang
 * palsu di sini, dia juga menolak yang palsu dari internet.
 *
 * Kenapa terpisah dari `npm run selftest`: ini butuh dashboard yang benar-benar
 * hidup, karena yang diuji sebuah alamat HTTP. Selftest sengaja bisa jalan tanpa
 * server sama sekali.
 *
 * Jalankan:
 *   npm run build && npm start          (di satu terminal)
 *   npm run uji:bayar                   (di terminal lain)
 *
 * Atau ke porta lain:  UJI_URL=http://127.0.0.1:3100 npm run uji:bayar
 *
 * PERINGATAN: ini menulis ke database yang sedang dipakai. Dia membuat satu
 * workspace bernama "Uji Bayar" lalu menghapusnya lagi di akhir, dan tidak
 * menyentuh data lain. Jangan dijalankan di server yang sudah punya pelanggan
 * kalau kamu tidak siap dengan satu baris workspace yang muncul dan hilang.
 */
import crypto from "node:crypto";
import { prisma } from "@palwise/db";
import { env } from "../env.js";

const ASAL = process.env.UJI_URL?.replace(/\/$/, "") || "http://127.0.0.1:3000";
const ALAMAT = `${ASAL}/api/pembayaran/midtrans`;
const KUNCI = process.env.MIDTRANS_SERVER_KEY?.trim() ?? "";

let lolos = 0;
const gagal: string[] = [];

function check(nama: string, ok: boolean, detail = "") {
  if (ok) {
    lolos++;
    console.log(`  \x1b[32m✓\x1b[0m ${nama}`);
  } else {
    gagal.push(nama + (detail ? ` — ${detail}` : ""));
    console.log(`  \x1b[31m✗\x1b[0m ${nama}${detail ? ` — ${detail}` : ""}`);
  }
}

function tandaTangan(orderId: string, statusCode: string, gross: string): string {
  return crypto
    .createHash("sha512")
    .update(`${orderId}${statusCode}${gross}${KUNCI}`)
    .digest("hex");
}

async function kirim(isi: Record<string, unknown>) {
  const jawaban = await fetch(ALAMAT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(isi),
    signal: AbortSignal.timeout(15_000),
  });
  return { status: jawaban.status, teks: await jawaban.text() };
}

/**
 * Notifikasi yang tanda tangannya SAH. `gross_amount` sengaja dikirim dalam
 * bentuk "499000.00" seperti yang benar-benar dikirim Midtrans, bukan 499000.
 */
function notif(orderId: string, gross: string, status = "settlement") {
  return {
    order_id: orderId,
    status_code: "200",
    gross_amount: gross,
    signature_key: tandaTangan(orderId, "200", gross),
    transaction_status: status,
    transaction_id: `uji-${orderId.slice(0, 10)}`,
    payment_type: "bank_transfer",
  };
}

async function main() {
  if (!KUNCI) {
    console.error(
      "\nMIDTRANS_SERVER_KEY belum diisi di .env, jadi tanda tangannya tidak bisa dihitung.\n",
    );
    process.exit(1);
  }

  // Dashboard harus hidup DULU. Tanpa pemeriksaan ini, semua ujinya gagal
  // dengan "fetch failed" dan yang membaca mengira kodenya rusak, padahal cuma
  // servernya belum dinyalakan.
  try {
    await fetch(ALAMAT, { method: "GET", signal: AbortSignal.timeout(5_000) });
  } catch {
    console.error(
      `\nDashboard tidak menjawab di ${ASAL}.\n` +
        `Nyalakan dulu: npm run build && npm start\n` +
        `Atau tunjuk alamat lain: UJI_URL=http://127.0.0.1:3100 npm run uji:bayar\n`,
    );
    process.exit(1);
  }

  console.log(`\n\x1b[1mUji pembayaran Midtrans\x1b[0m  ${ALAMAT}`);
  console.log(`  kunci: ${KUNCI.toUpperCase().startsWith("SB-") ? "sandbox" : "production"}\n`);

  const ws = await prisma.workspace.create({
    data: { name: "Uji Bayar", plan: "free", aiCreditsUsed: 90 },
  });
  const segar = () => prisma.workspace.findUniqueOrThrow({ where: { id: ws.id } });

  const tagihan = (planId: string, jumlah: number, perpanjang = false) =>
    prisma.pembayaran.create({
      data: {
        workspaceId: ws.id,
        planId,
        jumlah,
        sumber: "midtrans",
        status: "menunggu",
        perpanjang,
      },
    });

  try {
    // 1. Tanda tangan palsu. Ini SATU-SATUNYA penjaga alamat ini, dan kalau dia
    //    hilang, siapa pun yang tahu alamatnya bisa menyalakan paket Pro gratis.
    {
      const t = await tagihan("pro", 999_000);
      const r = await kirim({
        order_id: t.id,
        status_code: "200",
        gross_amount: "999000.00",
        signature_key: "a".repeat(128),
        transaction_status: "settlement",
      });
      check("tanda tangan palsu dijawab 403", r.status === 403, `dapat ${r.status}`);
      check("tanda tangan palsu tidak menaikkan paket", (await segar()).plan === "free");
    }

    // 2. Tanda tangan SAH tapi jumlahnya bukan yang kita tagih. Bentuk serangan
    //    yang paling halus: notifikasinya benar-benar dari Midtrans, cuma untuk
    //    transaksi yang lain dan jauh lebih murah.
    {
      const t = await tagihan("pro", 999_000);
      const r = await kirim(notif(t.id, "10000.00"));
      const baris = await prisma.pembayaran.findUnique({ where: { id: t.id } });
      check("jumlah yang tidak cocok tidak menaikkan paket", (await segar()).plan === "free");
      check("jumlah yang tidak cocok tetap dijawab 200", r.status === 200);
      check(
        "jumlah yang tidak cocok ditinggalkan jejaknya",
        /JUMLAH TIDAK COCOK/.test(baris?.catatan ?? ""),
      );
    }

    // 3. Pembayaran yang benar.
    let sampaiPertama = 0;
    {
      const t = await tagihan("growth", 499_000);
      const r = await kirim(notif(t.id, "499000.00"));
      const w = await segar();
      const baris = await prisma.pembayaran.findUnique({ where: { id: t.id } });
      sampaiPertama = w.langgananSampai?.getTime() ?? 0;

      check("pembayaran sah dijawab 200", r.status === 200);
      check("pembayaran sah menaikkan paket", w.plan === "growth", w.plan);
      check("tanggal habis langganan terisi", w.langgananSampai !== null);
      check("jatah balasan ditolkan", w.aiCreditsUsed === 0, String(w.aiCreditsUsed));
      check("barisnya dicap lunas", baris?.status === "lunas", baris?.status ?? "");
      check("metode bayarnya dicatat", baris?.metode === "bank_transfer");

      // Midtrans MEMANG mengirim notifikasi yang sama berkali-kali.
      await kirim(notif(t.id, "499000.00"));
      check(
        "notifikasi berulang tidak memperpanjang dua kali",
        (await segar()).langgananSampai?.getTime() === sampaiPertama,
      );
    }

    // 4. Perpanjangan menambah dari tanggal lama, bukan dari hari ini.
    {
      const t = await tagihan("growth", 499_000, true);
      await kirim(notif(t.id, "499000.00"));
      const selisih =
        ((await segar()).langgananSampai!.getTime() - sampaiPertama) / 86_400_000;
      check(
        "perpanjangan menambah sekitar sebulan dari tanggal lama",
        selisih > 26 && selisih < 32,
        `${selisih.toFixed(1)} hari`,
      );
    }

    // 5. capture dengan fraud challenge BUKAN lunas: uangnya masih ditahan dan
    //    masih bisa dibatalkan.
    {
      const t = await tagihan("pro", 999_000);
      await kirim({ ...notif(t.id, "999000.00", "capture"), fraud_status: "challenge" });
      const baris = await prisma.pembayaran.findUnique({ where: { id: t.id } });
      check("capture yang masih ditahan tidak menaikkan paket", (await segar()).plan === "growth");
      check("capture yang masih ditahan dicatat menunggu", baris?.status === "menunggu");
    }

    // 6. Upaya bayar yang gagal TIDAK boleh memotong bulan yang sudah lunas.
    {
      const sebelum = await segar();
      const t = await tagihan("pro", 999_000);
      await kirim(notif(t.id, "999000.00", "expire"));
      const sesudah = await segar();
      check(
        "upaya bayar yang gagal tidak memotong langganan yang sudah dibayar",
        sesudah.plan === sebelum.plan &&
          sesudah.langgananSampai!.getTime() === sebelum.langgananSampai!.getTime(),
      );
    }

    // 7. Uang dikembalikan, jadi haknya berakhir.
    {
      const t = await tagihan("growth", 499_000);
      await kirim(notif(t.id, "499000.00"));
      await kirim(notif(t.id, "499000.00", "refund"));
      const baris = await prisma.pembayaran.findUnique({ where: { id: t.id } });
      check("pengembalian dana dicatat", baris?.status === "dikembalikan", baris?.status ?? "");
      check(
        "pengembalian dana mengakhiri masa berlangganan",
        (await segar()).langgananSampai!.getTime() <= Date.now() + 5_000,
      );
    }

    // 8. order_id asing dengan tanda tangan sah. Paling sering karena notifikasi
    //    sandbox nyasar ke server production. Harus 200, kalau tidak Midtrans
    //    mengulanginya terus-menerus.
    {
      const r = await kirim(notif("order-yang-tidak-pernah-ada", "499000.00"));
      check("order yang tidak dikenal dijawab 200, bukan 500", r.status === 200, `dapat ${r.status}`);
    }
  } finally {
    // Selalu dibersihkan, termasuk kalau ada uji yang melempar galat. Workspace
    // "Uji Bayar" yang tertinggal akan ikut dihitung di laporan mana pun nanti.
    await prisma.workspace.delete({ where: { id: ws.id } }).catch(() => null);
  }

  console.log(`\n\x1b[1m${lolos} lolos, ${gagal.length} gagal\x1b[0m\n`);
  if (gagal.length) {
    for (const g of gagal) console.log(`  \x1b[31m·\x1b[0m ${g}`);
    console.log("");
    process.exit(1);
  }
}

// env diimpor supaya .env di root repo ikut terbaca, sama seperti skrip lain.
void env;

main()
  .catch((err) => {
    console.error("\n\x1b[31mUji bayar error:\x1b[0m", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
