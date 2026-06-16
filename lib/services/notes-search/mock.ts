/**
 * Mock notes search — faithful port of runAi() from Notes.dc.html.
 *
 * Strips stop-words, scores each note by keyword hit count,
 * sorts highest-first, returns a human answer + ordered match IDs.
 *
 * Replace with a real vector-retrieval / LLM search service.
 */

import type { NoteSearchResult } from "@/lib/domain/types";

const STOP = new Set([
  "the","one","note","notes","about","find","show","what","which","where",
  "that","with","have","for","my","me","an","on","to","of","do","i",
]);

interface SearchableNote {
  id: string;
  title: string | null;
  body: string;
  tag: string | null;
}

export function searchNotes(query: string, notes: SearchableNote[]): NoteSearchResult {
  const q = query.trim();
  if (!q) return { answer: "", matchIds: [] };

  const words = q
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));

  const terms = words.length ? words : [q.toLowerCase()];

  const scored = notes
    .map((n) => {
      const hay = ((n.title ?? "") + " " + n.body + " " + (n.tag ?? "")).toLowerCase();
      let score = 0;
      terms.forEach((w) => { if (hay.includes(w)) score += 1; });
      return { n, score };
    })
    .filter((o) => o.score > 0)
    .sort((a, b) => b.score - a.score);

  const matchIds = scored.map((o) => o.n.id);

  let answer: string;
  if (matchIds.length) {
    const top = scored[0].n;
    const label = top.title
      ? top.title
      : top.body.length > 40
      ? top.body.slice(0, 40) + "…"
      : top.body;
    answer = `Found ${matchIds.length} note${matchIds.length > 1 ? "s" : ""} — top match: “${label}”.`;
  } else {
    answer = `No notes matched “${q}”. Try different words.`;
  }

  return { answer, matchIds };
}
