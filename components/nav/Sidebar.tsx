"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { currentProfile, switchProfile, PROFILE_LABEL, PROFILE_INITIAL, type Profile } from "@/lib/profile";

const navItems = [
  { href: "/",        label: "Today",    dot: "var(--accent)" },
  { href: "/fitness", label: "Fitness",  dot: "var(--ink-dim)" },
  { href: "/notes",   label: "Notes",    dot: "var(--ink-dim)" },
  { href: "/ask",     label: "Ask AI",   dot: "var(--ink-dim)" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => { setProfile(currentProfile()); }, []);

  return (
    <aside
      style={{
        width: 236,
        flexShrink: 0,
        height: "100dvh",
        position: "sticky",
        top: 0,
        background: "var(--side)",
        borderRight: "1px solid var(--line)",
        padding: "28px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 30,
        overflowY: "auto",
      }}
    >
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            background: "var(--accent)",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 14.5,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
            lineHeight: 1.2,
          }}
        >
          Command<br />Center
        </span>
      </div>

      {/* Nav list */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 10,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: active ? 700 : 500,
                color: active ? "var(--accent)" : "var(--ink-soft)",
                background: active ? "var(--accent-soft)" : "transparent",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: active ? "var(--accent)" : "var(--ink-dim)",
                  flexShrink: 0,
                }}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Today's pace card */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--line-2)",
          borderRadius: 14,
          padding: "12px 14px",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          Today's pace
        </div>
        <div
          style={{
            marginTop: 6,
            height: 5,
            borderRadius: 99,
            background: "var(--track)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: 99,
              background: "var(--accent)",
              width: "40%",
            }}
          />
        </div>
        <div
          style={{
            marginTop: 5,
            fontSize: 11.5,
            fontWeight: 700,
            color: "var(--ink-mute)",
          }}
        >
          40%
        </div>
      </div>

      {/* User chip — tap to switch profile */}
      <button
        onClick={switchProfile}
        title="Switch profile"
        style={{
          display: "flex", alignItems: "center", gap: 10,
          width: "100%", textAlign: "left", cursor: "pointer",
          background: "transparent", border: "none", padding: 0, fontFamily: "inherit",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 99,
            background: "var(--avatar)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 800,
            color: "var(--avatar-ink)",
          }}
        >
          {profile ? PROFILE_INITIAL[profile] : ""}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
            {profile ? PROFILE_LABEL[profile] : ""}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-mute)", fontWeight: 600 }}>Switch profile</div>
        </div>
        <span style={{ fontSize: 14, color: "var(--ink-dim)", fontWeight: 700 }}>⇄</span>
      </button>
    </aside>
  );
}
