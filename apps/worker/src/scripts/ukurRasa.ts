/**
 * Mengukur apakah lapisan rasa benar-benar bekerja.
 *
 * Jalankan: npm run ukur:rasa
 *
 * Sampai sekarang tidak ada satu pun angka yang bisa membedakan lapisan ini
 * dari hiasan. Selftest membuktikan kodenya jalan; korpus membuktikan
 * bacaannya masuk akal pada kalimat buatan. Dua-duanya tidak membuktikan
 * bahwa pelanggan sungguhan jadi lebih tenang.
 *
 * DUA ANGKA, dan cuma dua.
 *
 * 1. PEMULIHAN — apakah `kesal` turun sesudah dijawab.
 *
 *    Ini satu-satunya bukti bahwa sikapnya bekerja, dan sekaligus satu-satunya
 *    angka yang boleh dipakai bicara ke calon pembeli tanpa berbohong. Datanya
 *    sudah ada sejak Fase 1: `Message.rasa` menyimpan bacaan tiap giliran
 *    customer, jadi tinggal membandingkan sebelum dan sesudah balasan.
 *
 * 2. BIAS SOPAN — berapa banyak yang pergi tanpa pernah berlencana.
 *
 *    Leksikonnya condong ke bahasa gaul Jakarta. Pelanggan yang paling halus
 *    cara bicaranya — yang lebih tua, yang lebih sungkan — adalah yang paling
 *    mungkin di-bawah-baca, DAN yang paling mungkin pergi diam-diam tanpa
 *    pernah komplain. Kalau banyak obrolan mati tanpa pernah sekali pun
 *    berlencana, yang perlu diperbaiki telinganya, bukan sikapnya.
 *
 *    Angka ini tidak bisa "lulus" atau "gagal" — dia perbandingan yang harus
 *    dibaca orang. Karena itu keluarannya tidak pernah mengembalikan kode
 *    kesalahan.
 */
import { prisma } from "@palwise/db";
import { bacaRasaPesan } from "../core/rasa.js";

/** Obrolan yang tidak ada pesan baru selama ini dianggap sudah mati. */
const HARI_MATI = 3;

/** Di bawah ini bukan kesal, jadi tidak ada yang perlu dipulihkan. */
const AMBANG_KESAL = 0.5;

function persen(a: number, b: number): string {
  return b === 0 ? "—" : `${((a / b) * 100).toFixed(0)}%`;
}

function bar(nilai: number, maks: number, lebar = 24): string {
  if (maks <= 0) return "";
  const n = Math.round((nilai / maks) * lebar);
  return "█".repeat(Math.max(0, n)).padEnd(lebar, "·");
}

async function main() {
  const percakapan = await prisma.conversation.findMany({
    where: { messages: { some: { rasa: { not: null } } } },
    select: {
      id: true,
      lastMessageAt: true,
      status: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: { role: true, rasa: true, createdAt: true },
      },
    },
  });

  if (percakapan.length === 0) {
    console.log(
      "\nBelum ada obrolan yang punya bacaan rasa. Jalankan `npm run contoh:rasa` " +
        "untuk data contoh, atau tunggu pelanggan sungguhan.\n",
    );
    return;
  }

  // ── 1. Pemulihan ────────────────────────────────────────────────────────────
  //
  // Untuk tiap giliran customer yang terbaca kesal, cari bacaan customer
  // BERIKUTNYA yang terjadi sesudah ada balasan di antaranya. Kalau tidak ada
  // balasan di antaranya, itu bukan pemulihan — itu dia menulis lagi karena
  // didiamkan, dan justru itu yang mau kita hitung terpisah.
  let kesempatan = 0;
  let membaik = 0;
  let memburuk = 0;
  let didiamkan = 0;
  let totalDelta = 0;

  for (const p of percakapan) {
    const baris = p.messages;
    for (let i = 0; i < baris.length; i++) {
      const sekarang = bacaRasaPesan(baris[i].rasa);
      if (!sekarang || sekarang.k < AMBANG_KESAL) continue;

      let adaBalasan = false;
      let berikutnya: ReturnType<typeof bacaRasaPesan> = null;
      for (let j = i + 1; j < baris.length; j++) {
        if (baris[j].role === "ai" || baris[j].role === "human") {
          adaBalasan = true;
          continue;
        }
        if (baris[j].role === "customer") {
          berikutnya = bacaRasaPesan(baris[j].rasa);
          break;
        }
      }

      if (!berikutnya) continue;
      if (!adaBalasan) {
        didiamkan++;
        continue;
      }

      kesempatan++;
      const delta = berikutnya.k - sekarang.k;
      totalDelta += delta;
      if (delta < -0.05) membaik++;
      else if (delta > 0.05) memburuk++;
    }
  }

  console.log("\n\x1b[1mPemulihan\x1b[0m — apakah kesal turun sesudah dijawab\n");
  if (kesempatan === 0) {
    console.log("  Belum ada satu pun giliran kesal yang sudah dijawab lalu dibalas lagi.");
  } else {
    console.log(`  Giliran kesal yang sempat dijawab   ${kesempatan}`);
    console.log(
      `  Jadi lebih tenang sesudahnya        ${membaik}  ${persen(membaik, kesempatan)}  ${bar(membaik, kesempatan)}`,
    );
    console.log(
      `  Justru makin panas                  ${memburuk}  ${persen(memburuk, kesempatan)}  ${bar(memburuk, kesempatan)}`,
    );
    console.log(
      `  Rata-rata perubahan kesal           ${(totalDelta / kesempatan).toFixed(3)} (negatif = mereda)`,
    );
  }
  if (didiamkan > 0) {
    console.log(
      `\n  \x1b[33m${didiamkan}\x1b[0m giliran kesal yang menulis lagi TANPA pernah dibalas.`,
    );
    console.log("  Ini bukan soal sikap. Ini soal ada yang tidak menjawab.");
  }

  // ── 2. Bias sopan ───────────────────────────────────────────────────────────
  const batas = Date.now() - HARI_MATI * 86_400_000;
  const mati = percakapan.filter((p) => p.lastMessageAt.getTime() < batas);

  let matiTanpaLencana = 0;
  let matiDenganLencana = 0;
  const berlencana = new Set(["marah", "kesal", "ragu", "malu", "mundur", "panas"]);

  for (const p of mati) {
    const pernah = p.messages.some((m) => {
      const r = bacaRasaPesan(m.rasa);
      return r ? berlencana.has(r.l) : false;
    });
    if (pernah) matiDenganLencana++;
    else matiTanpaLencana++;
  }

  console.log(
    `\n\x1b[1mBias sopan\x1b[0m — yang pergi tanpa pernah terbaca (diam ${HARI_MATI} hari)\n`,
  );
  if (mati.length === 0) {
    console.log("  Belum ada obrolan yang cukup lama diam untuk dihitung.");
  } else {
    console.log(`  Obrolan yang sudah mati             ${mati.length}`);
    console.log(
      `  Pernah berlencana sebelum mati      ${matiDenganLencana}  ${persen(matiDenganLencana, mati.length)}`,
    );
    console.log(
      `  Tidak pernah sekali pun            ${matiTanpaLencana}  ${persen(matiTanpaLencana, mati.length)}`,
    );
    console.log(
      "\n  Angka kedua yang perlu diawasi. Sebagian memang obrolan yang wajar\n" +
        "  selesai. Tapi kalau dia terus naik, artinya telinganya yang kurang —\n" +
        "  orang yang paling sopan cara bicaranya justru yang paling mungkin\n" +
        "  pergi tanpa pernah kita dengar.",
    );
  }

  // ── Sebaran label, sekadar untuk melihat bentuknya ──────────────────────────
  const hitung = new Map<string, number>();
  for (const p of percakapan) {
    for (const m of p.messages) {
      const r = bacaRasaPesan(m.rasa);
      if (r) hitung.set(r.l, (hitung.get(r.l) ?? 0) + 1);
    }
  }
  const total = [...hitung.values()].reduce((a, b) => a + b, 0);
  const maks = Math.max(1, ...hitung.values());

  console.log("\n\x1b[1mSebaran bacaan\x1b[0m\n");
  for (const [label, n] of [...hitung.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${label.padEnd(8)} ${String(n).padStart(5)}  ${persen(n, total).padStart(4)}  ${bar(n, maks)}`);
  }
  console.log("");
}

main().finally(() => prisma.$disconnect());
