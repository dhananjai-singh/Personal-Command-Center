import "server-only";
import OpenAI from "openai";

/**
 * Shared OpenAI client + single model swap-point.
 *
 * Points at a custom provider (aicredits.in) via OPENAI_BASE_URL. The SDK
 * appends `/chat/completions` onto the baseURL, so OPENAI_BASE_URL must end in
 * the version segment the provider expects (e.g. https://aicredits.in/v1).
 *
 * MODEL lives here and nowhere else — change it in this one place to swap the
 * model used by every AI feature (capture parse, ask-over-data, meal vision).
 */
export const MODEL = "gpt-4o";

const apiKey = process.env.OPENAI_API_KEY?.trim();
const baseURL = process.env.OPENAI_BASE_URL?.trim();

/** Cheap gate so routes can fall straight back to deterministic mocks. */
export function isLLMConfigured(): boolean {
  return Boolean(apiKey && !apiKey.startsWith("your-"));
}

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: apiKey ?? "",
      ...(baseURL ? { baseURL } : {}),
    });
  }
  return client;
}

export type UserContent =
  | string
  | OpenAI.Chat.Completions.ChatCompletionContentPart[];

/**
 * Single-turn completion. The static `system` string goes first so the provider
 * can prefix-cache it across calls. Set `json` to ask for a JSON object back.
 * Throws on transport/auth errors so callers can fall back to mocks.
 */
export async function chat(opts: {
  system: string;
  user: UserContent;
  maxTokens?: number;
  temperature?: number;
  json?: boolean;
}): Promise<string> {
  const res = await getOpenAI().chat.completions.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 1024,
    temperature: opts.temperature ?? 0,
    ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
  });

  return res.choices[0]?.message?.content?.trim() ?? "";
}

/** Parse a JSON object out of a model reply, tolerating ```json fences. */
export function parseJSON<T>(text: string): T {
  const stripped = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  return JSON.parse(stripped) as T;
}
