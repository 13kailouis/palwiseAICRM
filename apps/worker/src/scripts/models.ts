/**
 * Tampilkan model Google AI yang masih tersedia untuk API key kamu.
 *
 * Google rutin menghentikan model lama tanpa pemberitahuan, dan kalau nama di
 * .env sudah tidak ada, asisten berhenti menjawab. Jalankan ini untuk memilih
 * nama pengganti: npm run models
 */
import { env } from "../env.js";

interface ModelInfo {
  name: string;
  displayName?: string;
  supportedGenerationMethods?: string[];
}

async function main() {
  if (!env.GEMINI_API_KEY) {
    console.log("GEMINI_API_KEY belum diisi di file .env");
    process.exit(1);
  }

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200",
    { headers: { "x-goog-api-key": env.GEMINI_API_KEY } },
  );

  if (!res.ok) {
    console.log(`Google menolak permintaan (kode ${res.status}).`);
    console.log(await res.text().catch(() => ""));
    process.exit(1);
  }

  const json = (await res.json()) as { models?: ModelInfo[] };
  const models = json.models ?? [];

  const chat = models.filter((m) =>
    m.supportedGenerationMethods?.includes("generateContent"),
  );
  const embed = models.filter((m) =>
    m.supportedGenerationMethods?.some((s) => s.toLowerCase().includes("embed")),
  );

  const short = (m: ModelInfo) => m.name.replace("models/", "");
  const mark = (name: string, current: string) =>
    name === current ? "  \x1b[32m<- yang dipakai sekarang\x1b[0m" : "";

  console.log("\n\x1b[1mModel untuk menjawab chat\x1b[0m");
  for (const m of chat) {
    console.log(`  ${short(m)}${mark(short(m), env.GEMINI_MODEL)}`);
  }

  console.log("\n\x1b[1mModel untuk menghafal info bisnis\x1b[0m");
  for (const m of embed) {
    console.log(`  ${short(m)}${mark(short(m), env.GEMINI_EMBED_MODEL)}`);
  }

  // Ada di daftar belum tentu bisa dipakai: Google menutup model lama untuk
  // API key yang baru dibuat, dan itu hanya ketahuan kalau benar-benar dicoba.
  console.log("\n\x1b[1mMencoba model yang ada di .env kamu\x1b[0m");

  const chatResult = await probeChat(env.GEMINI_MODEL);
  console.log(`  menjawab chat  (${env.GEMINI_MODEL}): ${chatResult.message}`);

  if (env.GEMINI_FALLBACK_MODEL) {
    const cadangan = await probeChat(env.GEMINI_FALLBACK_MODEL);
    console.log(
      `  cadangan       (${env.GEMINI_FALLBACK_MODEL}): ${cadangan.message}`,
    );
    if (!chatResult.ok && cadangan.ok) {
      console.log(
        "  \x1b[33mModel utama bermasalah, tapi cadangannya jalan, jadi asistenmu tetap membalas.\x1b[0m",
      );
    }
  }

  const embedResult = await probeEmbed(env.GEMINI_EMBED_MODEL);
  console.log(`  menghafal info (${env.GEMINI_EMBED_MODEL}): ${embedResult.message}`);

  console.log("");
  if (chatResult.ok && embedResult.ok) {
    console.log("\x1b[32mDua-duanya jalan. Tidak ada yang perlu diubah.\x1b[0m");
  } else {
    if (!chatResult.ok) {
      // Model penuh itu masalah sesaat di sisi Google. Menyuruh ganti nama
      // model malah membuat pengguna mengubah pengaturan yang tidak rusak.
      if (chatResult.sementara) {
        console.log(
          "\x1b[33mModel utama sedang penuh, bukan rusak. Jangan diganti, tunggu saja.\x1b[0m",
        );
      } else {
        const usable = await firstWorkingChat(chat.map(short), env.GEMINI_MODEL);
        console.log(
          usable
            ? `\x1b[33mGanti GEMINI_MODEL di .env jadi:\x1b[0m ${usable}`
            : "\x1b[31mTidak ada model chat yang bisa dipakai key ini.\x1b[0m",
        );
      }
    }
    if (!embedResult.ok) {
      console.log(
        `\x1b[33mGanti GEMINI_EMBED_MODEL di .env,\x1b[0m lalu buka halaman Info bisnis dan klik "Hafalkan lagi".`,
      );
    }
  }
  console.log("");
}

function explain(status: number, raw: string): string {
  if (/no longer available to new users/i.test(raw)) {
    return "\x1b[31mditutup untuk API key baru\x1b[0m";
  }
  if (status === 404) return "\x1b[31mtidak ada lagi\x1b[0m";
  if (/exceeded your current quota/i.test(raw)) return "\x1b[31mjatah habis\x1b[0m";
  if (/prepayment credits/i.test(raw)) return "\x1b[31msaldo habis\x1b[0m";
  if (status === 401 || status === 403) return "\x1b[31mAPI key ditolak\x1b[0m";
  if (status >= 500) return "\x1b[33msedang penuh di sisi Google\x1b[0m";
  return `\x1b[31mgagal (kode ${status})\x1b[0m`;
}

async function probe(path: string, body: unknown) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": env.GEMINI_API_KEY,
    },
    body: JSON.stringify(body),
  });
  if (res.ok) return { ok: true, sementara: false, message: "\x1b[32mjalan\x1b[0m" };
  const raw = await res.text().catch(() => "");
  return {
    ok: false,
    // Gangguan sesaat: tunggu saja, jangan ubah pengaturan.
    sementara: res.status >= 500,
    message: explain(res.status, raw),
  };
}

function probeChat(model: string) {
  return probe(`models/${model}:generateContent`, {
    contents: [{ role: "user", parts: [{ text: "halo" }] }],
    generationConfig: { maxOutputTokens: 5 },
  });
}

function probeEmbed(model: string) {
  return probe(`models/${model}:batchEmbedContents`, {
    requests: [
      {
        model: `models/${model}`,
        content: { parts: [{ text: "halo" }] },
        outputDimensionality: 768,
      },
    ],
  });
}

/** Cari model chat pertama yang benar-benar mau menerima key ini. */
async function firstWorkingChat(
  candidates: string[],
  exclude: string,
): Promise<string | null> {
  // Dahulukan yang namanya "flash", karena itu yang paling murah.
  const ordered = candidates
    .filter((m) => m !== exclude && /flash/i.test(m) && !/image|tts|audio|robotics|live/i.test(m))
    .sort((a, b) => Number(/lite/i.test(a)) - Number(/lite/i.test(b)));

  for (const m of ordered.slice(0, 6)) {
    if ((await probeChat(m)).ok) return m;
  }
  return null;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
