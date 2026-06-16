import { CSSProperties } from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
  /** "default" | "slip" for the neglected-items variant */
  variant?: "default" | "slip";
  onClick?: () => void;
}

const shadows = {
  default: "0 6px 24px rgba(120,105,70,0.05)",
  slip: "none",
};

export function Card({ children, className, style, variant = "default", onClick }: CardProps) {
  const isSlip = variant === "slip";
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        background: isSlip ? "var(--slip-bg)" : "var(--card)",
        border: `1px solid ${isSlip ? "var(--slip-border)" : "var(--line-2)"}`,
        borderRadius: 20,
        boxShadow: shadows[variant],
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
