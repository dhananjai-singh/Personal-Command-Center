import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the SERVICE ROLE key. This bypasses RLS, so
 * it must NEVER be imported into client code. It exists so the login-less
 * multi-profile setup can read/write each profile's rows without a real session.
 *
 * Profiles (no passwords — trusted shared app): each profile maps to one auth
 * user, resolved by a fixed email. getUserId(profile) finds-or-creates that user
 * and caches its id. DJ intentionally keeps the ORIGINAL dev email so all of his
 * existing data carries over unchanged; Aditi gets a fresh, separate user.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

export type Profile = "dj" | "aditi";

const PROFILE_EMAIL: Record<Profile, string> = {
  dj:    "dev@command-center.local",     // keep the original user → DJ's data persists
  aditi: "aditi@command-center.local",   // separate user → separate data
};

// Back-compat: some callers still import this constant.
export const DEV_USER_EMAIL = PROFILE_EMAIL.dj;

/** Coerce any untrusted string into a valid profile (defaults to DJ). */
export function normalizeProfile(v: string | null | undefined): Profile {
  return v === "aditi" ? "aditi" : "dj";
}

/** Read the `pcc-profile` cookie out of a request's Cookie header. */
export function profileFromCookie(cookieHeader: string | null): Profile {
  if (!cookieHeader) return "dj";
  const m = cookieHeader.match(/(?:^|;\s*)pcc-profile=([^;]+)/);
  return normalizeProfile(m?.[1]);
}

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

const cachedIds = new Map<Profile, string>();

/**
 * Resolve a profile's auth-user id, creating the user on first run. Returns null
 * if Supabase isn't configured or the admin API is unreachable — callers must
 * treat null as "skip persistence" and fall back to local state.
 */
export async function getUserId(profile: Profile): Promise<string | null> {
  const cached = cachedIds.get(profile);
  if (cached) return cached;

  const sb = getServiceClient();
  if (!sb) return null;

  const email = PROFILE_EMAIL[profile];
  try {
    // Look for an existing user for this profile first.
    const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users?.find((u) => u.email === email);
    if (existing) {
      cachedIds.set(profile, existing.id);
      return existing.id;
    }

    // Otherwise create it (email pre-confirmed; no password — trusted app).
    const { data: created, error } = await sb.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (error || !created?.user) return null;
    cachedIds.set(profile, created.user.id);
    return created.user.id;
  } catch {
    return null;
  }
}

/** Back-compat shim: the old single-user resolver, now the DJ profile. */
export function getDevUserId(): Promise<string | null> {
  return getUserId("dj");
}
