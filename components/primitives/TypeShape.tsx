import type { ItemType } from "@/lib/domain/types";

interface TypeShapeProps {
  type: ItemType;
  /** color for the stroke — defaults to var(--ink-mute) */
  color?: string;
  size?: number;
}

/**
 * Outline shapes used to identify item types throughout the app:
 *   task     → ○  circle
 *   deadline → ◇  rotated square
 *   event    → ▢  rounded square
 */
export function TypeShape({ type, color = "var(--ink-mute)", size = 9 }: TypeShapeProps) {
  if (type === "deadline") {
    return (
      <span
        style={{
          width: size,
          height: size,
          border: `1.5px solid ${color}`,
          display: "block",
          flexShrink: 0,
          transform: "rotate(45deg)",
        }}
      />
    );
  }
  if (type === "event") {
    return (
      <span
        style={{
          width: size,
          height: size,
          border: `1.5px solid ${color}`,
          borderRadius: 2,
          display: "block",
          flexShrink: 0,
        }}
      />
    );
  }
  // task — circle
  return (
    <span
      style={{
        width: size,
        height: size,
        border: `1.5px solid ${color}`,
        borderRadius: "50%",
        display: "block",
        flexShrink: 0,
      }}
    />
  );
}
