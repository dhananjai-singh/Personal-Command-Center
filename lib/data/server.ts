import "server-only";
import { getServiceClient, getDevUserId } from "@/lib/supabase/admin";

/**
 * Read-only access to the user's synced data for Ask-AI grounding. Reads the
 * same `app_state` key/value rows the UI writes via useSyncedStore, so the
 * assistant reasons over exactly what the user sees. Degrades to null on any
 * failure so the Ask route falls back to canned answers.
 */

export interface UserContext {
  tasks: unknown[];
  habits: unknown[];
  meals: unknown[];
  weights: unknown[];
}

const KEYS = ["pcc-tasks", "pcc-habits", "pcc-meals", "pcc-weights"];

export async function fetchUserContext(): Promise<UserContext | null> {
  const sb = getServiceClient();
  const uid = await getDevUserId();
  if (!sb || !uid) return null;

  try {
    const { data } = await sb
      .from("app_state")
      .select("key,value")
      .eq("user_id", uid)
      .in("key", KEYS);

    const map = new Map((data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
    const arr = (k: string) => {
      const v = map.get(k);
      return Array.isArray(v) ? v : [];
    };

    return {
      tasks: arr("pcc-tasks"),
      habits: arr("pcc-habits"),
      meals: arr("pcc-meals"),
      weights: arr("pcc-weights"),
    };
  } catch {
    return null;
  }
}

export function hasData(ctx: UserContext | null): ctx is UserContext {
  return Boolean(
    ctx && (ctx.tasks.length || ctx.habits.length || ctx.meals.length || ctx.weights.length),
  );
}
