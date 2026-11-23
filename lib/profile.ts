"use client";

/**
 * Client-side profile identity. The chosen profile is stored in a plain
 * `pcc-profile` cookie (not httpOnly) so it's sent automatically with every
 * same-origin fetch to /api/state and /api/ask — that's how the server knows
 * whose rows to read/write. No passwords: this is a small, trusted shared app.
 */

export type Profile = "dj" | "aditi";

export const PROFILE_LABEL: Record<Profile, string> = {
  dj: "DJ",
  aditi: "Aditi",
};

export const PROFILE_INITIAL: Record<Profile, string> = {
  dj: "D",
  aditi: "A",
};

export function readProfileCookie(): Profile | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)pcc-profile=([^;]+)/);
  const v = m?.[1];
  return v === "dj" || v === "aditi" ? v : null;
}

export function writeProfileCookie(p: Profile) {
  // 1-year cookie, root path so it rides along on every request.
  document.cookie = `pcc-profile=${p}; path=/; max-age=31536000; samesite=lax`;
}

/** Current profile with a safe default (used for display before the gate runs). */
export function currentProfile(): Profile {
  return readProfileCookie() ?? "dj";
}

/** Send the user back to the profile picker (full reload clears in-memory data). */
export function switchProfile() {
  window.location.href = "/?switch=1";
}
