import { NextResponse } from "next/server";
import { chat, isLLMConfigured, MODEL } from "@/lib/openai/client";
import { getDevUserId } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Connection diagnostics. Visit /api/health for a config snapshot (no secrets,
 * just which vars are present), or /api/health?ping=1 to do a tiny live OpenAI
 * call + a Supabase round-trip and surface the real error if either fails.
 */
export async function GET(req: Request) {
  const ping = new URL(req.url).searchParams.get("ping") === "1";

  const env = {
    openai_key: Boolean(process.env.OPENAI_API_KEY),
    openai_base_url: process.env.OPENAI_BASE_URL || null,
    supabase_url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabase_anon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabase_service_role: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };

  const result: Record<string, unknown> = {
    model: MODEL,
    llm_configured: isLLMConfigured(),
    env,
  };

  if (!ping) {
    result.hint = "Add ?ping=1 to run a live OpenAI + Supabase test.";
    return NextResponse.json(result);
  }

  // Live OpenAI check.
  try {
    const reply = await chat({
      system: "Reply with exactly the word: ok",
      user: "ping",
      maxTokens: 5,
      temperature: 0,
    });
    result.openai = { ok: true, reply };
  } catch (e) {
    result.openai = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  // Live Supabase check (resolves/creates the dev user via service role).
  try {
    const uid = await getDevUserId();
    result.supabase = { ok: Boolean(uid), dev_user: uid ? "resolved" : "null" };
  } catch (e) {
    result.supabase = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  return NextResponse.json(result);
}
