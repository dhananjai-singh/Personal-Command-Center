import { NextResponse } from "next/server";
import { saveMeal } from "@/lib/data/server";

export const runtime = "nodejs";

/** Persist a logged meal for the dev user. Best-effort: returns id or null. */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const name = typeof body?.name === "string" ? body.name : "";
  if (!name.trim()) {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }

  const id = await saveMeal({
    name,
    cal: Number(body.cal) || 0,
    protein: Number(body.protein) || 0,
    carbs: Number(body.carbs) || 0,
    fat: Number(body.fat) || 0,
  });

  return NextResponse.json({ id });
}
