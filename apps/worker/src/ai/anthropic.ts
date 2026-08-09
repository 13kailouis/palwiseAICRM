import { env } from "../env.js";
import { catatToken } from "../lib/token.js";
import { CompleteOptions, LlmError, LlmProvider, LlmPart } from "./types.js";

const BASE = "https://api.anthropic.com/v1";

function toAnthropicContent(parts: LlmPart[]) {
  return parts.map((p) => {
    if (p.type === "media" && p.mimeType?.startsWith("image/")) {
      return {
        type: "image",
        source: { type: "base64", media_type: p.mimeType, data: p.data },
      };
    }
    if (p.type === "media") {
      return {
        type: "text",
        text: `[lampiran ${p.mimeType} tidak bisa dibaca oleh provider ini]`,
      };
    }
    return { type: "text", text: p.text ?? "" };
  });
}

export class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic";
  // Claude tidak menerima input audio.
  readonly supportsAudio = false;
  readonly supportsImage = true;

  constructor(private apiKey: string, private defaultModel: string) {}

  async complete(opts: CompleteOptions): Promise<string> {
    // Claude tidak punya mode JSON; kita paksa lewat system prompt.
    const system = opts.json
      ? `${opts.system}\n\nBalas HANYA dengan JSON valid, tanpa penjelasan dan tanpa markdown fence.`
      : opts.system;

    const res = await fetch(`${BASE}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: opts.model || this.defaultModel,
        max_tokens: opts.maxTokens ?? 1024,
        temperature: opts.temperature ?? 0.4,
        // Beda dari Google dan OpenAI, Anthropic tidak menyalakan diskon awal
        // prompt sendiri. Harus ditandai, dan tandanya ditaruh di ujung system
        // prompt supaya seluruh isinya ikut kena. Kalau isinya terlalu pendek,
        // tandanya diabaikan begitu saja, bukan jadi error.
        ...(system
          ? {
              system: [
                {
                  type: "text",
                  text: system,
                  cache_control: { type: "ephemeral" },
                },
              ],
            }
          : {}),
        messages: opts.messages.map((m) => ({
          role: m.role,
          content: toAnthropicContent(m.parts),
        })),
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new LlmError(
        `Anthropic ${res.status}: ${detail.slice(0, 500)}`,
        res.status,
        "anthropic",
      );
    }

    const json: any = await res.json();

    const pakai = json?.usage ?? {};
    catatToken({
      provider: "anthropic",
      model: opts.model || this.defaultModel,
      // Token yang dibaca dari cache dan yang baru ditulis ke cache dihitung
      // terpisah oleh Anthropic, tidak termasuk di input_tokens.
      masuk:
        (pakai.input_tokens ?? 0) +
        (pakai.cache_read_input_tokens ?? 0) +
        (pakai.cache_creation_input_tokens ?? 0),
      keluar: pakai.output_tokens ?? 0,
      dariCache: pakai.cache_read_input_tokens ?? 0,
    });

    const text = (json?.content ?? [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("")
      .trim();
    if (!text) throw new LlmError("Anthropic tidak mengembalikan teks", undefined, "anthropic");
    return text;
  }
}

export function createAnthropic() {
  if (!env.ANTHROPIC_API_KEY) {
    throw new LlmError("ANTHROPIC_API_KEY belum diisi di file .env");
  }
  return {
    llm: new AnthropicProvider(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL),
    // Anthropic tidak menyediakan embedding — RAG tetap pakai Gemini/OpenAI.
    embed: null,
  };
}
