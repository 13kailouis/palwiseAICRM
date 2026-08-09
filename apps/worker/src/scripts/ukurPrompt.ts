/**
 * Ukur bagian-bagian prompt yang dikirim ke model.
 *
 * Jalankan: npm run ukur:prompt
 *
 * Gunanya menjawab satu pertanyaan: kenapa catatan proses menulis "hemat 0%"
 * terus-menerus. Diskon awal prompt Google cuma berlaku kalau bagian yang sama
 * persis di depan permintaan cukup panjang. Kalau system prompt kita di bawah
 * ambang itu, diskonnya memang tidak akan pernah kena, berapa kali pun dicoba,
 * dan tidak ada gunanya mengutak-atik hal lain sebelum ini diukur.
 *
 * Yang dihitung di sini karakter, bukan token, supaya tidak perlu memanggil
 * API sama sekali. Perbandingannya kasar tapi cukup: untuk Bahasa Indonesia
 * satu token kira-kira 3,5 sampai 4 karakter.
 */
import { prisma } from "@palwise/db";

import { buildSystemPrompt, buildTurnContext } from "../ai/agent.js";
import { AMBANG_TERUKUR } from "../lib/token.js";

const PER_TOKEN = 3.8;

/**
 * Ambangnya diambil dari PENGUKURAN LANGSUNG ke API, bukan dari angka yang
 * beredar di dokumentasi.
 *
 * Sebelumnya di sini tertulis 1024, dan itu membuat skrip ini MEMBOHONGI yang
 * menjalankannya. System prompt kita sekitar 3.400 token, jadi dia mencetak
 * centang hijau "di atas ambang diskon" dengan meyakinkan. Padahal pengukuran
 * langsung ke gemini-3.5-flash pada 4 Agustus 2026 (lihat lib/token.ts)
 * menemukan 3.766 token TIDAK kena diskon dan 6.966 kena. Artinya prompt kita
 * hampir pasti belum kena, dan skrip ini justru menutup satu-satunya petunjuk
 * yang ada.
 *
 * Ini bentuk kegagalan yang paling mahal di seluruh berkas ini: dia bukan
 * membuat orang bingung, dia membuat orang berhenti mencari. Ada yang membaca
 * centang hijaunya, menyimpulkan biaya inputnya sudah murah, lalu menyusun
 * harga paket di atas kesimpulan itu.
 *
 * Satu sumber angka saja, dan sumbernya yang pernah benar-benar diukur.
 */
const AMBANG_DISKON = AMBANG_TERUKUR;

function kira(teks: string): number {
  return Math.round(teks.length / PER_TOKEN);
}

function baris(nama: string, teks: string) {
  console.log(
    `  ${nama.padEnd(34)} ${String(teks.length).padStart(7)} huruf  ~${String(
      kira(teks),
    ).padStart(5)} token`,
  );
}

async function main() {
  const agents = await prisma.agent.findMany({ orderBy: { createdAt: "asc" } });
  if (agents.length === 0) {
    console.log("Belum ada asisten di database.");
    return;
  }

  for (const agent of agents) {
    const assets = await prisma.mediaAsset.findMany({
      where: { agentId: agent.id },
      orderBy: { createdAt: "asc" },
    });
    const pilihan = assets.map((a) => ({
      code: a.code,
      name: a.name,
      description: a.description,
      kind: a.kind,
    }));

    const system = buildSystemPrompt(agent, pilihan);
    const konteks = buildTurnContext("", null, pilihan, []);

    console.log(`\n\x1b[1m${agent.name}\x1b[0m  (${assets.length} berkas)`);
    baris("system prompt (tetap)", system);
    baris("  - dari behaviorPrompt", agent.behaviorPrompt ?? "");
    baris("konteks per giliran (berubah)", konteks);

    const token = kira(system);
    if (token >= AMBANG_DISKON) {
      console.log(
        `  \x1b[32m✓\x1b[0m system prompt di atas ambang diskon (~${AMBANG_DISKON} token)`,
      );
    } else {
      console.log(
        `  \x1b[31m·\x1b[0m system prompt DI BAWAH ambang diskon (~${AMBANG_DISKON} token). ` +
          `Kurang sekitar ${AMBANG_DISKON - token} token, jadi hematnya memang 0%.`,
      );
    }
  }

  console.log("");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
