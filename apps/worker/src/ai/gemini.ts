import { env } from "../env.js";
import { log } from "../lib/log.js";
import { catatToken } from "../lib/token.js";
import {
  CompleteOptions,
  EmbedProvider,
  LlmError,
  LlmProvider,
  LlmPart,
} from "./types.js";

const BASE = "https://generativelanguage.googleapis.com/v1beta";

function toGeminiParts(parts: LlmPart[]) {
  return parts.map((p) =>
    p.type === "media"
      ? { inlineData: { mimeType: p.mimeType!, data: p.data! } }
      : { text: p.text ?? "" },
  );
}

/**
 * Terjemahkan error mentah Google jadi kalimat yang bisa ditindaklanjuti.
 * Tanpa ini, pemilik toko cuma lihat gumpalan JSON dan tidak tahu harus apa.
 */
function friendlyError(status: number, raw: string, model: string): string {
  if (status === 429 && /prepayment credits/i.test(raw)) {
    return (
      "Saldo Google AI kamu habis, jadi asisten tidak bisa menjawab. " +
      "Isi ulang di https://ai.studio/projects, atau pakai API key lain di file .env."
    );
  }
  if (status === 429 && /per day|PerDay|daily/i.test(raw)) {
    return (
      "Jatah gratis Google AI untuk hari ini sudah habis. Jatahnya pulih besok. " +
      "Kalau butuh sekarang, aktifkan penagihan di https://ai.studio/projects " +
      "atau pakai API key lain di file .env."
    );
  }
  if (status === 429 && /quota|RESOURCE_EXHAUSTED/i.test(raw)) {
    return (
      "Jatah pemakaian Google AI kamu habis. Cek di https://ai.studio/projects, " +
      "atau pakai API key lain di file .env."
    );
  }
  if (status === 429) {
    return "Permintaan ke Google AI terlalu sering. Tunggu sebentar lalu coba lagi.";
  }
  if (status === 404) {
    return (
      `Model "${model}" tidak ada di daftar model Google untuk key ini. ` +
      "Google kadang menghentikan model lama. Ganti nama modelnya di file .env."
    );
  }
  if (status === 401 || status === 403) {
    return "API key Google ditolak. Periksa GEMINI_API_KEY di file .env.";
  }
  if (status >= 500) {
    return "Server Google AI sedang bermasalah. Coba lagi sebentar lagi.";
  }
  return `Google AI menolak permintaan (kode ${status}). ${raw.slice(0, 200)}`;
}

/**
 * Gangguan yang biasanya hilang sendiri kalau dicoba lagi sebentar kemudian.
 *
 * Kehabisan saldo atau jatah harian TIDAK termasuk, karena mengulangnya cuma
 * menunda kegagalan yang sama.
 */
function bisaDicobaUlang(status: number, raw: string): boolean {
  if (status >= 500) return true;
  if (status === 429) {
    return !/prepayment credits|per day|PerDay|daily/i.test(raw);
  }
  return false;
}

const PERCOBAAN_MAKS = 3;
const JEDA_MS = [1_200, 4_000];

async function callGemini(path: string, body: unknown, apiKey: string) {
  const model = path.split("/")[1]?.split(":")[0] ?? "?";
  let terakhir: LlmError | null = null;

  for (let percobaan = 0; percobaan < PERCOBAAN_MAKS; percobaan++) {
    let res: Response;
    try {
      res = await fetch(`${BASE}/${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      // Jaringan putus sesaat juga layak dicoba lagi.
      terakhir = new LlmError(
        "Tidak bisa menghubungi Google AI. Periksa koneksi internet.",
        undefined,
        "gemini",
      );
      if (percobaan < PERCOBAAN_MAKS - 1) {
        await tunggu(JEDA_MS[percobaan]);
        continue;
      }
      throw terakhir;
    }

    if (res.ok) return res.json() as Promise<any>;

    const detail = await res.text().catch(() => "");
    terakhir = new LlmError(
      friendlyError(res.status, detail, model),
      res.status,
      "gemini",
    );

    if (!bisaDicobaUlang(res.status, detail) || percobaan === PERCOBAAN_MAKS - 1) {
      throw terakhir;
    }

    const jeda = JEDA_MS[percobaan];
    log.warn(
      `Google AI menolak sementara (kode ${res.status}), coba lagi dalam ${jeda / 1000} detik`,
    );
    await tunggu(jeda);
  }

  throw terakhir ?? new LlmError("Gagal menghubungi Google AI", undefined, "gemini");
}

function tunggu(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Berapa lama sebuah model diistirahatkan sesudah ketahuan penuh.
 *
 * Cukup lama untuk berhenti membuang lima detik per pesan, cukup pendek supaya
 * begitu modelnya lega lagi kita kembali memakainya dalam hitungan menit, bukan
 * jam. Yang dicoba ulang cuma satu pesan tiap lima menit, dan itu murah.
 */
const ISTIRAHAT_MS = 5 * 60 * 1000;

/** Kapan sebuah model boleh dicoba lagi. Kunci per nama model. */
const istirahat = new Map<string, number>();

/** Dipakai selftest supaya keadaan istirahat tidak bocor antar bagian uji. */
export function resetIstirahatModel(): void {
  istirahat.clear();
}

export class GeminiProvider implements LlmProvider {
  readonly name = "gemini";
  // Gemini menerima audio & gambar langsung sebagai inline data —
  // ini alasan utama dia dipilih sebagai default.
  readonly supportsAudio = true;
  readonly supportsImage = true;

  constructor(
    private apiKey: string,
    private defaultModel: string,
    private fallbackModel: string,
  ) {}

  async complete(opts: CompleteOptions): Promise<string> {
    const utama = opts.model || this.defaultModel;
    const punyaCadangan = !!this.fallbackModel && this.fallbackModel !== utama;

    // Model yang barusan ketahuan penuh tidak dicoba lagi untuk sementara.
    //
    // Tanpa ini, SETIAP pesan membayar ongkos yang sama: tiga percobaan ke model
    // utama dengan jeda 1,2 lalu 4 detik, baru dialihkan ke cadangan. Lima detik
    // lebih terbuang per pesan, padahal jawabannya sudah pasti sama, dan
    // komentar di bawah sendiri mencatat bahwa penuhnya bisa berjam-jam.
    //
    // Ongkos itu bukan cuma lambat. Selama lima detik itu pelanggan sering
    // mengirim pesan lagi, dan jawaban yang sedang disusun jadi menjawab
    // keadaan yang sudah lewat. Memperpendeknya ikut mengecilkan lubang itu.
    if (punyaCadangan && Date.now() < (istirahat.get(utama) ?? 0)) {
      return this.jalankan(this.fallbackModel, opts);
    }

    try {
      const hasil = await this.jalankan(utama, opts);
      // Sudah pulih. Dicatat supaya pesan berikutnya kembali ke model utama.
      if (istirahat.delete(utama)) {
        log.ok(`model "${utama}" sudah lega lagi`);
      }
      return hasil;
    } catch (err) {
      const gagalSementara =
        err instanceof LlmError && err.status !== undefined && err.status >= 500;

      // Model unggulan kadang penuh berjam-jam. Daripada pelanggan tidak
      // dibalas sama sekali, pakai model cadangan yang lebih kecil.
      if (gagalSementara && punyaCadangan) {
        if (!istirahat.has(utama)) {
          log.warn(
            `model "${utama}" sedang penuh, beralih ke cadangan "${this.fallbackModel}" selama ${ISTIRAHAT_MS / 60000} menit`,
          );
        }
        istirahat.set(utama, Date.now() + ISTIRAHAT_MS);
        return this.jalankan(this.fallbackModel, opts);
      }
      throw err;
    }
  }

  private async jalankan(model: string, opts: CompleteOptions): Promise<string> {

    // Model Gemini 3.x "berpikir" dulu sebelum menjawab, dan token berpikir itu
    // dipotong dari jatah maxOutputTokens yang sama. Untuk satu perintah sepele
    // saja bisa habis 480 token. Kalau jatahnya mepet, jawabannya terpotong di
    // tengah dan JSON-nya jadi rusak.
    const thinking =
      env.GEMINI_THINKING === "off" ? { thinkingConfig: { thinkingBudget: 0 } } : {};

    const body: Record<string, unknown> = {
      contents: opts.messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: toGeminiParts(m.parts),
      })),
      generationConfig: {
        temperature: opts.temperature ?? 0.4,
        maxOutputTokens: opts.maxTokens ?? 1024,
        ...(opts.json ? { responseMimeType: "application/json" } : {}),
        ...thinking,
      },
      // Jangan blokir topik bisnis biasa yang kadang kena filter terlalu ketat.
      safetySettings: [
        "HARM_CATEGORY_HARASSMENT",
        "HARM_CATEGORY_HATE_SPEECH",
        "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        "HARM_CATEGORY_DANGEROUS_CONTENT",
      ].map((category) => ({ category, threshold: "BLOCK_ONLY_HIGH" })),
    };

    if (opts.system) {
      body.systemInstruction = { parts: [{ text: opts.system }] };
    }

    const json = await callGemini(
      `models/${model}:generateContent`,
      body,
      this.apiKey,
    );

    const pakai = json?.usageMetadata ?? {};
    catatToken({
      provider: "gemini",
      model,
      masuk: pakai.promptTokenCount ?? 0,
      keluar: (pakai.candidatesTokenCount ?? 0) + (pakai.thoughtsTokenCount ?? 0),
      // Google menagih token ini jauh lebih murah karena awal prompt-nya
      // persis sama dengan panggilan sebelumnya.
      dariCache: pakai.cachedContentTokenCount ?? 0,
      berpikir: pakai.thoughtsTokenCount ?? 0,
    });

    const candidate = json?.candidates?.[0];
    const text: string = (candidate?.content?.parts ?? [])
      .map((p: any) => p?.text ?? "")
      .join("")
      .trim();

    if (!text) {
      const reason = candidate?.finishReason ?? json?.promptFeedback?.blockReason;
      if (reason === "MAX_TOKENS") {
        throw new LlmError(
          "Jatah panjang jawaban habis sebelum modelnya sempat menulis apa pun. " +
            "Naikkan maxTokens atau setel GEMINI_THINKING=off di file .env.",
          undefined,
          "gemini",
        );
      }
      throw new LlmError(
        `Gemini tidak mengembalikan teks (finishReason: ${reason ?? "unknown"})`,
        undefined,
        "gemini",
      );
    }

    if (candidate?.finishReason === "MAX_TOKENS") {
      log.warn(
        "jawaban Gemini terpotong karena jatah token habis (token berpikir: " +
          `${json?.usageMetadata?.thoughtsTokenCount ?? 0})`,
      );
    }
    return text;
  }
}

export class GeminiEmbedProvider implements EmbedProvider {
  readonly name = "gemini";
  // gemini-embedding-001 aslinya 3072 dimensi. Kita minta 768 supaya ukuran
  // penyimpanannya seperempatnya, dan untuk kebutuhan pencarian ini hasilnya
  // sama saja. Cosine similarity tidak terpengaruh penyusutan ini.
  readonly dimensions = 768;

  constructor(private apiKey: string, private model: string) {}

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const out: number[][] = [];
    // batchEmbedContents dibatasi 100 request per panggilan.
    for (let i = 0; i < texts.length; i += 100) {
      const batch = texts.slice(i, i + 100);
      const json = await callGemini(
        `models/${this.model}:batchEmbedContents`,
        {
          requests: batch.map((text) => ({
            model: `models/${this.model}`,
            content: { parts: [{ text }] },
            outputDimensionality: this.dimensions,
          })),
        },
        this.apiKey,
      );
      for (const e of json?.embeddings ?? []) {
        out.push(e.values as number[]);
      }
    }

    if (out.length !== texts.length) {
      throw new LlmError(
        `Jumlah embedding tidak cocok: minta ${texts.length}, dapat ${out.length}`,
        undefined,
        "gemini",
      );
    }
    return out;
  }
}

export function createGemini(): {
  llm: GeminiProvider;
  embed: GeminiEmbedProvider;
} {
  if (!env.GEMINI_API_KEY) {
    throw new LlmError(
      "GEMINI_API_KEY belum diisi di file .env. Ambil gratis di https://aistudio.google.com/apikey",
    );
  }
  return {
    llm: new GeminiProvider(
      env.GEMINI_API_KEY,
      env.GEMINI_MODEL,
      env.GEMINI_FALLBACK_MODEL,
    ),
    embed: new GeminiEmbedProvider(env.GEMINI_API_KEY, env.GEMINI_EMBED_MODEL),
  };
}
