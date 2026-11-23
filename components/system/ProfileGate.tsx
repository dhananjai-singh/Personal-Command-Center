"use client";

import { useEffect, useState } from "react";
import {
  type Profile,
  PROFILE_LABEL,
  PROFILE_INITIAL,
  readProfileCookie,
  writeProfileCookie,
} from "@/lib/profile";

/**
 * Gates the whole app behind a lightweight "who are you?" picker so DJ and Aditi
 * each get their own cloud data (keyed by the pcc-profile cookie). No passwords —
 * trusted shared app. Supports two URL shortcuts:
 *   /?u=aditi   → auto-selects that profile (so DJ can send Aditi a direct link)
 *   /?switch=1  → forces the picker back up to switch profiles
 */
const ORDER: Profile[] = ["dj", "aditi"];

export function ProfileGate({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const u = url.searchParams.get("u");
    const wantSwitch = url.searchParams.get("switch");

    const cleanUrl = () => {
      url.searchParams.delete("u");
      url.searchParams.delete("switch");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    };

    if (u === "dj" || u === "aditi") {
      writeProfileCookie(u);
      cleanUrl();
      setProfile(u);
    } else if (wantSwitch) {
      cleanUrl();
      setProfile(null); // show picker
    } else {
      setProfile(readProfileCookie());
    }
    setReady(true);
  }, []);

  const choose = (p: Profile) => {
    writeProfileCookie(p);
    // No reload needed: children mount for the first time *after* this, so their
    // synced stores fetch with the cookie already set.
    setProfile(p);
  };

  if (!ready) return <Splash />;
  if (!profile) return <Picker onPick={choose} />;
  return <>{children}</>;
}

// ── Neutral splash (prevents a flash before the cookie is read) ─────────────────
function Splash() {
  return (
    <div style={{
      minHeight: "100dvh", background: "var(--bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--accent)", opacity: 0.5 }} />
    </div>
  );
}

// ── Profile picker ──────────────────────────────────────────────────────────────
function Picker({ onPick }: { onPick: (p: Profile) => void }) {
  return (
    <div style={{
      minHeight: "100dvh", background: "var(--bg)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "24px 22px", textAlign: "center",
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 13, background: "var(--accent)", marginBottom: 22 }} />

      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--ink)" }}>
        Who&apos;s using Command Center?
      </h1>
      <p style={{ margin: "9px 0 0", fontSize: 14, color: "var(--ink-mute)", fontWeight: 600, maxWidth: 320 }}>
        Pick your profile — each person&apos;s tasks, meals and notes stay completely separate.
      </p>

      <div style={{
        marginTop: 30, width: "100%", maxWidth: 380,
        display: "flex", flexDirection: "column", gap: 12,
      }}>
        {ORDER.map((p) => (
          <button
            key={p}
            onClick={() => onPick(p)}
            style={{
              display: "flex", alignItems: "center", gap: 15,
              width: "100%", textAlign: "left",
              background: "var(--card)", border: "1px solid var(--line-2)",
              borderRadius: 18, padding: "16px 18px", cursor: "pointer",
              boxShadow: "var(--card-shadow)", fontFamily: "inherit",
            }}
          >
            <div style={{
              width: 46, height: 46, borderRadius: 99, flexShrink: 0,
              background: "var(--accent-soft)", color: "var(--accent-ink)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 19, fontWeight: 800,
            }}>
              {PROFILE_INITIAL[p]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.01em" }}>
                {PROFILE_LABEL[p]}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-mute)", fontWeight: 600, marginTop: 1 }}>
                Open my Command Center
              </div>
            </div>
            <span style={{ fontSize: 20, color: "var(--ink-dim)", fontWeight: 700 }}>›</span>
          </button>
        ))}
      </div>

      <p style={{ margin: "24px 0 0", fontSize: 12, color: "var(--ink-faint)", fontWeight: 600 }}>
        You can switch profiles anytime.
      </p>
    </div>
  );
}
