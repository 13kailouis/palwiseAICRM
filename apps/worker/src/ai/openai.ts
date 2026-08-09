import { env } from "../env.js";
import { catatToken } from "../lib/token.js";
import {
  CompleteOptions,
  EmbedProvider,
  LlmError,
  LlmProvider,
  LlmPart,
} from "./types.js";

const BASE = "https://api.openai.com/v1";

function toOpenAiContent(parts: LlmPart[]) {
  return parts.map((p) => {
    if (p.type === "media" && p.mimeType?.startsWith("image/")) {
      return {
        type: "image_url",
        image_url: { url: `data:${p.mimeType};base64,${p.data}` },
      };
    }
    if (p.type === "media") {
      // Model chat OpenAI tidak menerima audio/dokumen inline di endpoint ini.
      return {
        type: "text",
        text: `[lampiran ${p.mimeType} tidak bisa dibaca oleh provider ini]`,
      };
    }
    return { type: "text", text: p.text ?? "" };
  });
}

export class OpenAiProvider implements LlmProvider {
  readonly name = "openai";
  readonly supportsAudio = false;
  readonly supportsImage = true;

  constructor(private apiKey: string, private defaultModel: string) {}

  async complete(opts: CompleteOptions): Promise<string> {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: opts.model || this.defaultModel,
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.maxTokens ?? 1024,
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
        messages: [
          ...(opts.system ? [{ role: "system", content: opts.system }] : []),
          ...opts.messages.map((m) => ({
            role: m.role,
            content: toOpenAiContent(m.parts),
          })),
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new LlmError(
        `OpenAI ${res.status}: ${detail.slice(0, 500)}`,
        res.status,
        "openai",
      );
    }

    const json: any = await res.json();

    const pakai = json?.usage ?? {};
    catatToken({
      provider: "openai",
      model: opts.model || this.defaultModel,
      masuk: pakai.prompt_tokens ?? 0,
      keluar: pakai.completion_tokens ?? 0,
      // OpenAI menyalakan diskon awal prompt sendiri, tanpa perlu diminta.
      dariCache: pakai.prompt_tokens_details?.cached_tokens ?? 0,
    });

    const text = (json?.choices?.[0]?.message?.content ?? "").trim();
    if (!text) throw new LlmError("OpenAI tidak mengembalikan teks", undefined, "openai");
    return text;
  }
}

export class OpenAiEmbedProvider implements EmbedProvider {
  readonly name = "openai";
  readonly dimensions = 1536;

  constructor(private apiKey: string, private model = "text-embedding-3-small") {}

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const res = await fetch(`${BASE}/embeddings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: this.model, input: texts }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new LlmError(
        `OpenAI embed ${res.status}: ${detail.slice(0, 300)}`,
        res.status,
        "openai",
      );
    }
    const json: any = await res.json();
    return (json?.data ?? []).map((d: any) => d.embedding as number[]);
  }
}

export function createOpenAi() {
  if (!env.OPENAI_API_KEY) {
    throw new LlmError("OPENAI_API_KEY belum diisi di file .env");
  }
  return {
    llm: new OpenAiProvider(env.OPENAI_API_KEY, env.OPENAI_MODEL),
    embed: new OpenAiEmbedProvider(env.OPENAI_API_KEY),
  };
}
