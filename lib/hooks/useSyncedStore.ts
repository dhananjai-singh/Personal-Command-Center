"use client";

import { useState, useEffect } from "react";

/**
 * Cloud-synced state (no local persistence). Loads the value for `key` from
 * /api/state on mount, and writes changes back (debounced). The server route
 * reads/writes the `app_state` table via the service role + dev user, so the
 * same data is available on every device.
 *
 * Drop-in replacement for the old localStorage hook — same [value, set, loaded]
 * signature. While the initial fetch is in flight, `loaded` is false.
 */
export function useSyncedStore<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  // Load from the server once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/state?key=${encodeURIComponent(key)}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data?.value != null) setValue(data.value as T);
        }
      } catch {
        /* offline / not configured — keep initial */
      }
      if (!cancelled) setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [key]);

  // Persist changes back to the server (debounced), but not before first load.
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      }).catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [key, value, loaded]);

  return [value, setValue, loaded] as const;
}
