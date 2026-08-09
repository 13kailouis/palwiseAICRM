import { env } from "../env.js";
import { createAnthropic } from "./anthropic.js";
import { createGemini } from "./gemini.js";
import { createOpenAi } from "./openai.js";
import { EmbedProvider, LlmError, LlmProvider } from "./types.js";

let llmCache: LlmProvider | null = null;
let embedCache: EmbedProvider | null = null;

/**
 * Provider chat aktif. Ditentukan oleh AI_PROVIDER di .env supaya biaya per
 * balasan bisa dites ulang tanpa mengubah kode.
 */
export function getLlm(): LlmProvider {
  if (llmCache) return llmCache;

  switch (env.AI_PROVIDER) {
    case "openai":
      llmCache = createOpenAi().llm;
      break;
    case "anthropic":
      llmCache = createAnthropic().llm;
      break;
    case "gemini":
    default:
      llmCache = createGemini().llm;
      break;
  }
  return llmCache;
}

/**
 * Provider embedding untuk RAG. Anthropic tidak punya embedding, jadi kita
 * jatuh balik ke Gemini (atau OpenAI) selama key-nya tersedia.
 */
export function getEmbedder(): EmbedProvider {
  if (embedCache) return embedCache;

  if (env.AI_PROVIDER === "openai" && env.OPENAI_API_KEY) {
    embedCache = createOpenAi().embed;
  } else if (env.GEMINI_API_KEY) {
    embedCache = createGemini().embed;
  } else if (env.OPENAI_API_KEY) {
    embedCache = createOpenAi().embed;
  } else {
    throw new LlmError(
      "Tidak ada API key untuk embedding. Isi GEMINI_API_KEY (gratis) atau OPENAI_API_KEY di .env",
    );
  }
  return embedCache;
}

export function describeProviders() {
  const llmReady =
    (env.AI_PROVIDER === "gemini" && !!env.GEMINI_API_KEY) ||
    (env.AI_PROVIDER === "openai" && !!env.OPENAI_API_KEY) ||
    (env.AI_PROVIDER === "anthropic" && !!env.ANTHROPIC_API_KEY);

  return {
    provider: env.AI_PROVIDER,
    model:
      env.AI_PROVIDER === "openai"
        ? env.OPENAI_MODEL
        : env.AI_PROVIDER === "anthropic"
          ? env.ANTHROPIC_MODEL
          : env.GEMINI_MODEL,
    ready: llmReady,
    embeddingReady: !!env.GEMINI_API_KEY || !!env.OPENAI_API_KEY,
    supportsAudio: env.AI_PROVIDER === "gemini",
  };
}

/** Reset cache — dipakai kalau .env diubah saat dev. */
export function resetProviders() {
  llmCache = null;
  embedCache = null;
}
