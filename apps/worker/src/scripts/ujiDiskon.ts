/**
 * Uji apakah diskon awal prompt Google benar-benar kena.
 *
 * Jalankan: npm run uji:diskon
 *
 * Catatan proses selalu menulis "hemat 0%", dan ada dua kemungkinan yang
 * kelihatannya sama dari luar:
 *
 *   1. Diskonnya memang tidak pernah kena.
 *   2. Diskonnya kena, tapi kita membaca nama field yang salah dari jawaban
 *      Google, jadi yang dilaporkan nol padahal tidak.
 *
 * Menebak di antara keduanya tidak ada gunanya. Skrip ini memanggil model dua
 * kali dengan system prompt yang sama persis, lalu mencetak SELURUH isi
 * usageMetadata apa adanya. Panggilan kedua yang menentukan: kalau diskonnya
 * bekerja, angka cache-nya muncul di situ.
 *
 * Dua panggilan sungguhan, jadi jatah harian ikut terpakai sedikit. Itu
 * memang harganya untuk berhenti menebak.
 */
import { env } from "../env.js";
import { prisma } from "@palwise/db";

import { buildSystemPrompt } from "../ai/agent.js";

const BASE = "https://generativelanguage.googleapis.com/v1beta";

async function panggil(model: string, system: string, tanya: string) {
  const res = await fetch(`${BASE}/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: tanya }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 64,
        ...(env.GEMINI_THINKING === "off"
          ? { thinkingConfig: { thinkingBudget: 0 } }
          : {}),
      },
    }),
  });

  const teks = await res.text();
  if (!res.ok) {
    console.log(`  gagal (kode ${res.status}): ${teks.slice(0, 300)}`);
    return null;
  }
  return JSON.parse(teks)?.usageMetadata ?? {};
}

async function main() {
  if (!env.GEMINI_API_KEY) {
    console.log("GEMINI_API_KEY belum diisi di .env.");
    return;
  }

  const agent = await prisma.agent.findFirst({ orderBy: { createdAt: "asc" } });
  if (!agent) {
    console.log("Belum ada asisten di database.");
    return;
  }

  const system = buildSystemPrompt(agent, []);
  const model = env.GEMINI_MODEL;

  console.log(`\n  model         ${model}`);
  console.log(`  system prompt ${system.length} huruf\n`);

  // Diuji di beberapa ukuran, karena ambang diskon Google berbeda per model dan
  // angkanya tidak diumumkan untuk tiap versi. Kalau ukuran kita tidak kena
  // tapi yang lebih besar kena, berarti mekanismenya jalan dan yang kurang cuma
  // panjangnya. Kalau tidak ada satu pun yang kena, mengubah panjang prompt
  // tidak akan menolong sama sekali.
  //
  // Ganjalannya ditaruh di DEPAN, karena yang dihitung Google itu awal
  // permintaan. Kalau ditaruh di belakang, yang sama persis cuma bagian yang
  // sudah kita punya sekarang.
  const ganjal = "Catatan internal yang tidak mengubah perilaku. ".repeat(200);

  for (const [nama, isi] of [
    ["apa adanya", system],
    ["+ ganjalan 1x", ganjal + "\n\n" + system],
    ["+ ganjalan 3x", ganjal + ganjal + ganjal + "\n\n" + system],
  ] as const) {
    // Panggilan pertama mengisi, yang kedua yang menentukan.
    const a = await panggil(model, isi, "Halo, jam buka berapa?");
    if (!a) return;
    const b = await panggil(model, isi, "Halo, alamatnya di mana?");
    if (!b) return;

    const cache = b.cachedContentTokenCount ?? 0;
    const tanda = cache > 0 ? "\x1b[32m✓\x1b[0m" : "\x1b[31m·\x1b[0m";
    console.log(
      `  ${tanda} ${nama.padEnd(16)} masuk ${String(b.promptTokenCount).padStart(6)} token, dari cache ${cache}`,
    );
    if (cache === 0) console.log(`      ${JSON.stringify(b)}`);
  }

  console.log(
    "\n  Yang dicari: field yang menyebut cache di panggilan kedua tiap ukuran.\n",
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
