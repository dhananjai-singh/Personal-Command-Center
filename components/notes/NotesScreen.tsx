"use client";

import { useState, useCallback, useRef } from "react";
import { searchNotes } from "@/lib/services/notes-search";
import { useSyncedStore } from "@/lib/hooks/useSyncedStore";
import type { Category } from "@/lib/domain/types";

const uid = () => Math.random().toString(36).slice(2, 9);

// ── types ─────────────────────────────────────────────────────────────────────
interface NoteItem {
  id: string;
  title: string;
  body: string;
  tag: Category;
  time: string;
  pinned: boolean;
  fresh?: boolean;
}

type FilterValue = "All" | Category;

const CAT_COLORS: Record<Category, { c: string; bg: string }> = {
  Studies:  { c: "var(--cat-studies)",  bg: "var(--cat-studies-bg)" },
  Work:     { c: "var(--cat-work)",     bg: "var(--cat-work-bg)" },
  Personal: { c: "var(--cat-personal)", bg: "var(--cat-personal-bg)" },
};

const FILTERS: FilterValue[] = ["All", "Studies", "Work", "Personal"];

// ── NoteCard ──────────────────────────────────────────────────────────────────
function NoteCard({
  note,
  highlighted,
  onTap,
}: {
  note: NoteItem;
  highlighted: boolean;
  onTap: () => void;
}) {
  const cv = CAT_COLORS[note.tag];
  return (
    <div
      onClick={onTap}
      style={{
        breakInside: "avoid",
        display: "inline-block",
        width: "100%",
        marginBottom: 10,
        background: cv.bg,
        border: highlighted ? "1.5px solid var(--accent)" : "1px solid var(--line-2)",
        borderRadius: 16,
        padding: "14px 15px",
        cursor: "pointer",
        boxShadow: highlighted
          ? "0 0 0 3px var(--accent-soft-2)"
          : "0 3px 12px rgba(120,105,70,0.05)",
        position: "relative",
        animation: note.fresh ? "cardIn .4s cubic-bezier(.2,.8,.2,1)" : undefined,
      }}
    >
      {/* pin icon */}
      {note.pinned && (
        <div style={{ position: "absolute", top: 13, right: 13, opacity: 0.55 }}>
          <span style={{ width: 9, height: 9, display: "block", border: "2px solid var(--ink-mute)", borderRadius: 2, transform: "rotate(45deg)" }} />
        </div>
      )}

      {note.title && (
        <div style={{
          fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em",
          color: "var(--ink)", marginBottom: 5,
          paddingRight: note.pinned ? 16 : 0,
        }}>
          {note.title}
        </div>
      )}
      <div style={{
        fontSize: 13.5, lineHeight: 1.5, fontWeight: 500, color: "var(--ink-2)",
        paddingRight: (note.pinned && !note.title) ? 16 : 0,
      }}>
        {note.body}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 11 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: cv.c }} />
        <span style={{ fontSize: 11, color: "var(--ink-mute)", fontWeight: 700 }}>{note.tag}</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: "var(--ink-dim)", fontWeight: 600 }}>{note.time}</span>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function NotesScreen() {
  const [notes, setNotes] = useSyncedStore<NoteItem[]>("pcc-notes", []);
  const [filter, setFilter] = useState<FilterValue>("All");
  const [aiQuery, setAiQuery] = useState("");
  const [aiResult, setAiResult] = useState<{ answer: string; matchIds: string[] } | null>(null);
  const [sheet, setSheet] = useState<"new" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftTag, setDraftTag] = useState<Category>("Personal");
  const [draftPinned, setDraftPinned] = useState(false);
  const [toast, setToast] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const runAi = useCallback((q: string) => {
    const result = searchNotes(q, notes.map((n) => ({
      id: n.id, title: n.title || null, body: n.body, tag: n.tag,
    })));
    if (!result.matchIds.length && !q.trim()) {
      setAiResult(null);
      return;
    }
    setAiResult({
      answer: result.answer,
      matchIds: result.matchIds,
    });
  }, [notes]);

  const openComposer = useCallback(() => {
    setSheet("new");
    setEditId(null);
    setDraftTitle(""); setDraftBody(""); setDraftTag("Personal"); setDraftPinned(false);
    setTimeout(() => bodyRef.current?.focus(), 120);
  }, []);

  const openEdit = useCallback((n: NoteItem) => {
    setSheet("edit");
    setEditId(n.id);
    setDraftTitle(n.title); setDraftBody(n.body); setDraftTag(n.tag); setDraftPinned(n.pinned);
  }, []);

  const closeSheet = useCallback(() => setSheet(null), []);

  const saveNote = useCallback(() => {
    const t = draftTitle.trim();
    const b = draftBody.trim();
    if (!t && !b) { closeSheet(); return; }

    if (sheet === "edit" && editId !== null) {
      setNotes((prev) => prev.map((n) =>
        n.id === editId ? { ...n, title: t, body: b || t, tag: draftTag, pinned: draftPinned } : n
      ));
      setSheet(null);
      return;
    }

    const id = uid();
    const note: NoteItem = { id, title: t, body: b || t, tag: draftTag, time: "Just now", pinned: draftPinned, fresh: true };
    setNotes((prev) => [note, ...prev]);
    setSheet(null);
    setToast(true);
    setTimeout(() => setToast(false), 2400);
    setTimeout(() => setNotes((prev) => prev.map((n) => n.id === id ? { ...n, fresh: false } : n)), 1800);
  }, [draftTitle, draftBody, draftTag, draftPinned, sheet, editId, setNotes, closeSheet]);

  const deleteNote = useCallback(() => {
    if (editId === null) return;
    setNotes((prev) => prev.filter((n) => n.id !== editId));
    setSheet(null);
  }, [editId, setNotes]);

  const aiActive = !!aiResult;

  // ordered list
  let ordered: NoteItem[];
  if (aiActive && aiResult) {
    ordered = aiResult.matchIds
      .map((id) => notes.find((n) => n.id === id))
      .filter((n): n is NoteItem => !!n);
  } else {
    const shown = notes.filter((n) => filter === "All" || n.tag === filter);
    ordered = [...shown.filter((n) => n.pinned), ...shown.filter((n) => !n.pinned)];
  }

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", position: "relative" }}>
      {/* scrollable content */}
      <div
        className="mscroll"
        style={{ paddingBottom: "calc(64px + 80px + env(safe-area-inset-bottom))", overflowY: "auto" }}
      >
        <div style={{ padding: "20px 18px 0" }}>
          <div style={{ fontSize: 12.5, color: "var(--ink-mute)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {notes.length} notes
          </div>
          <h1 style={{ margin: "5px 0 0", fontSize: 25, fontWeight: 700, letterSpacing: "-0.025em" }}>Notes</h1>
        </div>

        {/* AI ask bar */}
        <div style={{
          margin: "15px 18px 0",
          display: "flex", alignItems: "center", gap: 10,
          background: "var(--card)", border: "1.5px solid var(--accent-soft-2)",
          borderRadius: 15, padding: "9px 9px 9px 14px",
          boxShadow: "0 3px 14px rgba(120,105,70,0.05)",
        }}>
          <span style={{
            width: 26, height: 26, borderRadius: 8,
            background: "var(--accent-soft)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", border: "2px solid var(--accent)" }} />
          </span>
          <input
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") runAi(aiQuery); }}
            placeholder={`Ask for a note — "the TCP handshake one"`}
            style={{
              flex: 1, minWidth: 0, border: "none", outline: "none",
              background: "transparent", fontFamily: "inherit",
              fontSize: 14.5, fontWeight: 500, color: "var(--ink)",
            }}
          />
          <button
            onClick={() => runAi(aiQuery)}
            style={{
              width: 36, height: 36, border: "none", borderRadius: 10,
              background: "var(--accent)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            <svg width={16} height={16} viewBox="0 0 20 20" fill="none">
              <path d="M10 16V4M10 4l-5 5M10 4l5 5" stroke="var(--on-accent-2)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* AI result banner */}
        {aiActive && aiResult && (
          <div style={{
            margin: "12px 18px 0",
            display: "flex", alignItems: "flex-start", gap: 10,
            background: "var(--accent-soft)", border: "1px solid var(--accent-soft-2)",
            borderRadius: 14, padding: "12px 13px",
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: 8, flexShrink: 0,
              background: "var(--accent)",
              display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1,
            }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", border: "2px solid var(--on-accent)" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: "var(--accent-ink)", fontWeight: 600, lineHeight: 1.45 }}>
              {aiResult.answer}
            </div>
            <button
              onClick={() => { setAiResult(null); setAiQuery(""); }}
              style={{
                border: "none", background: "var(--card)", borderRadius: 9,
                padding: "6px 11px", fontFamily: "inherit", fontSize: 12,
                fontWeight: 700, color: "var(--ink-soft)", cursor: "pointer", flexShrink: 0,
              }}
            >
              Clear
            </button>
          </div>
        )}

        {/* tag filter row */}
        <div className="mscroll" style={{ margin: "16px 18px 0", display: "flex", gap: 7, overflowX: "auto", padding: "2px 0 4px" }}>
          {FILTERS.map((f) => {
            const active = filter === f;
            const cv = f !== "All" ? CAT_COLORS[f as Category] : null;
            return (
              <button
                key={f}
                onClick={() => { setFilter(f); setAiResult(null); setAiQuery(""); }}
                style={{
                  flexShrink: 0,
                  border: `1px solid ${active ? (cv ? cv.c : "var(--accent)") : "var(--line-2)"}`,
                  borderRadius: 99, padding: "7px 14px",
                  fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                  whiteSpace: "nowrap",
                  background: active ? (cv ? cv.bg : "var(--accent-soft)") : "var(--card)",
                  color: active ? (cv ? cv.c : "var(--accent-ink)") : "var(--ink-soft)",
                }}
              >
                {cv && (
                  <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: cv.c }} />
                )}
                {f}
              </button>
            );
          })}
        </div>

        {/* masonry grid */}
        {ordered.length === 0 ? (
          <div style={{ margin: "44px 18px", textAlign: "center", color: "var(--ink-mute)", fontWeight: 600, fontSize: 14 }}>
            {aiActive ? "No matching notes." : "No notes yet — tap “New note” to add one."}
          </div>
        ) : (
          <div style={{ margin: "12px 18px 0", columnCount: 2, columnGap: 10 }}>
            {ordered.map((n) => (
              <NoteCard
                key={n.id}
                note={n}
                highlighted={aiActive && !!aiResult?.matchIds.includes(n.id)}
                onTap={() => openEdit(n)}
              />
            ))}
          </div>
        )}
      </div>

      {/* floating new-note button */}
      <div style={{
        position: "fixed",
        left: 0, right: 0,
        bottom: "calc(64px + env(safe-area-inset-bottom))",
        zIndex: 44,
        padding: "10px 18px 12px",
        background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, var(--bg) 40%)",
        display: "flex", justifyContent: "center",
      }}>
        <button
          onClick={openComposer}
          style={{
            display: "flex", alignItems: "center", gap: 11,
            background: "var(--accent)", border: "none",
            borderRadius: 18, padding: "14px 24px 14px 18px",
            cursor: "pointer", boxShadow: "0 10px 26px rgba(23,166,179,0.34)",
          }}
        >
          <span style={{
            width: 30, height: 30, borderRadius: 10,
            background: "rgba(255,255,255,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <svg width={18} height={18} viewBox="0 0 20 20" fill="none">
              <path d="M10 4v12M4 10h12" stroke="var(--on-accent-2)" strokeWidth="2.6" strokeLinecap="round"/>
            </svg>
          </span>
          <span style={{ fontSize: 16, fontWeight: 800, color: "var(--on-accent-2)", letterSpacing: "-0.01em" }}>
            New note
          </span>
        </button>
      </div>

      {/* toast */}
      {toast && (
        <div style={{
          position: "fixed", left: "50%", bottom: "calc(160px + env(safe-area-inset-bottom))",
          transform: "translateX(-50%)",
          zIndex: 80,
          display: "flex", alignItems: "center", gap: 9,
          background: "var(--ink)", color: "#fff",
          fontSize: 13, fontWeight: 600,
          padding: "11px 16px", borderRadius: 99,
          boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
          whiteSpace: "nowrap",
          animation: "toastIn .3s cubic-bezier(.2,.8,.2,1)",
        }}>
          <span style={{
            width: 16, height: 16, borderRadius: "50%", background: "var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <span style={{ color: "var(--on-accent-2)", fontSize: 10, fontWeight: 800 }}>✓</span>
          </span>
          Note saved
        </div>
      )}

      {/* scrim */}
      {sheet && (
        <div
          onClick={closeSheet}
          style={{
            position: "fixed", inset: 0, zIndex: 70,
            background: "rgba(45,42,36,0.42)",
            animation: "fadeIn .25s ease-out",
          }}
        />
      )}

      {/* composer / edit sheet */}
      {sheet && (
        <div style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 71,
          background: "var(--bg)", borderRadius: "28px 28px 0 0",
          padding: "18px 20px calc(28px + env(safe-area-inset-bottom))",
          boxShadow: "0 -10px 40px rgba(0,0,0,0.18)",
          animation: "sheetUp .32s cubic-bezier(.2,.8,.2,1)",
        }}>
          {/* header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" }}>
                {sheet === "edit" ? "Edit note" : "Quick note"}
              </h3>
            </div>
            <button onClick={closeSheet} style={{
              border: "none", background: "var(--card-soft)",
              width: 30, height: 30, borderRadius: "50%", cursor: "pointer",
              fontSize: 15, color: "var(--ink-soft)", fontWeight: 700,
            }}>✕</button>
          </div>

          <input
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="Title (optional)"
            style={{
              width: "100%", border: "none", outline: "none",
              background: "transparent", fontFamily: "inherit",
              fontSize: 18, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.01em",
            }}
          />
          <textarea
            ref={bodyRef}
            value={draftBody}
            onChange={(e) => setDraftBody(e.target.value)}
            placeholder="Start typing — it saves the moment you're done…"
            style={{
              marginTop: 8, width: "100%", height: 128, resize: "none",
              border: "none", outline: "none", background: "transparent",
              fontFamily: "inherit", fontSize: 15.5, lineHeight: 1.55,
              fontWeight: 500, color: "var(--ink-2)", boxSizing: "border-box",
            }}
          />

          {/* tag pills */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 12, color: "var(--ink-mute)", fontWeight: 700, marginRight: 2 }}>Tag</span>
            {(["Studies", "Work", "Personal"] as Category[]).map((t) => {
              const on = draftTag === t;
              const cv = CAT_COLORS[t];
              return (
                <button
                  key={t}
                  onClick={() => setDraftTag(t)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    border: `1px solid ${on ? cv.c : "var(--line-2)"}`,
                    background: on ? cv.bg : "var(--card-hi)",
                    borderRadius: 10, padding: "8px 12px",
                    fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                    cursor: "pointer", color: on ? cv.c : "var(--ink-soft)",
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: cv.c, flexShrink: 0 }} />
                  {t}
                </button>
              );
            })}
          </div>

          {/* pin + delete row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
            <button
              onClick={() => setDraftPinned((p) => !p)}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                border: `1px solid ${draftPinned ? "var(--accent)" : "var(--line-2)"}`,
                background: draftPinned ? "var(--accent-soft)" : "var(--card-hi)",
                color: draftPinned ? "var(--accent-ink)" : "var(--ink-soft)",
                borderRadius: 10, padding: "8px 13px",
                fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}
            >
              <span style={{ width: 9, height: 9, display: "block", border: "2px solid currentColor", borderRadius: 2, transform: "rotate(45deg)" }} />
              {draftPinned ? "Pinned" : "Pin"}
            </button>
            <span style={{ flex: 1 }} />
            {sheet === "edit" && (
              <button
                onClick={deleteNote}
                style={{
                  border: "1px solid #dcc0b3", background: "transparent",
                  color: "#b06a4e", borderRadius: 10, padding: "8px 14px",
                  fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}
              >
                Delete
              </button>
            )}
          </div>

          <button
            onClick={saveNote}
            style={{
              marginTop: 16, width: "100%", border: "none", borderRadius: 15,
              background: "var(--accent)", color: "#fff",
              fontFamily: "inherit", fontSize: 15.5, fontWeight: 800,
              padding: 15, cursor: "pointer", letterSpacing: "-0.01em",
            }}
          >
            {sheet === "edit" ? "Save changes" : "Save note"}
          </button>
        </div>
      )}
    </div>
  );
}
