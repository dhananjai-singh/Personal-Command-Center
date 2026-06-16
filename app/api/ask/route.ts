import { NextResponse } from "next/server";
import { chat, parseJSON, isLLMConfigured } from "@/lib/openai/client";
import { ANSWERS, pickKey } from "@/lib/services/ask-ai/mock";
import type { AiKey, AiAnswer, AiCard } from "@/lib/services/ask-ai/mock";
import { fetchUserContext, hasData } from "@/lib/data/server";

export const runtime = "nodejs";

const KEYS: AiKey[] = ["slipping", "thursday", "studies3", "streaks"];

// Router prompt — used when we have no real data, just to pick a canned answer.
const ROUTER_SYSTEM = `You route a question for a personal-planner assistant. Reply with ONLY one word:
- slipping  — tasks/projects going neglected or falling behind
- thursday  — what's scheduled on Thursday
- studies3  — studies items due within ~3 days
- streaks   — habit/routine streak status
If nothing fits, reply: slipping`;

// Grounded prompt — used when we DO have the user's real rows.
const GROUNDED_SYSTEM = `You are a read-only assistant for a personal planner. You are given the user's tasks, habits, projects, and notes as JSON, plus today's date. Answer the user's question using ONLY that data — never invent items. Be warm and concise.

Return ONLY a JSON object with these keys:
- "intro": string — one short sentence framing the answer.
- "cards": array (max 6) of the relevant items, each:
    { "title": string,
      "type": "task" | "deadline" | "event" | "project",
      "category": "Studies" | "Work" | "Personal",
      "sub": string,      // e.g. "Task · unscheduled", "Event · recurring"
      "meta": string,     // right-aligned headline, e.g. "Today", "9 days", "1:30 PM"
      "metaSub": string,  // small line under meta, e.g. "no activity", "Thu"
      "warn": boolean }   // true if overdue / at-risk / slipping
- "outro": string — one closing sentence with a useful observation.
If nothing matches, return an empty cards array and say so kindly in intro.`;

function isAnswer(o: unknown): o is AiAnswer {
  if (!o || typeof o !== "object") return false;
  const r = o as Record<string, unknown>;
  return typeof r.intro === "string" && Array.isArray(r.cards) && typeof r.outro === "string";
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

  // Default: local keyword router + canned answer (zero-config fallback).
  let key: AiKey = pickKey(question);
  let answer: AiAnswer = ANSWERS[key];
  let source = "mock";

  if (!isLLMConfigured()) {
    return NextResponse.json({ key, answer, source });
  }

  // If we have the user's real data, answer over it for real.
  const ctx = await fetchUserContext();
  if (hasData(ctx)) {
    try {
      const today = new Date().toISOString();
      const text = await chat({
        system: GROUNDED_SYSTEM,
        user: `Today (ISO): ${today}\n\nUser data:\n${JSON.stringify(ctx)}\n\nQuestion: ${question}`,
        maxTokens: 900,
        temperature: 0.2,
        json: true,
      });
      const parsed = parseJSON<unknown>(text);
      if (isAnswer(parsed)) {
        answer = {
          intro: parsed.intro,
          cards: sanitizeCards(parsed.cards as unknown[]),
          outro: parsed.outro,
        };
        return NextResponse.json({ key, answer, source: "llm-grounded" });
      }
    } catch {
      // fall through to canned routing below
    }
  }

  // No data (or grounding failed): use the model just to pick the best canned answer.
  try {
    const routed = (await chat({ system: ROUTER_SYSTEM, user: question, maxTokens: 8, temperature: 0 }))
      .toLowerCase()
      .trim();
    const matched = KEYS.find((k) => routed.includes(k));
    if (matched) {
      key = matched;
      answer = ANSWERS[key];
      source = "llm-router";
    }
  } catch {
    source = "mock-error";
  }

  return NextResponse.json({ key, answer, source });
}
