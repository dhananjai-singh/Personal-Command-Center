/** Swap for a real LLM + retrieval pipeline. */
export { ANSWERS, SUGGESTION_DEFS, pickKey } from "./mock";
export type { AiKey, AiAnswer, AiCard } from "./mock";

import { ANSWERS, pickKey, type AiKey, type AiAnswer } from "./mock";

export interface AskResult {
  key: AiKey;
  answer: AiAnswer;
}

/**
 * Ask a free-text question. Hits the LLM-backed /api/ask route, which grounds
 * the answer in the user's real Supabase data when available and otherwise
 * routes to a canned answer. Falls back to the local keyword router + canned
 * answer on any network failure, so the chat never stalls.
 */
export async function askAi(question: string): Promise<AskResult> {
  try {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.key) {
        return {
          key: data.key as AiKey,
          answer: (data.answer as AiAnswer) ?? ANSWERS[data.key as AiKey],
        };
      }
    }
  } catch {
    /* fall through to local router */
  }
  const key = pickKey(question);
  return { key, answer: ANSWERS[key] };
}
