"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ANSWERS, SUGGESTION_DEFS, askAi } from "@/lib/services/ask-ai";
import type { AiKey, AiCard, AiAnswer } from "@/lib/services/ask-ai";
import { ThemeSwitcher } from "@/components/nav/ThemeSwitcher";

// ── types ─────────────────────────────────────────────────────────────────────
interface UserMessage { id: number; role: "user"; text: string }
interface AiMessage   { id: number; role: "ai";   key: AiKey; answer?: AiAnswer }
type Message = UserMessage | AiMessage;

const CAT_COLORS = {
  Studies:  { c: "var(--cat-studies)",  bg: "var(--cat-studies-bg)" },
  Work:     { c: "var(--cat-work)",     bg: "var(--cat-work-bg)" },
  Personal: { c: "var(--cat-personal)", bg: "var(--cat-personal-bg)" },
} as const;

// ── TypeMark icon ─────────────────────────────────────────────────────────────
function TypeMark({ type, color }: { type: AiCard["type"]; color: string }) {
  const base: React.CSSProperties = { display: "block", border: `2px solid ${color}` };
  if (type === "deadline") return <span style={{ ...base, width: 11, height: 11, transform: "rotate(45deg)" }} />;
  if (type === "event")    return <span style={{ ...base, width: 12, height: 12, borderRadius: 3 }} />;
  if (type === "project")  return <span style={{ ...base, width: 12, height: 12, borderRadius: 4 }} />;
  return                          <span style={{ ...base, width: 12, height: 12, borderRadius: "50%" }} />;
}

// ── Result cards ──────────────────────────────────────────────────────────────
function ResultCardMobile({ card }: { card: AiCard }) {
  const cv = CAT_COLORS[card.category];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 11,
      background: "var(--card)", border: "1px solid var(--line-2)",
      borderRadius: 13, padding: "11px 13px",
      boxShadow: "0 3px 12px rgba(120,105,70,0.05)",
    }}>
      <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: cv.bg }}>
        <TypeMark type={card.type} color={cv.c} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.title}</div>
        <div style={{ fontSize: 11.5, color: "var(--ink-mute)", fontWeight: 600, marginTop: 1 }}>{card.sub}</div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", letterSpacing: "-0.01em", color: card.warn ? "var(--cat-work)" : "var(--ink-2)" }}>{card.meta}</div>
        <div style={{ fontSize: 11, color: "var(--ink-dim)", fontWeight: 600 }}>{card.metaSub}</div>
      </div>
    </div>
  );
}

function ResultCardDesktop({ card }: { card: AiCard }) {
  const cv = CAT_COLORS[card.category];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      background: "var(--card)", border: "1px solid var(--line-2)",
      borderRadius: 14, padding: "13px 16px", boxShadow: "var(--card-shadow)",
    }}>
      <div style={{ width: 34, height: 34, borderRadius: 11, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: cv.bg }}>
        <TypeMark type={card.type} color={cv.c} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: "-0.01em" }}>{card.title}</div>
        <div style={{ fontSize: 12.5, color: "var(--ink-mute)", fontWeight: 600, marginTop: 2 }}>{card.sub}</div>
      </div>
      <span style={{ fontSize: 11.5, fontWeight: 700, borderRadius: 99, padding: "4px 10px", whiteSpace: "nowrap", flexShrink: 0, background: cv.bg, color: cv.c }}>
        {card.category}
      </span>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", color: card.warn ? "var(--cat-work)" : "var(--ink-2)" }}>{card.meta}</div>
        <div style={{ fontSize: 11.5, color: "var(--ink-dim)", fontWeight: 600, marginTop: 1 }}>{card.metaSub}</div>
      </div>
    </div>
  );
}

// ── Typing dots ───────────────────────────────────────────────────────────────
function TypingDots({ size }: { size: "sm" | "md" }) {
  const av = size === "sm" ? 27 : 30;
  const dot = size === "sm" ? 9 : 10;
  const r = size === "sm" ? 13 : 14;
  const p = size === "sm" ? "13px 15px" : "14px 16px";
  return (
    <div style={{ display: "flex", gap: size === "sm" ? 10 : 13, alignItems: "center" }}>
      <div style={{ width: av, height: av, borderRadius: 9, flexShrink: 0, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ width: dot, height: dot, borderRadius: "50%", border: "2px solid var(--on-accent)" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: r, padding: p }}>
        {[0, 0.2, 0.4].map((d) => (
          <span key={d} style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", animation: `blink 1s ${d}s infinite` }} />
        ))}
      </div>
    </div>
  );
}

// ── Thread messages ───────────────────────────────────────────────────────────
function ThreadMessages({ messages, typing, variant }: { messages: Message[]; typing: boolean; variant: "mobile" | "desktop" }) {
  const sm = variant === "mobile";
  return (
    <>
      {messages.map((m) => {
        if (m.role === "user") {
          return (
            <div key={m.id} style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{
                maxWidth: sm ? "82%" : "78%",
                background: "var(--accent-soft)",
                color: "var(--accent-ink)",
                fontSize: sm ? 14.5 : 15,
                fontWeight: 600, lineHeight: sm ? 1.45 : 1.5,
                padding: sm ? "11px 15px" : "12px 17px",
                borderRadius: sm ? "17px 17px 4px 17px" : "18px 18px 5px 18px",
              }}>
                {m.text}
              </div>
            </div>
          );
        }
        const a = m.answer ?? ANSWERS[m.key];
        const av = sm ? 27 : 30;
        const dot = sm ? 9 : 10;
        return (
          <div key={m.id} style={{ display: "flex", gap: sm ? 10 : 13, alignItems: "flex-start" }}>
            <div style={{ width: av, height: av, borderRadius: 9, flexShrink: 0, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", marginTop: sm ? 1 : 2 }}>
              <span style={{ width: dot, height: dot, borderRadius: "50%", border: "2px solid var(--on-accent)" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: sm ? 14.5 : 15, lineHeight: sm ? 1.5 : 1.55, color: "var(--ink-2)", fontWeight: 500 }}>{a.intro}</div>
              <div style={{ marginTop: sm ? 11 : 14, display: "flex", flexDirection: "column", gap: sm ? 8 : 10 }}>
                {a.cards.map((c, i) =>
                  sm ? <ResultCardMobile key={i} card={c} /> : <ResultCardDesktop key={i} card={c} />
                )}
              </div>
              <div style={{ marginTop: sm ? 11 : 14, fontSize: sm ? 13.5 : 14, lineHeight: 1.55, color: "var(--ink-soft)", fontWeight: 500 }}>
                {a.outro}
              </div>
            </div>
          </div>
        );
      })}
      {typing && <TypingDots size={sm ? "sm" : "md"} />}
    </>
  );
}

// ── Shared hook ───────────────────────────────────────────────────────────────
function useAskAi() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: "user", text: "What's slipping this week?" },
    { id: 2, role: "ai", key: "slipping" },
  ]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const nextIdRef = useRef(3);
  const threadRef = useRef<HTMLDivElement>(null);

  const scrollDown = useCallback(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, []);

  useEffect(() => { setTimeout(scrollDown, 30); }, [messages, typing, scrollDown]);

  const ask = useCallback((text: string) => {
    if (!text.trim() || typing) return;
    const uid = nextIdRef.current++;
    setMessages((prev) => [...prev, { id: uid, role: "user", text }]);
    setDraft("");
    setTyping(true);

    // Every question (typed or chip) goes through /api/ask, which grounds the
    // answer in real data when available and otherwise routes to a canned one.
    // min 1100ms keeps the typing indicator from flashing on instant fallback.
    const minDelay = new Promise<void>((r) => setTimeout(r, 1100));
    Promise.all([askAi(text), minDelay]).then(([{ key, answer }]) => {
      const aid = nextIdRef.current++;
      setMessages((prev) => [...prev, { id: aid, role: "ai", key, answer }]);
      setTyping(false);
    });
  }, [typing]);

  return { messages, draft, setDraft, typing, ask, threadRef };
}

// ── Composer input ────────────────────────────────────────────────────────────
function ComposerInput({ draft, setDraft, ask, variant }: {
  draft: string; setDraft: (v: string) => void; ask: (t: string) => void; variant: "mobile" | "desktop";
}) {
  const sm = variant === "mobile";
  return (
    <div style={{
      display: "flex", alignItems: "center",
      gap: sm ? 9 : 12,
      background: "var(--card)",
      border: sm ? "1.5px solid var(--accent-soft-2)" : "1.5px solid var(--line-3)",
      borderRadius: sm ? 20 : 16,
      padding: sm ? "8px 8px 8px 16px" : "11px 11px 11px 18px",
      boxShadow: sm ? "0 10px 26px rgba(80,65,40,0.13)" : "var(--card-shadow)",
    }}>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") ask(draft.trim()); }}
        placeholder={sm ? "Ask about your tasks, habits, deadlines…" : "Ask about your tasks, habits, deadlines or projects…"}
        style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 15, fontWeight: 500, color: "var(--ink)" }}
      />
      <button
        onClick={() => ask(draft.trim())}
        style={{ width: 42, height: 42, border: "none", borderRadius: sm ? 13 : 12, background: "var(--accent)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
      >
        <svg width={18} height={18} viewBox="0 0 20 20" fill="none">
          <path d="M10 16V4M10 4l-5 5M10 4l5 5" stroke="var(--on-accent-2)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}

// ── Mobile layout ─────────────────────────────────────────────────────────────
// Scrolls with the page; composer is fixed above the bottom nav.
function MobileAsk() {
  const { messages, draft, setDraft, typing, ask, threadRef } = useAskAi();

  return (
    <div ref={threadRef} style={{ minHeight: "100dvh", background: "var(--bg)" }}>
      {/* header */}
      <div style={{ padding: "12px 20px 10px", borderBottom: "1px solid var(--line-2)", display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{ width: 34, height: 34, borderRadius: 11, background: "var(--accent-soft)", border: "1px solid var(--accent-soft-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ width: 12, height: 12, borderRadius: "50%", border: "2.5px solid var(--accent)" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em" }}>Ask AI</h1>
          <div style={{ fontSize: 11.5, color: "var(--ink-mute)", fontWeight: 600 }}>Answers over everything you&apos;ve captured</div>
        </div>
      </div>

      {/* thread — normal page flow, scrolls with window */}
      <div style={{ padding: "18px 16px", display: "flex", flexDirection: "column", gap: 18, paddingBottom: "calc(160px + env(safe-area-inset-bottom))" }}>
        <ThreadMessages messages={messages} typing={typing} variant="mobile" />
      </div>

      {/* fixed composer above bottom nav */}
      <div style={{
        position: "fixed", left: 0, right: 0,
        bottom: "calc(64px + env(safe-area-inset-bottom))",
        zIndex: 45, padding: "10px 16px 12px",
        background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, var(--bg) 36%)",
      }}>
        <div className="mscroll" style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 10 }}>
          {SUGGESTION_DEFS.map((s) => (
            <button key={s.key} onClick={() => ask(s.label)} style={{ flexShrink: 0, border: "1px solid var(--check-border)", background: "var(--card)", borderRadius: 99, padding: "8px 14px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)", cursor: "pointer", whiteSpace: "nowrap" }}>
              {s.label}
            </button>
          ))}
        </div>
        <ComposerInput draft={draft} setDraft={setDraft} ask={ask} variant="mobile" />
      </div>
    </div>
  );
}

// ── Desktop layout ────────────────────────────────────────────────────────────
// height: 100dvh flex column — thread scrolls internally.
function DesktopAsk() {
  const { messages, draft, setDraft, typing, ask, threadRef } = useAskAi();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden" }}>
      {/* header */}
      <header style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, padding: "24px 40px", borderBottom: "1px solid var(--line-2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <div style={{ width: 40, height: 40, borderRadius: 13, background: "var(--accent-soft)", border: "1px solid var(--accent-soft-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ width: 13, height: 13, borderRadius: "50%", border: "2.5px solid var(--accent)" }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: "-0.02em" }}>Ask your Command Center</h1>
            <div style={{ fontSize: 13, color: "var(--ink-mute)", fontWeight: 500, marginTop: 1 }}>Answers over everything you&apos;ve captured — read-only</div>
          </div>
        </div>
        <ThemeSwitcher />
      </header>

      {/* thread — scrolls independently */}
      <div ref={threadRef} className="mscroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "30px 40px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 22 }}>
          <ThreadMessages messages={messages} typing={typing} variant="desktop" />
        </div>
      </div>

      {/* composer */}
      <div style={{ flexShrink: 0, padding: "14px 40px 26px", borderTop: "1px solid var(--line-2)", background: "var(--bg)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            {SUGGESTION_DEFS.map((s) => (
              <button key={s.key} onClick={() => ask(s.label)} style={{ border: "1px solid var(--line-3)", background: "var(--card)", borderRadius: 99, padding: "8px 14px", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", cursor: "pointer", whiteSpace: "nowrap" }}>
                {s.label}
              </button>
            ))}
          </div>
          <ComposerInput draft={draft} setDraft={setDraft} ask={ask} variant="desktop" />
        </div>
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
export function AskAiScreen() {
  return (
    <>
      <div className="hidden md:block" style={{ height: "100dvh", overflow: "hidden" }}>
        <DesktopAsk />
      </div>
      <div className="block md:hidden">
        <MobileAsk />
      </div>
    </>
  );
}
