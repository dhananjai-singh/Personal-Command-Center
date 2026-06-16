import { NextResponse } from "next/server";
import { chat, parseJSON, isLLMConfigured } from "@/lib/openai/client";
import { analyseText } from "@/lib/services/nutrition/mock";
import type { MealDetection } from "@/lib/domain/types";

export const runtime = "nodejs";

// Static system prompt (first, for prefix-caching). Asks for the user-facing
// shape {meal_name, items:[{name, quantity, calories}], total_calories} plus the
// macros the UI needs to draw its breakdown.
const SYSTEM = `You are a nutrition vision assistant. Given a meal photo (or a text description), identify the foods, estimate portions, and estimate nutrition.

Return ONLY a JSON object:
{
  "meal_name": string,            // short name for the whole meal
  "confidence": number,           // 0-100, your confidence
  "items": [
    { "name": string,             // food item
      "quantity": string,         // estimated portion, e.g. "180g", "1 cup", "2 slices"
      "calories": number,         // kcal for that portion
      "protein": number,          // grams
      "carbs": number,            // grams
      "fat": number }             // grams
  ],
  "total_calories": number        // sum of item calories
}
Estimate sensibly when unsure; never return prose, only the JSON object.`;

interface VisionItem {
  name: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
interface VisionResult {
  meal_name: string;
  confidence: number;
  items: VisionItem[];
  total_calories: number;
}

function isVision(o: unknown): o is VisionResult {
  if (!o || typeof o !== "object") return false;
  const r = o as Record<string, unknown>;
  return typeof r.meal_name === "string" && Array.isArray(r.items);
}

/** Map the model's user-facing shape into the UI's MealDetection shape. */
function toDetection(v: VisionResult): MealDetection {
  const items = v.items.map((it) => ({
    name: String(it.name ?? "Item"),
    portion: String(it.quantity ?? "1 serving"),
    cal: Math.round(Number(it.calories) || 0),
    p: Math.round(Number(it.protein) || 0),
    c: Math.round(Number(it.carbs) || 0),
    f: Math.round(Number(it.fat) || 0),
  }));
  const total = v.total_calories
    ? Math.round(v.total_calories)
    : items.reduce((a, b) => a + b.cal, 0);
  return {
    name: v.meal_name || "Meal",
    conf: Math.max(0, Math.min(100, Math.round(v.confidence || 80))),
    items,
    total,
    p: items.reduce((a, b) => a + b.p, 0),
    c: items.reduce((a, b) => a + b.c, 0),
    f: items.reduce((a, b) => a + b.f, 0),
    time: "Now",
  };
}

export async function POST(req: Request) {
  let image = "";
  let text = "";
  try {
    const body = await req.json();
    image = typeof body?.image === "string" ? body.image : "";
    text = typeof body?.text === "string" ? body.text : "";
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!image && !text.trim()) {
    return NextResponse.json({ error: "No image or text" }, { status: 400 });
  }

  // Deterministic fallback for the text path; for photos there's no offline
  // analyser, so we surface a low-confidence estimate the user can edit.
  const fallback: MealDetection = text.trim()
    ? analyseText(text)
    : {
        name: "Meal",
        conf: 50,
        items: [{ name: "Estimated meal", portion: "1 serving", cal: 400, p: 20, c: 40, f: 15 }],
        total: 400,
        p: 20,
        c: 40,
        f: 15,
        time: "Now",
      };

  if (!isLLMConfigured()) {
    return NextResponse.json({ detection: fallback, source: "mock" });
  }

  try {
    const user = image
      ? [
          { type: "text" as const, text: text.trim() || "Identify this meal and estimate its nutrition." },
          { type: "image_url" as const, image_url: { url: image } },
        ]
      : `Meal description: "${text}"`;

    const out = await chat({
      system: SYSTEM,
      user,
      maxTokens: 700,
      temperature: 0.2,
      json: true,
    });
    const parsed = parseJSON<unknown>(out);
    if (isVision(parsed)) {
      return NextResponse.json({ detection: toDetection(parsed), source: "llm" });
    }
    return NextResponse.json({ detection: fallback, source: "mock-invalid" });
  } catch {
    return NextResponse.json({ detection: fallback, source: "mock-error" });
  }
}
