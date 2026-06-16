import { NextResponse } from "next/server";
import { chat, parseJSON, isLLMConfigured } from "@/lib/openai/client";
import { parse as mockParse } from "@/lib/services/capture/mock";
import { saveTask } from "@/lib/data/server";
import type { ParsedItem } from "@/lib/domain/types";

export const runtime = "nodejs";

// Static system prompt (placed first so the provider can prefix-cache it).
const SYSTEM = `You turn a single line of natural-language capture into one structured task for a personal planner.

Return ONLY a JSON object (no prose, no markdown fences) with exactly these keys:
- "title": string — clean, capitalised, with date/time words removed.
- "type": "task" | "deadline" | "event"
    deadline = something to submit/turn in by a point in time.
    event    = something scheduled at a time (meeting, test, lecture, call, appointment).
    task     = a plain to-do.
- "category": "Studies" | "Work" | "Personal"
- "due": string | null — short human label like "Tomorrow · 10:00 PM", "Thursday · All day", "Today · 3:00 PM", or null.
- "due_datetime": string | null — ISO 8601 timestamp resolved against the provided current date, or null.
- "recurrence": "daily" | "weekly" | null — only if the capture clearly repeats.
- "project_id": null — always null (the user assigns projects later).`;

interface LLMItem extends ParsedItem {
  recurrence: "daily" | "weekly" | null;
  project_id: string | null;
}

function isValid(o: unknown): o is LLMItem {
  if (!o || typeof o !== "object") return false;
  const r = o as Record<string, unknown>;
  return (
    typeof r.title === "string" &&
    (r.type === "task" || r.type === "deadline" || r.type === "event") &&
    (r.category === "Studies" || r.category === "Work" || r.category === "Personal")
  );
}

export async function POST(req: Request) {
  let raw = "";
  try {
    const body = await req.json();
    raw = typeof body?.text === "string" ? body.text : "";
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!raw.trim()) {
    return NextResponse.json({ error: "Empty capture" }, { status: 400 });
  }

  // Deterministic fallback — also used when the provider isn't configured.
  const fallback = mockParse(raw);

  let item: ParsedItem = fallback;
  let extra: { recurrence: string | null; project_id: string | null } = {
    recurrence: null,
    project_id: null,
  };
  let source = "mock";

  if (isLLMConfigured()) {
    try {
      const today = new Date().toISOString();
      const text = await chat({
        system: SYSTEM,
        user: `Current date (ISO): ${today}\nCapture: "${raw}"`,
        maxTokens: 400,
        temperature: 0,
        json: true,
      });
      const parsed = parseJSON<unknown>(text);
      if (isValid(parsed)) {
        item = {
          title: parsed.title || fallback.title,
          type: parsed.type,
          category: parsed.category,
          due: parsed.due ?? null,
          due_datetime: parsed.due_datetime ?? null,
        };
        extra = {
          recurrence: parsed.recurrence ?? null,
          project_id: parsed.project_id ?? null,
        };
        source = "llm";
      }
    } catch {
      source = "mock-error";
    }
  }

  // Persist (best-effort; null id just means Supabase isn't wired yet).
  const id = await saveTask({ ...item, ...extra });

  return NextResponse.json({ item, id, source });
}
