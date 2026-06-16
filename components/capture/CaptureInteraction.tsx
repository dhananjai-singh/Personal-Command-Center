"use client";

import { useState, useRef, useEffect } from "react";
import { parseCapture } from "@/lib/services/capture";
import { TypeShape } from "@/components/primitives/TypeShape";
import { BottomSheet } from "@/components/primitives/BottomSheet";
import { SegmentedControl } from "@/components/primitives/SegmentedControl";
import type { ItemType, Category } from "@/lib/domain/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CapturedItem {
  id: number;
  title: string;
  type: ItemType;
  category: Category;
  due: string;
  raw: string;
  fresh: boolean;
}

interface EditState {
  id: number;
  title: string;
  type: ItemType;
  category: Category;
  due: string;
}

const CAT_C: Record<Category, string> = {
  Studies:  "var(--cat-studies)",
  Work:     "var(--cat-work)",
  Personal: "var(--cat-personal)",
};
const CAT_BG: Record<Category, string> = {
  Studies:  "var(--cat-studies-bg)",
  Work:     "var(--cat-work-bg)",
  Personal: "var(--cat-personal-bg)",
};

const TYPE_OPTS: { value: ItemType; label: string }[] = [
  { value: "task",     label: "Task"     },
  { value: "deadline", label: "Deadline" },
  { value: "event",    label: "Event"    },
];
const CAT_OPTS: { value: Category; label: string }[] = [
  { value: "Studies",  label: "Studies"  },
  { value: "Work",     label: "Work"     },
  { value: "Personal", label: "Personal" },
];

const EXAMPLES = [
  { label: 'submit assignment by tomorrow night 10pm',       raw: "submit assignment by tomorrow night 10pm" },
  { label: 'remind me tomorrow at 3pm to email the client',  raw: "remind me tomorrow at 3pm to email the client" },
  { label: 'DSA test scheduled Thursday',                    raw: "DSA test scheduled Thursday" },
];

const DEST: Record<ItemType, string> = {
  deadline: "Deadlines",
  event:    "Calendar",
  task:     "Today",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function CaptureInteraction() {
  const [captureText, setCaptureText] = useState("");
  const [phase, setPhase] = useState<"idle" | "parsing" | "sent">("idle");
  const [items, setItems] = useState<CapturedItem[]>([
    { id: 1, title: "Stand-up with Lumen team",       type: "event", category: "Work",     due: "Today · 11:00 AM", raw: "standup with lumen 11am",          fresh: false },
    { id: 2, title: "Buy groceries on the way home",  type: "task",  category: "Personal", due: "Today · 7:00 PM",  raw: "grab groceries this evening",       fresh: false },
  ]);
  const [nextId, setNextId] = useState(3);
  const [toast, setToast] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<EditState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const parsing = phase === "parsing";
  const hasText = captureText.trim().length > 0;

  function fire(raw: string) {
    const text = raw.trim();
    if (!text || parsing) return;
    setCaptureText(text);
    setPhase("parsing");

    // Keep the parsing animation up for at least 1050ms even if the parse
    // resolves instantly (mock fallback); real LLM latency naturally exceeds it.
    const minDelay = new Promise<void>(r => setTimeout(r, 1050));
    Promise.all([parseCapture(text), minDelay]).then(([p]) => {
      const id = nextId;
      const newItem: CapturedItem = { id, title: p.title, type: p.type, category: p.category, due: p.due ?? "No date", raw: text, fresh: true };

      setItems(prev => [newItem, ...prev]);
      setNextId(n => n + 1);
      setCaptureText("");
      setPhase("sent");
      setToast(DEST[p.type]);

      // clear fresh flag (hides raw text + ring animation)
      setTimeout(() => setItems(prev => prev.map(it => it.id === id ? { ...it, fresh: false } : it)), 2200);
      // clear toast + phase
      setTimeout(() => { setPhase("idle"); setToast(null); }, 2600);
    });
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") fire(captureText);
  }

  function openEdit(item: CapturedItem) {
    setEditItem({ id: item.id, title: item.title, type: item.type, category: item.category, due: item.due });
  }

  function saveEdit() {
    if (!editItem) return;
    setItems(prev => prev.map(it => it.id === editItem.id
      ? { ...it, title: editItem.title, type: editItem.type, category: editItem.category, due: editItem.due }
      : it
    ));
    setEditItem(null);
  }

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      {/* Scrollable content */}
      <div style={{ flex: 1, padding: "28px 18px 220px", overflowY: "auto" }}>
        {/* Page header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: "var(--ink-mute)", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Capture
          </div>
          <h1 style={{ margin: "5px 0 0", fontSize: 22, fontWeight: 700, letterSpacing: "-0.025em" }}>
            Add anything
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13.5, color: "var(--ink-mute)", fontWeight: 500 }}>
            Tap an example or type below — it files itself instantly.
          </p>
        </div>

        {/* Example chips */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12 }} className="mscroll">
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => fire(ex.raw)}
              style={{
                flexShrink: 0, border: "1px dashed var(--check-border)",
                background: "var(--card)", borderRadius: 99, padding: "8px 14px",
                fontFamily: "inherit", fontSize: 12.5, fontWeight: 600,
                color: "var(--ink-soft)", cursor: "pointer", whiteSpace: "nowrap",
                display: "flex", alignItems: "center", gap: 7,
              }}
            >
              <span style={{ color: "var(--accent)", fontWeight: 800, fontSize: 15 }}>&ldquo;</span>
              {ex.label}
            </button>
          ))}
        </div>

        {/* "Just captured" list */}
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 13, color: "var(--ink-mute)", fontWeight: 700, letterSpacing: "0.02em", marginBottom: 12, paddingLeft: 2 }}>
            Just captured
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map(item => (
              <ItemCard key={item.id} item={item} onTap={() => openEdit(item)} />
            ))}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed", bottom: 160, left: "50%", transform: "translateX(-50%)",
            zIndex: 55, display: "flex", alignItems: "center", gap: 9,
            background: "var(--ink)", color: "#fff",
            fontSize: 13, fontWeight: 600,
            padding: "11px 16px", borderRadius: 99,
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            whiteSpace: "nowrap",
            animation: "toastIn 0.3s ease-out",
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", display: "block" }} />
          Saved to {toast} — no confirm needed
        </div>
      )}

      {/* Pinned capture bar */}
      <div style={{
        position: "fixed", left: 0, right: 0,
        bottom: "calc(64px + env(safe-area-inset-bottom))",
        zIndex: 45, padding: "14px 16px 10px",
        background: "linear-gradient(to bottom, transparent 0%, var(--bg) 30%)",
      }}>
        {/* Bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "var(--card)",
          border: `1.5px solid ${parsing ? "var(--accent)" : "var(--accent-soft-2)"}`,
          borderRadius: 22, padding: "9px 9px 9px 18px",
          boxShadow: "0 10px 30px rgba(80,65,40,0.14), 0 2px 8px rgba(80,65,40,0.06)",
          transition: "border-color 0.25s",
        }}>
          <input
            ref={inputRef}
            value={captureText}
            onChange={e => setCaptureText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Add a task, deadline or event…"
            disabled={parsing}
            style={{
              flex: 1, minWidth: 0, border: "none", outline: "none",
              background: "transparent", fontFamily: "inherit",
              fontSize: 16, fontWeight: 500, color: "var(--ink)",
            }}
          />
          <button
            onClick={hasText ? () => fire(captureText) : undefined}
            style={{
              width: 54, height: 54, border: "none", borderRadius: 17,
              background: "var(--accent)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              position: "relative", flexShrink: 0,
              boxShadow: "0 4px 14px rgba(23,166,179,0.35)",
            }}
            aria-label={hasText ? "Send" : "Voice input"}
          >
            {/* Mic */}
            <span style={{ position: "absolute", transition: "opacity 0.2s, transform 0.2s", opacity: hasText ? 0 : 1, transform: hasText ? "scale(0.6)" : "scale(1)" }}>
              <svg width="22" height="28" viewBox="0 0 22 28" fill="none">
                <rect x="6" y="1.5" width="10" height="16" rx="5" fill="var(--on-accent-2)" />
                <path d="M2.5 12.5a8.5 8.5 0 0 0 17 0" stroke="var(--on-accent-2)" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M11 21v5" stroke="var(--on-accent-2)" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </span>
            {/* Up arrow */}
            <span style={{ position: "absolute", transition: "opacity 0.2s, transform 0.2s", opacity: hasText ? 1 : 0, transform: hasText ? "scale(1)" : "scale(0.6)" }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 16V4M10 4l-5 5M10 4l5 5" stroke="var(--on-accent-2)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
        </div>

        {/* Parsing readout */}
        {parsing && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 10, animation: "fadeIn 0.25s ease-out" }}>
            {[0, 0.2, 0.4].map((d, i) => (
              <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "block", animation: `pulse 1s ease-in-out ${d}s infinite` }} />
            ))}
            <span style={{ fontSize: 12.5, color: "var(--accent-ink)", fontWeight: 700 }}>Parsing your words…</span>
          </div>
        )}

        {/* Caption */}
        {!parsing && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 9 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "block" }} />
            <span style={{ fontSize: 12, color: "var(--ink-mute)", fontWeight: 600 }}>
              Speak or type — it files itself, no confirm
            </span>
          </div>
        )}
      </div>

      {/* Edit sheet */}
      <BottomSheet
        open={!!editItem}
        onClose={() => setEditItem(null)}
        title="Edit item"
        subtitle="auto-saved"
      >
        {editItem && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Title */}
            <div>
              <div style={{ fontSize: 11.5, color: "var(--ink-faint)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>Title</div>
              <input
                value={editItem.title}
                onChange={e => setEditItem(s => s ? { ...s, title: e.target.value } : s)}
                style={{
                  marginTop: 6, width: "100%", boxSizing: "border-box",
                  border: "1px solid var(--line-2)", background: "var(--card-hi)",
                  borderRadius: 12, padding: "12px 14px",
                  fontFamily: "inherit", fontSize: 15, fontWeight: 600,
                  color: "var(--ink)", outline: "none",
                }}
              />
            </div>

            {/* Type */}
            <div>
              <div style={{ fontSize: 11.5, color: "var(--ink-faint)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 6 }}>Type</div>
              <SegmentedControl
                options={TYPE_OPTS}
                value={editItem.type}
                onChange={v => setEditItem(s => s ? { ...s, type: v } : s)}
                variant="accent"
              />
            </div>

            {/* Category */}
            <div>
              <div style={{ fontSize: 11.5, color: "var(--ink-faint)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 6 }}>Category</div>
              <SegmentedControl
                options={CAT_OPTS}
                value={editItem.category}
                onChange={v => setEditItem(s => s ? { ...s, category: v } : s)}
                variant="category"
              />
            </div>

            {/* When */}
            <div>
              <div style={{ fontSize: 11.5, color: "var(--ink-faint)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>When</div>
              <div style={{
                marginTop: 6, border: "1px solid var(--line-2)", background: "var(--card-hi)",
                borderRadius: 12, padding: "12px 14px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                fontSize: 15, fontWeight: 600,
              }}>
                <span>{editItem.due}</span>
                <span style={{ fontSize: 13, color: "var(--accent-ink)", fontWeight: 700 }}>Change</span>
              </div>
            </div>

            <button
              onClick={saveEdit}
              style={{
                marginTop: 6, width: "100%", border: "none", borderRadius: 14,
                background: "var(--accent)", color: "var(--on-accent)",
                fontFamily: "inherit", fontSize: 15, fontWeight: 700,
                padding: 15, cursor: "pointer",
                boxShadow: "0 4px 14px rgba(23,166,179,0.3)",
              }}
            >
              Done
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

// ─── ItemCard ─────────────────────────────────────────────────────────────────

function ItemCard({ item, onTap }: { item: CapturedItem; onTap: () => void }) {
  const cv = { c: CAT_C[item.category], bg: CAT_BG[item.category] };

  return (
    <div
      onClick={onTap}
      style={{
        background: "var(--card)",
        border: item.fresh ? "1.5px solid var(--accent-soft-2)" : "1px solid var(--line-2)",
        borderRadius: 18, padding: "15px 16px", cursor: "pointer",
        boxShadow: item.fresh
          ? "0 4px 16px rgba(120,105,70,0.05), 0 0 0 3px var(--accent-soft-2)"
          : "0 4px 16px rgba(120,105,70,0.05)",
        animation: item.fresh ? "cardIn 0.45s cubic-bezier(.2,.8,.2,1)" : "none",
        transition: "border-color 0.4s, box-shadow 0.4s",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {/* Category icon square */}
        <div style={{
          width: 34, height: 34, borderRadius: 11, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: cv.bg,
        }}>
          <TypeShape type={item.type} color={cv.c} size={11} />
        </div>

        {/* Title + chips */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--ink)" }}>
            {item.title}
          </div>

          {/* 3 staggered chips */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 11.5, fontWeight: 700, borderRadius: 7, padding: "3px 8px",
                background: "var(--card-hi)", border: "1px solid var(--line-2)", color: "var(--ink-soft)",
                animation: item.fresh ? "chipPop 0.4s ease-out 0.5s both" : "none",
              }}
            >
              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </span>
            <span
              style={{
                fontSize: 11.5, fontWeight: 700, borderRadius: 7, padding: "3px 8px",
                background: cv.bg, color: cv.c,
                animation: item.fresh ? "chipPop 0.4s ease-out 0.62s both" : "none",
              }}
            >
              {item.category}
            </span>
            <span
              style={{
                fontSize: 11.5, fontWeight: 700, borderRadius: 7, padding: "3px 8px",
                background: "var(--accent-soft)", color: "var(--accent-ink)",
                animation: item.fresh ? "chipPop 0.4s ease-out 0.74s both" : "none",
              }}
            >
              {item.due}
            </span>
          </div>

          {/* Raw text — shown only while fresh */}
          {item.fresh && (
            <div
              style={{
                display: "flex", alignItems: "center", gap: 7,
                marginTop: 11, paddingTop: 11, borderTop: "1px solid var(--task-line)",
                animation: "fadeIn 0.4s ease-out 0.9s both",
              }}
            >
              <span style={{ fontSize: 10.5, color: "var(--ink-dim)", fontWeight: 600, flexShrink: 0 }}>raw</span>
              <span style={{ fontSize: 12.5, color: "var(--ink-mute)", fontStyle: "italic", minWidth: 0 }}>
                &ldquo;{item.raw}&rdquo;
              </span>
            </div>
          )}
        </div>

        {/* Tap to edit hint */}
        <span style={{ fontSize: 11, color: "var(--ink-dim)", fontWeight: 600, flexShrink: 0, alignSelf: "flex-start", whiteSpace: "nowrap" }}>
          Tap to edit
        </span>
      </div>
    </div>
  );
}
