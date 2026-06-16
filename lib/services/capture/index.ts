import type { ParsedItem } from "@/lib/domain/types";
import { parse } from "./mock";

/** Deterministic local parser — used as instant fallback and for tests. */
export { parse };
export type { ParsedItem };

/**
 * Real capture parse: POSTs to the LLM-backed /api/capture route, which itself
 * falls back to the mock server-side if the provider isn't configured. If the
 * network call fails entirely, we fall back to the local mock here too, so the
 * UI never breaks.
 */
export async function parseCapture(raw: string): Promise<ParsedItem> {
  try {
    const res = await fetch("/api/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: raw }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.item) return data.item as ParsedItem;
    }
  } catch {
    /* fall through to local mock */
  }
  return parse(raw);
}
