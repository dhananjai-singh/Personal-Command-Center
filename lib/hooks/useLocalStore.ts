"use client";

import { useState, useEffect } from "react";

/**
 * Tiny localStorage-backed state. Starts from `initial` on both server and
 * first client render (so there's no hydration mismatch), then hydrates from
 * localStorage in an effect and writes back on every change.
 *
 * Interim persistence for the single-device personal app — swap for Supabase
 * sync later without changing call sites much.
 */
export function useLocalStore<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) setValue(JSON.parse(raw) as T);
    } catch {
      /* ignore corrupt/unavailable storage */
    }
    setLoaded(true);
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore quota/unavailable storage */
    }
  }, [key, value, loaded]);

  return [value, setValue, loaded] as const;
}
