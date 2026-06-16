import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the SERVICE ROLE key. This bypasses RLS, so
 * it must NEVER be imported into client code. It exists so the dev single-user
 * setup can read/write the user's rows without a real login session.
 *
 * Dev single-user (Option A): all data belongs to one auth user, resolved by a
 * fixed email. getDevUserId() finds-or-creates that user and caches the id.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

export const DEV_USER_EMAIL = "dev@command-center.local";

let admin: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient | null {
  if (!url || !serviceKey || serviceKey.startsWith("your-")) return null;
  if (!admin) {
    admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return admin;
}

let cachedUserId: string | null = null;

/**
 * Resolve the single dev user's id, creating the auth user on first run.
 * Returns null if Supabase isn't configured or the admin API is unreachable —
 * callers must treat null as "skip persistence" and fall back to local state.
 */
export async function getDevUserId(): Promise<string | null> {
  if (cachedUserId) return cachedUserId;
  const sb = getServiceClient();
  if (!sb) return null;

  try {
    // Look for an existing dev user first.
    const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users?.find((u) => u.email === DEV_USER_EMAIL);
    if (existing) {
      cachedUserId = existing.id;
      return cachedUserId;
    }

    // Otherwise create it (email pre-confirmed; no password needed for dev).
    const { data: created, error } = await sb.auth.admin.createUser({
      email: DEV_USER_EMAIL,
      email_confirm: true,
    });
    if (error || !created?.user) return null;
    cachedUserId = created.user.id;
    return cachedUserId;
  } catch {
    return null;
  }
}
