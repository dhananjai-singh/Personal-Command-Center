"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/nav/ThemeSwitcher";
import { CaptureBar, Checkbox, TypeShape, StreakChain } from "@/components/primitives";
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import { parseCapture } from "@/lib/services/capture";
import type { Category, ItemType } from "@/lib/domain/types";

// ─── Identity ─────────────────────────────────────────────────────────────────
const USER_NAME = "DJ";

// ─── Stored shapes ────────────────────────────────────────────────────────────
interface TaskItem {
  id: string;
  title: string;
  type: ItemType;
  category: Category;
  due: string;
  done: boolean;
}
interface HabitItem {
  id: string;
  title: string;
  timeHint: string;
  streak: number;
  done: boolean;
  week: boolean[];
}

const uid = () => Math.random().toString(36).slice(2, 9);
const EMPTY_WEEK = [false, false, false, false, false, false, false];

// ─── Color helpers ────────────────────────────────────────────────────────────
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

type ActiveCat = "all" | Category;
const ALL_CATS: ActiveCat[] = ["all", "Studies", "Work", "Personal"];

// ─── Date / greeting helpers ──────────────────────────────────────────────────
function greetingFor(d: Date) {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}
function weekStrip(now: Date) {
  const day = now.getDay();              // 0 Sun … 6 Sat
  const mondayOffset = (day + 6) % 7;    // days since Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOffset);
  const labels = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  return labels.map((dow, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { dow, num: d.getDate(), isToday: d.toDateString() === now.toDateString() };
  });
}

// ─── Empty-state helper ───────────────────────────────────────────────────────
function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: "18px 4px", textAlign: "center",
      fontSize: 13.5, color: "var(--ink-mute)", fontWeight: 600,
    }}>
      {children}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function TodayDashboard() {
  const [tasks, setTasks]   = useLocalStore<TaskItem[]>("pcc-tasks", []);
  const [habits, setHabits] = useLocalStore<HabitItem[]>("pcc-habits", []);
  const [activeCat, setActiveCat] = useState<ActiveCat>("all");
  const [captureParsing, setCaptureParsing] = useState(false);
  const [captureToast, setCaptureToast] = useState<string | null>(null);
  const [addingRoutine, setAddingRoutine] = useState(false);
  const [routineDraft, setRoutineDraft] = useState("");

  // Current time — set on client only to avoid SSR/timezone hydration mismatch.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, []);

  const greeting  = now ? greetingFor(now) : "Hello";
  const dateLabel = now
    ? now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    : "";

  const handleCapture = useCallback((text: string) => {
    setCaptureParsing(true);
    const minDelay = new Promise<void>(r => setTimeout(r, 1050));
    Promise.all([parseCapture(text), minDelay]).then(([p]) => {
      const newTask: TaskItem = {
        id: uid(), title: p.title, type: p.type, category: p.category,
        due: p.due ?? "—", done: false,
      };
      setTasks(prev => [newTask, ...prev]);
      setCaptureParsing(false);
      const dest = p.type === "deadline" ? "Deadlines" : p.type === "event" ? "Calendar" : "Today";
      setCaptureToast(dest);
      setTimeout(() => setCaptureToast(null), 2600);
    });
  }, [setTasks]);

  const addRoutine = useCallback(() => {
    const title = routineDraft.trim();
    if (!title) return;
    setHabits(prev => [...prev, { id: uid(), title, timeHint: "", streak: 0, done: false, week: [...EMPTY_WEEK] }]);
    setRoutineDraft("");
    setAddingRoutine(false);
  }, [routineDraft, setHabits]);

  const toggleHabit = (id: string) =>
    setHabits(p => p.map(h =>
      h.id === id
        ? { ...h, done: !h.done, streak: !h.done ? h.streak + 1 : Math.max(0, h.streak - 1) }
        : h,
    ));
  const removeHabit = (id: string) => setHabits(p => p.filter(h => h.id !== id));
  const toggleTask = (id: string) =>
    setTasks(p => p.map(t => (t.id === id ? { ...t, done: !t.done } : t)));
  const removeTask = (id: string) => setTasks(p => p.filter(t => t.id !== id));

  const habitsDone = habits.filter(h => h.done).length;
  const tasksDone  = tasks.filter(t => t.done).length;
  const total      = habits.length + tasks.length;
  const bestStreak = habits.length ? Math.max(...habits.map(h => h.streak)) : 0;
  const donePct    = total ? Math.round(((habitsDone + tasksDone) / total) * 100) : 0;

  const catCount = (c: ActiveCat) =>
    c === "all" ? tasks.length : tasks.filter(t => t.category === c).length;
  const visibleTasks = activeCat === "all" ? tasks : tasks.filter(t => t.category === activeCat);

  // ── Routines card ───────────────────────────────────────────────────────────
  function RoutinesCard({ mobile = false }: { mobile?: boolean }) {
    return (
      <section style={{
        background: "var(--card)", border: "1px solid var(--line-2)",
        borderRadius: 20, padding: mobile ? "16px 18px" : "22px 24px",
        boxShadow: "var(--card-shadow)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: mobile ? 17 : 18.5, fontWeight: 700, letterSpacing: "-0.02em" }}>
              Today&apos;s routines
            </h2>
            <span style={{ fontSize: 13.5, color: "var(--ink-mute)", fontWeight: 600 }}>
              {habitsDone} of {habits.length} done
            </span>
          </div>
          <button
            onClick={() => setAddingRoutine(v => !v)}
            aria-label="Add routine"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: addingRoutine ? "var(--accent)" : "var(--accent-soft)",
              color: addingRoutine ? "var(--on-accent-2)" : "var(--accent-ink)",
              border: "none", borderRadius: 99, padding: "6px 12px 6px 10px",
              cursor: "pointer", flexShrink: 0, fontFamily: "inherit",
              fontSize: 13, fontWeight: 700,
            }}
          >
            <span style={{ fontSize: 17, lineHeight: 1, marginTop: -1 }}>{addingRoutine ? "×" : "+"}</span>
            Routine
          </button>
        </div>

        {/* add-routine inline composer */}
        {addingRoutine && (
          <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
            <input
              autoFocus
              value={routineDraft}
              onChange={(e) => setRoutineDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addRoutine(); }}
              placeholder="e.g. Drink 3L water"
              style={{
                flex: 1, minWidth: 0, border: "1px solid var(--line-3)",
                background: "var(--card-hi)", borderRadius: 12, padding: "11px 14px",
                outline: "none", fontFamily: "inherit", fontSize: 15, fontWeight: 500, color: "var(--ink)",
              }}
            />
            <button onClick={addRoutine} style={{
              border: "none", borderRadius: 12, background: "var(--accent)", color: "#fff",
              fontFamily: "inherit", fontSize: 14, fontWeight: 700, padding: "0 16px", cursor: "pointer",
            }}>
              Add
            </button>
          </div>
        )}

        {habits.length === 0 && !addingRoutine ? (
          <EmptyNote>No routines yet — tap <strong>+ Routine</strong> to add one.</EmptyNote>
        ) : (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 9 }}>
            {habits.map((h) => (
              <div
                key={h.id}
                style={{
                  display: "flex", alignItems: "center", gap: 13,
                  padding: mobile ? "12px 14px" : "13px 15px",
                  borderRadius: 14, border: "1px solid var(--row-line)",
                  background: h.done ? "var(--done-bg)" : "var(--card-hi)",
                }}
              >
                <Checkbox checked={h.done} onChange={() => toggleHabit(h.id)} shape="square" size={mobile ? 26 : 24} />
                <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => toggleHabit(h.id)}>
                  <div style={{
                    fontSize: 15, fontWeight: 600,
                    color: h.done ? "var(--ink-faint)" : "var(--ink)",
                    textDecoration: h.done ? "line-through" : "none",
                  }}>
                    {h.title}
                  </div>
                  <div style={{ marginTop: 5 }}>
                    <StreakChain week={h.week} dotSize={8} />
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, justifyContent: "flex-end" }}>
                  <span style={{
                    fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em",
                    color: h.streak >= 14 ? "var(--accent)" : "var(--ink-2)",
                  }}>
                    {h.streak}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--ink-dim)", fontWeight: 600 }}>days</span>
                </div>
                <button
                  onClick={() => removeHabit(h.id)}
                  aria-label="Delete routine"
                  style={{
                    border: "none", background: "transparent", cursor: "pointer",
                    color: "var(--ink-dim)", fontSize: 16, lineHeight: 1, padding: 4, flexShrink: 0,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  // ── Tasks card ──────────────────────────────────────────────────────────────
  function TasksCard({ mobile = false }: { mobile?: boolean }) {
    return (
      <section style={{
        background: "var(--card)", border: "1px solid var(--line-2)",
        borderRadius: 20, padding: mobile ? "16px 18px" : "22px 24px",
        boxShadow: "var(--card-shadow)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: mobile ? 17 : 18.5, fontWeight: 700, letterSpacing: "-0.02em" }}>
              Today&apos;s tasks
            </h2>
            <span style={{ fontSize: 13.5, color: "var(--ink-mute)", fontWeight: 600 }}>
              {tasksDone} of {tasks.length} done
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            {ALL_CATS.map(cat => {
              const active = activeCat === cat;
              const c  = cat !== "all" ? CAT_C[cat as Category]  : undefined;
              const bg = cat !== "all" ? CAT_BG[cat as Category] : undefined;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCat(cat)}
                  style={{
                    border: `1px solid ${active ? (c ?? "var(--accent)") : "var(--line-2)"}`,
                    borderRadius: 99, padding: "6px 13px",
                    fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 7,
                    background: active ? (bg ?? "var(--accent-soft)") : "var(--card)",
                    color: active ? (c ?? "var(--accent-ink)") : "var(--ink-soft)",
                  }}
                >
                  {cat !== "all" && (
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: c, display: "block" }} />
                  )}
                  {cat === "all" ? "All" : cat} {catCount(cat)}
                </button>
              );
            })}
          </div>
        </div>

        {visibleTasks.length === 0 ? (
          <EmptyNote>
            {tasks.length === 0
              ? "No tasks yet — capture one below."
              : `Nothing in ${activeCat}.`}
          </EmptyNote>
        ) : (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column" }}>
            {visibleTasks.map((t, i) => (
              <div
                key={t.id}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: mobile ? "13px 0" : "14px 6px",
                  borderTop: i === 0 ? "none" : "1px solid var(--task-line)",
                }}
              >
                <Checkbox checked={t.done} onChange={() => toggleTask(t.id)} shape="round" size={22} />
                <span style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 14 }}>
                  <TypeShape type={t.type} />
                </span>
                <div
                  onClick={() => toggleTask(t.id)}
                  style={{
                    flex: 1, minWidth: 0, cursor: "pointer",
                    fontSize: 15, fontWeight: 600, lineHeight: 1.3, overflowWrap: "anywhere",
                    color: t.done ? "var(--ink-mute)" : "var(--ink)",
                    textDecoration: t.done ? "line-through" : "none",
                  }}
                >
                  {t.title}
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 700, borderRadius: 99, padding: "4px 11px", flexShrink: 0,
                  background: CAT_BG[t.category], color: CAT_C[t.category],
                }}>
                  {t.category}
                </span>
                <span style={{ fontSize: 13, color: "var(--ink-faint)", fontWeight: 600, textAlign: "right", flexShrink: 0, whiteSpace: "nowrap" }}>
                  {t.due}
                </span>
                <button
                  onClick={() => removeTask(t.id)}
                  aria-label="Delete task"
                  style={{
                    border: "none", background: "transparent", cursor: "pointer",
                    color: "var(--ink-dim)", fontSize: 16, lineHeight: 1, padding: 4, flexShrink: 0,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  // ── Fitness CTA (Garmin not connected yet) ──────────────────────────────────
  function FitnessCTA({ mobile = false }: { mobile?: boolean }) {
    return (
      <Link href="/fitness" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
        <div style={{
          background: "var(--card)", border: "1px solid var(--line-2)",
          borderRadius: mobile ? 18 : 20, padding: mobile ? "15px 16px" : "20px 22px",
          boxShadow: "var(--card-shadow)", display: "flex", alignItems: "center", gap: 13,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--accent-soft)",
          }}>
            <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2.5px solid var(--accent)" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" }}>Fitness</h2>
            <div style={{ fontSize: 12.5, color: "var(--ink-mute)", fontWeight: 600, marginTop: 2 }}>
              Log meals, track weight &amp; steps →
            </div>
          </div>
          <span style={{ fontSize: 18, color: "var(--ink-dim)", fontWeight: 700 }}>›</span>
        </div>
      </Link>
    );
  }

  // ── Toast (shared) ──────────────────────────────────────────────────────────
  const Toast = captureToast ? (
    <div style={{
      position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
      zIndex: 55, display: "flex", alignItems: "center", gap: 9,
      background: "var(--ink)", color: "#fff",
      fontSize: 13, fontWeight: 600, padding: "11px 16px", borderRadius: 99,
      boxShadow: "0 8px 24px rgba(0,0,0,0.18)", whiteSpace: "nowrap",
      animation: "toastIn 0.3s ease-out",
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", display: "block" }} />
      Saved to {captureToast} — no confirm needed
    </div>
  ) : null;

  // ── Desktop layout ──────────────────────────────────────────────────────────
  const DesktopView = (
    <div style={{ padding: "34px 40px 48px", display: "flex", flexDirection: "column", gap: 24, position: "relative" }}>
      {Toast}
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
        <div>
          <div style={{ fontSize: 13.5, color: "var(--ink-mute)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {dateLabel}
          </div>
          <h1 style={{ margin: "7px 0 0", fontSize: 31, fontWeight: 700, letterSpacing: "-0.025em", whiteSpace: "nowrap" }}>
            {greeting}, {USER_NAME}
          </h1>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          background: "var(--card)", border: "1px solid var(--line-2)",
          borderRadius: 99, padding: "5px 6px 5px 12px",
        }}>
          <span style={{ fontSize: 12, color: "var(--ink-mute)", fontWeight: 600, marginRight: 2 }}>Theme</span>
          <ThemeSwitcher />
        </div>
      </header>

      <CaptureBar variant="desktop" onSubmit={handleCapture} parsing={captureParsing} />

      <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 24, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
          {TasksCard({})}
          {RoutinesCard({})}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
          {FitnessCTA({})}

          {/* This week */}
          <section style={{
            background: "var(--card)", border: "1px solid var(--line-2)",
            borderRadius: 20, padding: "20px 22px", boxShadow: "var(--card-shadow)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em" }}>This week</h2>
              <span style={{ fontSize: 13, color: "var(--ink-mute)", fontWeight: 600 }}>
                {now ? now.toLocaleDateString("en-US", { month: "long", year: "numeric" }) : ""}
              </span>
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 6, justifyContent: "space-between" }}>
              {(now ? weekStrip(now) : []).map(w => (
                <div key={w.num} style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 7,
                  padding: "9px 0", borderRadius: 13,
                  background: w.isToday ? "var(--accent)" : "transparent",
                }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.03em", color: w.isToday ? "var(--accent-soft-2)" : "var(--ink-mute)" }}>
                    {w.dow}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: w.isToday ? "var(--on-accent)" : "var(--ink-2)" }}>
                    {w.num}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Upcoming */}
          <section style={{
            background: "var(--card)", border: "1px solid var(--line-2)",
            borderRadius: 20, padding: "20px 22px", boxShadow: "var(--card-shadow)",
          }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em" }}>
              Upcoming deadlines &amp; events
            </h2>
            <EmptyNote>Capture a deadline or event and it&apos;ll show up here.</EmptyNote>
          </section>
        </div>
      </div>
    </div>
  );

  // ── Mobile layout (Tasks first, then Routines) ──────────────────────────────
  const MobileView = (
    <div style={{ padding: "58px 18px 230px", display: "flex", flexDirection: "column", gap: 0 }}>
      {Toast}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--ink-mute)", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {dateLabel}
          </div>
          <h1 style={{ margin: "5px 0 0", fontSize: 25, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.15 }}>
            {greeting}, {USER_NAME}
          </h1>
        </div>
        <div style={{ marginTop: 4 }}>
          <ThemeSwitcher />
        </div>
      </div>

      {/* Pace + streak stat row */}
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <div style={{
          flex: 1, background: "var(--card)", border: "1px solid var(--line-2)",
          borderRadius: 16, padding: "13px 15px",
        }}>
          <div style={{ fontSize: 11.5, color: "var(--ink-faint)", fontWeight: 700, letterSpacing: "0.02em", textTransform: "uppercase" }}>
            Pace
          </div>
          <div style={{ marginTop: 5, fontSize: 21, fontWeight: 800, letterSpacing: "-0.02em" }}>
            {donePct}<span style={{ fontSize: 12, color: "var(--ink-faint)", fontWeight: 700 }}>%</span>
          </div>
          <div style={{ marginTop: 8, height: 6, borderRadius: 99, background: "var(--track)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 99, background: "var(--accent)", width: `${donePct}%` }} />
          </div>
        </div>
        <div style={{
          flex: 1, background: "var(--accent-soft)", border: "1px solid var(--accent-soft-2)",
          borderRadius: 16, padding: "13px 15px",
        }}>
          <div style={{ fontSize: 11.5, color: "var(--accent-ink)", fontWeight: 700, letterSpacing: "0.02em", textTransform: "uppercase" }}>
            Best streak
          </div>
          <div style={{ marginTop: 5, display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--accent-ink)" }}>
              {bestStreak}
            </span>
            <span style={{ fontSize: 12, color: "var(--accent-ink)", fontWeight: 700, opacity: 0.8 }}>days</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--accent-ink)", fontWeight: 600, opacity: 0.85 }}>
            {habitsDone} of {habits.length} done
          </div>
        </div>
      </div>

      {/* Tasks first */}
      <div style={{ marginTop: 18 }}>
        {TasksCard({ mobile: true })}
      </div>

      {/* Then routines */}
      <div style={{ marginTop: 20 }}>
        {RoutinesCard({ mobile: true })}
      </div>

      {/* Fitness */}
      <div style={{ marginTop: 20 }}>
        {FitnessCTA({ mobile: true })}
      </div>

      {/* Pinned capture bar — stays above bottom nav */}
      <div style={{
        position: "fixed", left: 0, right: 0, bottom: "calc(64px + env(safe-area-inset-bottom))",
        zIndex: 45, padding: "14px 16px 10px",
        background: "linear-gradient(180deg, rgba(var(--bg-rgb, 241,236,225),0) 0%, var(--bg) 32%)",
      }}>
        <CaptureBar variant="mobile" onSubmit={handleCapture} parsing={captureParsing} />
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden md:block">{DesktopView}</div>
      <div className="block md:hidden">{MobileView}</div>
    </>
  );
}
