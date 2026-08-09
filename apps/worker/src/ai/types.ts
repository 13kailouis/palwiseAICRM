export interface LlmPart {
  type: "text" | "media";
  /** diisi kalau type = "text" */
  text?: string;
  /** diisi kalau type = "media" */
  mimeType?: string;
  /** base64, tanpa prefix data: */
  data?: string;
}

export interface LlmMessage {
  role: "user" | "assistant";
  parts: LlmPart[];
}

export interface CompleteOptions {
  system: string;
  messages: LlmMessage[];
  temperature?: number;
  model?: string;
  maxTokens?: number;
  /** minta output JSON murni */
  json?: boolean;
}

export interface LlmProvider {
  readonly name: string;
  /** true kalau provider bisa menerima input audio langsung */
  readonly supportsAudio: boolean;
  readonly supportsImage: boolean;
  complete(opts: CompleteOptions): Promise<string>;
}

export interface EmbedProvider {
  readonly name: string;
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}

export class LlmError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly provider?: string,
  ) {
    super(message);
    this.name = "LlmError";
  }
}

export function textMessage(role: "user" | "assistant", text: string): LlmMessage {
  return { role, parts: [{ type: "text", text }] };
}
