import type { Category } from "@/lib/domain/types";

const CAT_STYLES: Record<Category, { color: string; bg: string }> = {
  Studies:  { color: "var(--cat-studies)",  bg: "var(--cat-studies-bg)" },
  Work:     { color: "var(--cat-work)",     bg: "var(--cat-work-bg)" },
  Personal: { color: "var(--cat-personal)", bg: "var(--cat-personal-bg)" },
};

interface CategoryBadgeProps {
  category: Category;
  /** "pill" (default) = padded pill; "dot" = just an 8px dot */
  variant?: "pill" | "dot";
  size?: number;
}

export function CategoryBadge({ category, variant = "pill", size = 8 }: CategoryBadgeProps) {
  const { color, bg } = CAT_STYLES[category];

  if (variant === "dot") {
    return (
      <span
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: color,
          display: "block",
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 9px",
        borderRadius: 99,
        fontSize: 11.5,
        fontWeight: 700,
        color,
        background: bg,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: color,
          display: "block",
          flexShrink: 0,
        }}
      />
      {category}
    </span>
  );
}

/** Returns the CSS color / bg for a category — useful for inline styles */
export function catStyle(category: Category) {
  return CAT_STYLES[category];
}
