"use client";

import { useState, useRef, useEffect } from "react";

interface CaptureBarProps {
  /** "desktop" = 16px radius, 44px mic button, helper text
   *  "mobile"  = 22px radius, 54px mic button, dominant */
  variant?: "desktop" | "mobile";
  /** Called with the raw text when user submits */
  onSubmit: (text: string) => void;
  /** Whether the bar is in parsing/loading state */
  parsing?: boolean;
}

const MicIcon = ({ size }: { size: number }) => (
  <svg width={size} height={Math.round(size * 1.27)} viewBox="0 0 22 28" fill="none">
    <rect x="6" y="1.5" width="10" height="16" rx="5" fill="var(--on-accent-2)" />
    <path
      d="M2.5 12.5a8.5 8.5 0 0 0 17 0"
      stroke="var(--on-accent-2)"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path d="M11 21v5" stroke="var(--on-accent-2)" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

const ArrowIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path
      d="M10 16V4M10 4l-5 5M10 4l5 5"
      stroke="var(--on-accent-2)"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function CaptureBar({ variant = "desktop", onSubmit, parsing = false }: CaptureBarProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = variant === "mobile";

  const btnSize = isMobile ? 54 : 44;
  const btnRadius = isMobile ? 17 : 12;
  const barRadius = isMobile ? 22 : 16;
  const hasText = text.trim().length > 0;

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || parsing) return;
    onSubmit(trimmed);
    setText("");
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  // Mic via browser speech-to-text (Web Speech API)
  const handleMic = () => {
    type AnyWindow = Window & {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        onresult: (e: { results: { [i: number]: { [i: number]: { transcript: string } } } }) => void;
        start: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        onresult: (e: { results: { [i: number]: { [i: number]: { transcript: string } } } }) => void;
        start: () => void;
      };
    };
    const w = window as AnyWindow;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setText(transcript);
      inputRef.current?.focus();
    };
    rec.start();
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "var(--card)",
          border: `1.5px solid ${parsing ? "var(--accent)" : isMobile ? "var(--accent-soft-2)" : "var(--line-3)"}`,
          borderRadius: barRadius,
          padding: isMobile ? "9px 9px 9px 18px" : "13px 14px 13px 20px",
          boxShadow: isMobile
            ? "0 10px 30px rgba(80,65,40,0.14), 0 2px 8px rgba(80,65,40,0.06)"
            : "0 4px 18px rgba(120,105,70,0.06)",
          transition: "border-color 0.25s",
        }}
      >
        {/* Aqua dot — desktop only */}
        {!isMobile && (
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: "var(--accent)",
              flexShrink: 0,
            }}
          />
        )}

        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder={
            isMobile
              ? "Add a task, deadline or event…"
              : 'Add anything — "submit assignment by 10pm tomorrow"'
          }
          disabled={parsing}
          style={{
            flex: 1,
            minWidth: 0,
            border: "none",
            outline: "none",
            background: "transparent",
            fontFamily: "inherit",
            fontSize: isMobile ? 16 : 15,
            fontWeight: 500,
            color: "var(--ink)",
          }}
        />

        {/* Helper text — desktop only */}
        {!isMobile && (
          <span
            style={{
              fontSize: 12.5,
              color: "var(--ink-dim)",
              fontWeight: 600,
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            parses to a task, deadline or event
          </span>
        )}

        {/* Send / Mic button */}
        <button
          onClick={hasText ? handleSubmit : handleMic}
          style={{
            width: btnSize,
            height: btnSize,
            border: "none",
            borderRadius: btnRadius,
            background: "var(--accent)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            flexShrink: 0,
            boxShadow: "0 4px 14px rgba(23,166,179,0.35)",
          }}
          aria-label={hasText ? "Send" : "Voice input"}
        >
          {/* Mic — shown when no text */}
          <span
            style={{
              position: "absolute",
              transition: "opacity 0.2s, transform 0.2s",
              opacity: hasText ? 0 : 1,
              transform: hasText ? "scale(0.6)" : "scale(1)",
            }}
          >
            <MicIcon size={isMobile ? 22 : 18} />
          </span>

          {/* Up-arrow — shown when there's text */}
          <span
            style={{
              position: "absolute",
              transition: "opacity 0.2s, transform 0.2s",
              opacity: hasText ? 1 : 0,
              transform: hasText ? "scale(1)" : "scale(0.6)",
            }}
          >
            <ArrowIcon />
          </span>
        </button>
      </div>

      {/* Parsing readout */}
      {parsing && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 8,
            paddingLeft: isMobile ? 18 : 20,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {[0, 0.2, 0.4].map((delay, i) => (
              <span
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  display: "block",
                  animation: `pulse 1s ease-in-out ${delay}s infinite`,
                }}
              />
            ))}
          </span>
          <span
            style={{
              fontSize: 12.5,
              color: "var(--accent-ink)",
              fontWeight: 700,
            }}
          >
            Parsing your words…
          </span>
        </div>
      )}

      {/* Mobile caption */}
      {isMobile && !parsing && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            marginTop: 9,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--accent)",
              display: "block",
            }}
          />
          <span
            style={{
              fontSize: 12,
              color: "var(--ink-mute)",
              fontWeight: 600,
            }}
          >
            Speak or type — it files itself, no confirm
          </span>
        </div>
      )}
    </div>
  );
}
