interface StreakChainProps {
  /** Boolean flags for last 7 days, index 0 = oldest */
  week: boolean[];
  dotSize?: number;
}

export function StreakChain({ week, dotSize = 9 }: StreakChainProps) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {week.map((active, i) => (
        <span
          key={i}
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: "50%",
            flexShrink: 0,
            display: "block",
            background: active ? "var(--accent)" : "var(--dot-track)",
          }}
        />
      ))}
    </span>
  );
}
