"use client";

import { useEffect, useRef } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function BottomSheet({ open, onClose, title, subtitle, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Trap focus inside sheet when open
  useEffect(() => {
    if (open) sheetRef.current?.focus();
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 70,
          background: "rgba(45,42,36,0.4)",
          animation: "fadeIn 0.25s ease-out",
        }}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 71,
          background: "var(--card)",
          borderRadius: "28px 28px 0 0",
          padding: "14px 20px calc(env(safe-area-inset-bottom) + 32px)",
          boxShadow: "0 -10px 40px rgba(0,0,0,0.18)",
          animation: "sheetUp 0.33s cubic-bezier(.2,.8,.2,1)",
          outline: "none",
          maxHeight: "90dvh",
          overflowY: "auto",
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: 40,
            height: 5,
            borderRadius: 99,
            background: "var(--check-border)",
            margin: "0 auto 16px",
          }}
        />

        {/* Header */}
        {(title || subtitle) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            {title && (
              <h3
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: "var(--ink)",
                }}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <span
                style={{
                  fontSize: 12.5,
                  color: "var(--ink-mute)",
                  fontWeight: 600,
                }}
              >
                {subtitle}
              </span>
            )}
          </div>
        )}

        {children}
      </div>
    </>
  );
}
