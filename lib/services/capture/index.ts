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
    // Send the user's LOCAL wall-clock time + timezone so the model resolves
    // "tomorrow at 2pm" in the user's frame and returns a local (non-UTC) time.
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const now = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
    let tz = "";
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* ignore */ }

    const res = await fetch("/api/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: raw, now, tz }),
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
