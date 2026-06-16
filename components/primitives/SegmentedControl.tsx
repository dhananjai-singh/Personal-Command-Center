"use client";

import type { Category } from "@/lib/domain/types";
import { catStyle } from "./CategoryBadge";

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** "accent" uses the accent color for active; "category" uses the category palette */
  variant?: "accent" | "category";
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  variant = "accent",
}: SegmentedControlProps<T>) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map((opt) => {
        const active = opt.value === value;
        let bg = "var(--card)";
        let color = "var(--ink-soft)";
        let border = "1px solid var(--line-2)";

        if (active) {
          if (variant === "category") {
            const cs = catStyle(opt.value as unknown as Category);
            bg = cs.bg;
            color = cs.color;
            border = `1.5px solid ${cs.color}`;
          } else {
            bg = "var(--accent-soft)";
            color = "var(--accent-ink)";
            border = "1.5px solid var(--accent-soft-2)";
          }
        }

        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: variant === "category" ? 6 : 0,
              padding: "8px 14px",
              borderRadius: 99,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              background: bg,
              color,
              border,
              transition: "background 0.15s, color 0.15s, border-color 0.15s",
            }}
          >
            {variant === "category" && (
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: active
                    ? catStyle(opt.value as unknown as Category).color
                    : "var(--ink-dim)",
                  display: "block",
                  flexShrink: 0,
                }}
              />
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
