import { NextResponse } from "next/server";
import { getServiceClient, getDevUserId } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Per-user key/value store backing useSyncedStore. GET ?key=… returns the
 * value (or null); PUT { key, value } upserts it. All access is server-side via
 * the service role + the resolved dev user, so RLS-protected rows are reachable
 * without a login session. Degrades to null/no-op if Supabase isn't ready.
 */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

  const sb = getServiceClient();
  const uid = await getDevUserId();
  if (!sb || !uid) return NextResponse.json({ value: null });

  try {
    const { data } = await sb
      .from("app_state")
      .select("value")
      .eq("user_id", uid)
      .eq("key", key)
      .maybeSingle();
    return NextResponse.json({ value: data?.value ?? null });
  } catch {
    return NextResponse.json({ value: null });
  }
}

export async function PUT(req: Request) {
  let body: { key?: unknown; value?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const key = typeof body?.key === "string" ? body.key : "";
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

  const sb = getServiceClient();
  const uid = await getDevUserId();
  if (!sb || !uid) return NextResponse.json({ ok: false });

  try {
    const { error } = await sb
      .from("app_state")
      .upsert(
        { user_id: uid, key, value: body.value ?? null, updated_at: new Date().toISOString() },
        { onConflict: "user_id,key" },
      );
    return NextResponse.json({ ok: !error });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
