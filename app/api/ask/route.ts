import { NextResponse } from "next/server";
import { chat, parseJSON, isLLMConfigured } from "@/lib/openai/client";
import type { AiAnswer, AiCard } from "@/lib/services/ask-ai/mock";
import { fetchUserContext } from "@/lib/data/server";

export const runtime = "nodejs";

const GROUNDED_SYSTEM = `You are a warm, concise read-only assistant inside a personal planner. You are given the user's data — their tasks, habits/routines, meals, and weight log — as JSON, plus today's date.

Answer the user's message using ONLY that data. Never invent tasks, dates, numbers, or items that aren't in the data. If the data is empty or nothing matches, say so kindly and suggest what they could capture. If the user is just greeting or making small talk, reply warmly in one short line with an empty "cards" array.

Return ONLY a JSON object (no prose, no markdown fences):
{
  "intro": string,            // one short sentence answering or responding
  "cards": [                  // 0-6 items pulled from the data; [] if none apply
    { "title": string,
      "type": "task" | "deadline" | "event" | "project",
      "category": "Studies" | "Work" | "Personal",
      "sub": string,          // e.g. "Task · 5:00 PM", "Routine · 12-day streak"
      "meta": string,         // right-aligned label, e.g. "Today", "Tomorrow", "9 days"
      "metaSub": string,      // small line under meta
      "warn": boolean }       // true if overdue / at-risk
  ],
  "outro": string             // optional closing line, "" if not needed
}`;

const SORRY: AiAnswer = {
  intro: "I couldn't reach the assistant just now — try again in a moment.",
  cards: [],
  outro: "",
};

function isAnswer(o: unknown): o is AiAnswer {
  if (!o || typeof o !== "object") return false;
  const r = o as Record<string, unknown>;
  return typeof r.intro === "string" && Array.isArray(r.cards);
}

function sanitizeCards(cards: unknown[]): AiCard[] {
  const types = ["task", "deadline", "event", "project"];
  const cats = ["Studies", "Work", "Personal"];
  return cards
    .filter((c): c is Record<string, unknown> => Boolean(c) && typeof c === "object")
    .slice(0, 6)
    .map((c) => ({
      title: String(c.title ?? "Untitled"),
      type: (types.includes(c.type as string) ? c.type : "task") as AiCard["type"],
      category: (cats.includes(c.category as string) ? c.category : "Personal") as AiCard["category"],
      sub: String(c.sub ?? ""),
      meta: String(c.meta ?? ""),
      metaSub: String(c.metaSub ?? ""),
      warn: Boolean(c.warn),
    }));
}

export async function POST(req: Request) {
  let question = "";
  try {
    const body = await req.json();
    question = typeof body?.question === "string" ? body.question : "";
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!question.trim()) {
    return NextResponse.json({ error: "Empty question" }, { status: 400 });
  }

  if (!isLLMConfigured()) {
    return NextResponse.json({
      answer: { intro: "The AI assistant isn't set up yet.", cards: [], outro: "" },
    });
  }

  // Ground every answer in the user's real synced data (may be empty).
  const ctx = await fetchUserContext();
  const dataJson = JSON.stringify(ctx ?? { tasks: [], habits: [], meals: [], weights: [] });

  try {
    const today = new Date().toISOString();
    const text = await chat({
      system: GROUNDED_SYSTEM,
      user: `Today (ISO): ${today}\n\nUser data:\n${dataJson}\n\nUser message: ${question}`,
      maxTokens: 900,
      temperature: 0.3,
      json: true,
    });
    const parsed = parseJSON<unknown>(text);
    if (isAnswer(parsed)) {
      const p = parsed as AiAnswer & { cards: unknown[] };
      return NextResponse.json({
        answer: {
          intro: String(p.intro),
          cards: sanitizeCards(p.cards),
          outro: typeof p.outro === "string" ? p.outro : "",
        } satisfies AiAnswer,
      });
    }
    return NextResponse.json({ answer: SORRY });
  } catch {
    return NextResponse.json({ answer: SORRY });
  }
}
