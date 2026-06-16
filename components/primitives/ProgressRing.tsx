interface ProgressRingProps {
  /** Value 0–1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  /** Center label line 1 (large number) */
  label: string;
  /** Center label line 2 (unit / caption) */
  sublabel?: string;
}

export function ProgressRing({
  progress,
  size = 92,
  strokeWidth = 8,
  label,
  sublabel,
}: ProgressRingProps) {
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(1, Math.max(0, progress)));

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--track)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>

      {/* Center text */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: size > 80 ? 17 : 13,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1,
            color: "var(--ink)",
          }}
        >
          {label}
        </span>
        {sublabel && (
          <span
            style={{
              fontSize: size > 80 ? 10 : 8.5,
              fontWeight: 700,
              color: "var(--ink-mute)",
              marginTop: 2,
            }}
          >
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
