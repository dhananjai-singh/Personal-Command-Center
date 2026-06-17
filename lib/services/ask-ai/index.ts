/** Suggestion chips + types still come from here; answers come from the LLM. */
export { SUGGESTION_DEFS } from "./mock";
export type { AiKey, AiAnswer, AiCard } from "./mock";

import type { AiAnswer } from "./mock";

/**
 * Ask a free-text question. Hits /api/ask, which grounds the answer in the
 * user's real synced data (tasks/habits/meals/weights) via the LLM. There is no
 * canned/sample fallback — on any failure we return a short apology with no
 * cards, never fabricated items.
 */
export async function askAi(question: string): Promise<AiAnswer> {
  try {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.answer) return data.answer as AiAnswer;
    }
  } catch {
    /* fall through */
  }
  return { intro: "I couldn't reach the assistant just now — try again in a moment.", cards: [], outro: "" };
}
