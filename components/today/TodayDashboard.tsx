"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/nav/ThemeSwitcher";
import {
  CaptureBar,
  Checkbox,
  TypeShape,
  StreakChain,
  ProgressRing,
} from "@/components/primitives";
import { parseCapture } from "@/lib/services/capture";
import type { Category, ItemType } from "@/lib/domain/types";

// ─── Seed data ────────────────────────────────────────────────────────────────

const INITIAL_HABITS = [
  { title: "Morning movement", timeHint: "Anytime before noon", streak: 12, done: false, week: [true, true, false, true, true, true, false] },
  { title: "Read 30 minutes",  timeHint: "Evening wind-down",  streak: 8,  done: false, week: [true, false, true, true, true, true, true] },
  { title: "Meditate 10 min",  timeHint: "Morning",            streak: 21, done: true,  week: [true, true, true, true, true, true, true] },
  { title: "Inbox to zero",    timeHint: "Work block",         streak: 5,  done: false, week: [false, true, true, false, true, true, true] },
  { title: "Plan tomorrow",    timeHint: "Before bed",         streak: 16, done: false, week: [true, true, true, true, false, true, true] },
];

const INITIAL_TASKS = [
  { title: "Finish DBMS problem set 4",       type: "task"     as ItemType, category: "Studies"  as Category, due: "5:00 PM", done: false },
  { title: "Send retainer invoice to Lumen",  type: "deadline" as ItemType, category: "Work"     as Category, due: "2:00 PM", done: false },
  { title: "Review PR #214",                  type: "task"     as ItemType, category: "Work"     as Category, due: "4:00 PM", done: false },
  { title: "Re-read Networks lecture 9",      type: "task"     as ItemType, category: "Studies"  as Category, due: "—",       done: false },
  { title: "Call mom",                        type: "task"     as ItemType, category: "Personal" as Category, due: "7:30 PM", done: true  },
];

const WEEK_DAYS = [
  { dow: "MON", num: 9,  isToday: false, hasEvent: false },
  { dow: "TUE", num: 10, isToday: true,  hasEvent: false },
  { dow: "WED", num: 11, isToday: false, hasEvent: false },
  { dow: "THU", num: 12, isToday: false, hasEvent: true  },
  { dow: "FRI", num: 13, isToday: false, hasEvent: true  },
  { dow: "SAT", num: 14, isToday: false, hasEvent: false },
  { dow: "SUN", num: 15, isToday: false, hasEvent: false },
];

const TODAY_EVENTS = [
  { time: "11:00 AM", title: "Standup with Lumen", color: "var(--cat-work)" },
  { time: "1:30 PM",  title: "Networks lecture",   color: "var(--cat-studies)" },
  { time: "6:00 PM",  title: "Gym",                color: "var(--cat-personal)" },
];

const UPCOMING = [
  { title: "ML project report",  type: "deadline" as ItemType, label: "Deadline · Studies",  when: "Tomorrow", time: "10:00 PM", warn: true  },
  { title: "OS unit test",       type: "event"    as ItemType, label: "Event · Studies",     when: "Thu",      time: "9:00 AM",  warn: false },
  { title: "Standup with Lumen", type: "event"    as ItemType, label: "Event · Work",        when: "Tomorrow", time: "11:00 AM", warn: false },
  { title: "Pay rent",           type: "deadline" as ItemType, label: "Deadline · Personal", when: "Fri",      time: "All day",  warn: false },
];

const SLIPPING = [
  { kind: "Project", title: "Portfolio redesign",             idle: "6 days", category: "Studies"  as Category },
  { kind: "Task",    title: "Read distributed-systems paper", idle: "4 days", category: "Work"     as Category },
  { kind: "Project", title: "Budgeting side-app",             idle: "9 days", category: "Personal" as Category },
];

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

// ─── Component ────────────────────────────────────────────────────────────────

export function TodayDashboard() {
  const [habits, setHabits] = useState(INITIAL_HABITS);
  const [tasks,  setTasks]  = useState(INITIAL_TASKS);
  const [activeCat, setActiveCat] = useState<ActiveCat>("all");
  const [captureParsing, setCaptureParsing] = useState(false);
  const [captureToast, setCaptureToast] = useState<string | null>(null);

  const handleCapture = useCallback((text: string) => {
    setCaptureParsing(true);
    const minDelay = new Promise<void>(r => setTimeout(r, 1050));
    Promise.all([parseCapture(text), minDelay]).then(([p]) => {
      const newTask = { title: p.title, type: p.type, category: p.category, due: p.due ?? "—", done: false };
      setTasks(prev => [newTask, ...prev]);
      setCaptureParsing(false);
      const dest = p.type === "deadline" ? "Deadlines" : p.type === "event" ? "Calendar" : "Today";
      setCaptureToast(dest);
      setTimeout(() => setCaptureToast(null), 2600);
    });
  }, []);

  const toggleHabit = (i: number) =>
    setHabits(p => p.map((h, j) => (j === i ? { ...h, done: !h.done } : h)));
  const toggleTask = (i: number) =>
    setTasks(p => p.map((t, j) => (j === i ? { ...t, done: !t.done } : t)));

  const habitsDone  = habits.filter(h => h.done).length;
  const tasksDone   = tasks.filter(t => t.done).length;
  const bestStreak  = Math.max(...habits.map(h => h.streak));
  const donePct     = Math.round(((habitsDone + tasksDone) / (habits.length + tasks.length)) * 100);

  const catCount = (c: ActiveCat) =>
    c === "all" ? tasks.length : tasks.filter(t => t.category === c).length;

  const visibleTasks = activeCat === "all"
    ? tasks
    : tasks.filter(t => t.category === activeCat);

  // ── Shared section builders ─────────────────────────────────────────────────

  function RoutinesCard({ mobile = false }: { mobile?: boolean }) {
    return (
      <section style={{
        background: "var(--card)",
        border: "1px solid var(--line-2)",
        borderRadius: 20,
        padding: mobile ? "16px 18px" : "22px 24px",
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
          <span style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "var(--accent-soft)", borderRadius: 99, padding: "6px 13px", flexShrink: 0,
          }}>
            <span style={{ fontSize: 13, color: "var(--accent-ink)", fontWeight: 700 }}>
              Best streak {bestStreak}
            </span>
          </span>
        </div>

        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 9 }}>
          {habits.map((h, i) => (
            <div
              key={i}
              onClick={() => toggleHabit(i)}
              style={{
                display: "flex", alignItems: "center", gap: 15,
                padding: mobile ? "12px 14px" : "13px 15px",
                borderRadius: 14, cursor: "pointer",
                border: "1px solid var(--row-line)",
                background: h.done ? "var(--done-bg)" : "var(--card-hi)",
              }}
            >
              <Checkbox checked={h.done} onChange={() => toggleHabit(i)} shape="square" size={mobile ? 26 : 24} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 15, fontWeight: 600,
                  color: h.done ? "var(--ink-faint)" : "var(--ink)",
                  textDecoration: h.done ? "line-through" : "none",
                }}>
                  {h.title}
                </div>
                {mobile ? (
                  <div style={{ marginTop: 5 }}>
                    <StreakChain week={h.week} dotSize={8} />
                  </div>
                ) : (
                  <div style={{ fontSize: 12.5, color: "var(--ink-mute)", fontWeight: 500, marginTop: 2 }}>
                    {h.timeHint}
                  </div>
                )}
              </div>
              {!mobile && (
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <StreakChain week={h.week} dotSize={9} />
                </div>
              )}
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, width: 62, justifyContent: "flex-end" }}>
                <span style={{
                  fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em",
                  color: h.streak >= 14 ? "var(--accent)" : "var(--ink-2)",
                }}>
                  {h.streak}
                </span>
                <span style={{ fontSize: 11, color: "var(--ink-dim)", fontWeight: 600 }}>days</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  function TasksCard({ mobile = false }: { mobile?: boolean }) {
    return (
      <section style={{
        background: "var(--card)",
        border: "1px solid var(--line-2)",
        borderRadius: 20,
        padding: mobile ? "16px 18px" : "22px 24px",
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

        {/* Type legend — desktop only */}
        {!mobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 14 }}>
            {(["task", "deadline", "event"] as ItemType[]).map(t => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <TypeShape type={t} />
                <span style={{ fontSize: 12, color: "var(--ink-mute)", fontWeight: 600 }}>{t}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 8, display: "flex", flexDirection: "column" }}>
          {visibleTasks.map((t, i) => {
            const origIdx = tasks.indexOf(t);
            return (
              <div
                key={origIdx}
                onClick={() => toggleTask(origIdx)}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: mobile ? "13px 0" : "14px 6px",
                  cursor: "pointer",
                  borderTop: i === 0 ? "none" : "1px solid var(--task-line)",
                }}
              >
                <Checkbox checked={t.done} onChange={() => toggleTask(origIdx)} shape="round" size={22} />
                <span style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 14 }}>
                  <TypeShape type={t.type} />
                </span>
                <div style={{
                  flex: 1, minWidth: 0,
                  fontSize: 15, fontWeight: 600,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  color: t.done ? "var(--ink-mute)" : "var(--ink)",
                  textDecoration: t.done ? "line-through" : "none",
                }}>
                  {t.title}
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 700, borderRadius: 99, padding: "4px 11px", flexShrink: 0,
                  background: CAT_BG[t.category], color: CAT_C[t.category],
                }}>
                  {t.category}
                </span>
                <span style={{ fontSize: 13, color: "var(--ink-faint)", fontWeight: 600, width: 68, textAlign: "right", flexShrink: 0 }}>
                  {t.due}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  // ── Desktop layout ──────────────────────────────────────────────────────────

  const DesktopView = (
    <div style={{ padding: "34px 40px 48px", display: "flex", flexDirection: "column", gap: 24, position: "relative" }}>
      {/* Toast */}
      {captureToast && (
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
      )}
      {/* Greeting header */}
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
        <div>
          <div style={{ fontSize: 13.5, color: "var(--ink-mute)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Tuesday, June 10
          </div>
          <h1 style={{ margin: "7px 0 0", fontSize: 31, fontWeight: 700, letterSpacing: "-0.025em", whiteSpace: "nowrap" }}>
            Good morning, Arun
          </h1>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
          {/* Theme picker pill */}
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            background: "var(--card)", border: "1px solid var(--line-2)",
            borderRadius: 99, padding: "5px 6px 5px 12px",
          }}>
            <span style={{ fontSize: 12, color: "var(--ink-mute)", fontWeight: 600, marginRight: 2 }}>Theme</span>
            <ThemeSwitcher />
          </div>
          {/* Slipping pill */}
          <div style={{
            display: "flex", alignItems: "center", gap: 9,
            background: "var(--card)", border: "1px solid var(--line-2)",
            borderRadius: 99, padding: "8px 16px",
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--slip-dot)" }} />
            <span style={{ fontSize: 13.5, color: "var(--ink-soft)", fontWeight: 600 }}>
              {SLIPPING.length} items slipping
            </span>
          </div>
        </div>
      </header>

      {/* Capture bar */}
      <CaptureBar variant="desktop" onSubmit={handleCapture} parsing={captureParsing} />

      {/* 2-column grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 24, alignItems: "start" }}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
          <RoutinesCard />
          <TasksCard />
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
          {/* Fitness widget */}
          <Link href="/fitness" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
            <section style={{
              background: "var(--card)", border: "1px solid var(--line-2)",
              borderRadius: 20, padding: "20px 22px", boxShadow: "var(--card-shadow)",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em" }}>Fitness</h2>
                <span style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "var(--card-soft)", borderRadius: 99, padding: "4px 11px 4px 9px",
                }}>
                  <span style={{ width: 11, height: 11, borderRadius: 4, border: "2px solid var(--accent-ink)", display: "block" }} />
                  <span style={{ fontSize: 11.5, color: "var(--ink-soft)", fontWeight: 700 }}>Garmin</span>
                </span>
              </div>
              <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 20 }}>
                <ProgressRing progress={8432 / 10000} size={92} strokeWidth={9} label="8,432" sublabel="steps" />
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 13 }}>
                  {/* Calories */}
                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: "var(--ink-faint)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>Calories</span>
                      <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "-0.01em" }}>
                        940 <span style={{ fontSize: 11, color: "var(--ink-mute)", fontWeight: 700 }}>&nbsp;/ 2200</span>
                      </span>
                    </div>
                    {/* Macro bar */}
                    <div style={{ marginTop: 7, height: 8, borderRadius: 99, background: "var(--track)", overflow: "hidden", display: "flex" }}>
                      <div style={{ width: "11%", height: "100%", background: "var(--cat-work)" }} />
                      <div style={{ width: "15%", height: "100%", background: "var(--cat-studies)" }} />
                      <div style={{ width: "17%", height: "100%", background: "var(--cat-personal)" }} />
                    </div>
                    {/* Macro legend */}
                    <div style={{ marginTop: 7, display: "flex", gap: 13 }}>
                      {[["P", "58", "var(--cat-work)"], ["C", "82", "var(--cat-studies)"], ["F", "42", "var(--cat-personal)"]].map(([l, v, c]) => (
                        <span key={l} style={{ fontSize: 11, color: "var(--ink-mute)", fontWeight: 700 }}>
                          <span style={{ color: c }}>●</span> {l}{v}
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* Active / Distance */}
                  <div style={{ display: "flex", gap: 18 }}>
                    {[["Active", "540", "kcal"], ["Distance", "6.1", "km"]].map(([label, val, unit]) => (
                      <div key={label}>
                        <div style={{ fontSize: 11, color: "var(--ink-faint)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</div>
                        <div style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 1 }}>
                          {val} <span style={{ fontSize: 11, color: "var(--ink-faint)", fontWeight: 700 }}>{unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </Link>

          {/* Calendar strip */}
          <section style={{
            background: "var(--card)", border: "1px solid var(--line-2)",
            borderRadius: 20, padding: "20px 22px", boxShadow: "var(--card-shadow)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em" }}>This week</h2>
              <span style={{ fontSize: 13, color: "var(--ink-mute)", fontWeight: 600 }}>June 2026</span>
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 6, justifyContent: "space-between" }}>
              {WEEK_DAYS.map(w => (
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
                  <span style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: w.isToday ? "var(--on-accent-2)" : w.hasEvent ? "var(--event-dot)" : "transparent",
                  }} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 9 }}>
              {TODAY_EVENTS.map(e => (
                <div key={e.time} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "11px 13px", borderRadius: 13, background: "var(--card-soft)",
                }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink-soft)", width: 62, flexShrink: 0 }}>{e.time}</span>
                  <span style={{ width: 3, height: 26, borderRadius: 99, flexShrink: 0, background: e.color }} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600 }}>{e.title}</span>
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
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column" }}>
              {UPCOMING.map((u, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 13,
                  padding: "13px 4px",
                  borderTop: i === 0 ? "none" : "1px solid var(--task-line)",
                }}>
                  <span style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 14 }}>
                    <TypeShape type={u.type} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600 }}>{u.title}</div>
                    <div style={{ fontSize: 12.5, color: "var(--ink-mute)", fontWeight: 600, marginTop: 2 }}>{u.label}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: u.warn ? "var(--cat-work)" : "var(--ink-2)" }}>
                      {u.when}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-mute)", fontWeight: 600, marginTop: 1 }}>{u.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Slipping */}
          <section style={{
            background: "var(--slip-bg)", border: "1px solid var(--slip-border)",
            borderRadius: 20, padding: "20px 22px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--slip-dot)" }} />
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em" }}>Slipping</h2>
              <span style={{ fontSize: 12.5, color: "var(--ink-mute)", fontWeight: 600 }}>untouched 3+ days</span>
            </div>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 9 }}>
              {SLIPPING.map((s, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 13px", borderRadius: 13,
                  background: "var(--card)", border: "1px solid var(--row-line)",
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
                    borderRadius: 6, padding: "3px 7px", flexShrink: 0,
                    background: CAT_BG[s.category], color: CAT_C[s.category],
                  }}>
                    {s.kind}
                  </span>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600 }}>{s.title}</div>
                  <span style={{ fontSize: 12.5, color: "var(--slip-dot)", fontWeight: 700 }}>{s.idle}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );

  // ── Mobile layout ───────────────────────────────────────────────────────────

  const MobileView = (
    <div style={{ padding: "58px 18px 240px", display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--ink-mute)", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Tuesday, June 10
          </div>
          <h1 style={{ margin: "5px 0 0", fontSize: 25, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.15 }}>
            Good morning, Arun
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

      {/* Routines */}
      <div style={{ marginTop: 18 }}>
        <RoutinesCard mobile />
      </div>

      {/* Compact fitness widget */}
      <div style={{ marginTop: 20 }}>
        <Link href="/fitness" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
          <div style={{
            background: "var(--card)", border: "1px solid var(--line-2)",
            borderRadius: 18, padding: "15px 16px",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" }}>Fitness</h2>
              <span style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "var(--card-soft)", borderRadius: 99, padding: "4px 10px 4px 8px",
              }}>
                <span style={{ width: 11, height: 11, borderRadius: 4, border: "2px solid var(--accent-ink)", display: "block" }} />
                <span style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 700 }}>Garmin · 8m</span>
              </span>
            </div>
            <div style={{ marginTop: 13, display: "flex", alignItems: "center", gap: 16 }}>
              <ProgressRing progress={8432 / 10000} size={64} strokeWidth={7} label="8.4k" sublabel="steps" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: "var(--ink-faint)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>Calories</span>
                  <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "-0.01em" }}>
                    940 <span style={{ fontSize: 10.5, color: "var(--ink-mute)", fontWeight: 700 }}>&nbsp;/ 2200</span>
                  </span>
                </div>
                <div style={{ marginTop: 7, height: 7, borderRadius: 99, background: "var(--track)", overflow: "hidden", display: "flex" }}>
                  <div style={{ width: "11%", height: "100%", background: "var(--cat-work)" }} />
                  <div style={{ width: "15%", height: "100%", background: "var(--cat-studies)" }} />
                  <div style={{ width: "17%", height: "100%", background: "var(--cat-personal)" }} />
                </div>
                {/* Snap a meal pill */}
                <div style={{ marginTop: 8 }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 7,
                    background: "var(--accent-soft)", borderRadius: 9, padding: "6px 10px",
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M4 8.5C4 7.4 4.9 6.5 6 6.5H7.6L8.5 4.8C8.7 4.3 9.2 4 9.7 4H14.3C14.8 4 15.3 4.3 15.5 4.8L16.4 6.5H18C19.1 6.5 20 7.4 20 8.5V17C20 18.1 19.1 19 18 19H6C4.9 19 4 18.1 4 17V8.5Z" stroke="var(--accent-ink)" strokeWidth="1.8" strokeLinejoin="round"/>
                      <circle cx="12" cy="12.5" r="3.2" stroke="var(--accent-ink)" strokeWidth="1.8"/>
                    </svg>
                    <span style={{ fontSize: 11.5, color: "var(--accent-ink)", fontWeight: 700, whiteSpace: "nowrap" }}>Snap a meal</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Tasks */}
      <div style={{ marginTop: 20 }}>
        <TasksCard mobile />
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
