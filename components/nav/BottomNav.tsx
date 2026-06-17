"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    href: "/",
    label: "Today",
    icon: (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="5" width="16" height="15" rx="4" stroke="currentColor" strokeWidth="2" />
        <path d="M4 9.5h16" stroke="currentColor" strokeWidth="2" />
        <path d="M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/notes",
    label: "Notes",
    icon: (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
        <rect x="5" y="4" width="14" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
        <path d="M8.5 9h7M8.5 13h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/fitness",
    label: "Fitness",
    icon: (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    href: "/ask",
    label: "Ask",
    icon: (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 6h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-7l-4 3v-3H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 46,
        // Total height = 64px + safe area. Every composer/dock is pinned at
        // `bottom: calc(64px + safe-area)`, so this makes the nav sit flush
        // beneath them with no gap for content to peek through.
        height: "calc(64px + env(safe-area-inset-bottom))",
        boxSizing: "border-box",
        background: "var(--card)",
        borderTop: "1px solid var(--line-2)",
        padding: "0 14px",
        paddingBottom: "env(safe-area-inset-bottom)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
      }}
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              textDecoration: "none",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              color: active ? "var(--accent)" : "var(--ink-mute)",
            }}
          >
            {tab.icon}
            <span
              style={{
                fontSize: 10.5,
                fontWeight: active ? 800 : 700,
                lineHeight: 1,
              }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
