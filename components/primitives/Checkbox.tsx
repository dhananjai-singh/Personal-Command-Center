"use client";

interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  /** "round" = task (circle 22px), "square" = habit (rounded-rect 24px) */
  shape?: "round" | "square";
  size?: number;
}

export function Checkbox({ checked, onChange, shape = "round", size }: CheckboxProps) {
  const dim = size ?? (shape === "round" ? 22 : 24);
  const radius = shape === "round" ? "50%" : 8;
  const checkSize = shape === "round" ? 12 : 14;

  return (
    <button
      onClick={onChange}
      aria-checked={checked}
      role="checkbox"
      style={{
        width: dim,
        height: dim,
        borderRadius: radius,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: checked ? "var(--accent)" : "var(--card-hi)",
        border: checked ? "1px solid var(--accent)" : "1.5px solid var(--check-border)",
        padding: 0,
        cursor: "pointer",
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <svg
        width={checkSize}
        height={checkSize}
        viewBox="0 0 12 12"
        fill="none"
        style={{
          opacity: checked ? 1 : 0,
          transition: "opacity 0.1s",
        }}
      >
        <path
          d="M2 6l3 3 5-5"
          stroke="var(--on-accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
