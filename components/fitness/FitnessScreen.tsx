"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { analyseText } from "@/lib/services/nutrition";
import { useSyncedStore } from "@/lib/hooks/useSyncedStore";
import type { MealDetection } from "@/lib/domain/types";

// ── stored shapes ─────────────────────────────────────────────────────────────
interface MealRow {
  name: string;
  time: string;
  cal: number;
  p: number;
  c: number;
  f: number;
}
interface FitStats {
  steps: number;
  stepGoal: number;
  distanceKm: number;
  activeCal: number;
  restingHr: number;
  calGoal: number;
}
interface WeightEntry {
  date: string; // YYYY-MM-DD
  kg: number;
}

const DEFAULT_STATS: FitStats = {
  steps: 0, stepGoal: 10000, distanceKm: 0, activeCal: 0, restingHr: 0, calGoal: 2200,
};

const EXAMPLE_CHIPS = [
  "500g soya chunks",
  "2 eggs and toast",
  "1 bowl rice & dal",
  "100g paneer",
];

// ── meal analysis (photo or text) via the server vision route ─────────────────
async function analyseMeal(opts: { image?: string; text?: string }): Promise<MealDetection> {
  try {
    const res = await fetch("/api/meal-vision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.detection) return data.detection as MealDetection;
    }
  } catch {
    /* fall through to local fallback */
  }
  if (opts.text?.trim()) return analyseText(opts.text);
  return {
    name: "Meal", conf: 50, time: "Now", total: 400, p: 20, c: 40, f: 15,
    items: [{ name: "Estimated meal", portion: "1 serving", cal: 400, p: 20, c: 40, f: 15, est: true }],
  };
}

// ── StepsRing ─────────────────────────────────────────────────────────────────
function StepsRing({ steps, goal }: { steps: number; goal: number }) {
  const r = 64;
  const stroke = 13;
  const circ = 2 * Math.PI * r;
  const pct = goal > 0 ? Math.min(steps / goal, 1) : 0;
  const offset = circ * (1 - pct);

  return (
    <div style={{ position: "relative", width: 148, height: 148, flexShrink: 0 }}>
      <svg width={148} height={148} viewBox="0 0 148 148" style={{ transform: "rotate(-90deg)" }}>
        <circle cx={74} cy={74} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <circle
          cx={74} cy={74} r={r} fill="none"
          stroke="var(--accent)" strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--ink)", lineHeight: 1 }}>
          {steps.toLocaleString()}
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-mute)", marginTop: 3 }}>
          of {goal.toLocaleString()} steps
        </span>
      </div>
    </div>
  );
}

// ── MacroBar ──────────────────────────────────────────────────────────────────
function MacroBar({ eaten, goal, p, c, f }: { eaten: number; goal: number; p: number; c: number; f: number }) {
  const pCal = p * 4, cCal = c * 4, fCal = f * 9;
  const sum = Math.max(pCal + cCal + fCal, 1);
  const fill = goal > 0 ? Math.min(eaten / goal, 1) : 0;
  const seg = (part: number) => (part / sum) * fill * 100;

  return (
    <div style={{
      height: 11, borderRadius: 99, overflow: "hidden",
      background: "var(--track)", display: "flex", marginTop: 10,
    }}>
      <div style={{ width: seg(pCal) + "%", background: "var(--protein)", height: "100%" }} />
      <div style={{ width: seg(cCal) + "%", background: "var(--carbs)", height: "100%" }} />
      <div style={{ width: seg(fCal) + "%", background: "var(--fat)", height: "100%" }} />
    </div>
  );
}

// ── MealListRow ───────────────────────────────────────────────────────────────
function MealListRow({ meal, onDelete }: { meal: MealRow; onDelete: () => void }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 13,
      padding: "11px 13px", borderRadius: 16,
      background: "var(--card)", border: "1px solid var(--line-2)",
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "repeating-linear-gradient(135deg, var(--card-soft), var(--card-soft) 6px, var(--card-hi) 6px, var(--card-hi) 12px)",
        border: "1px solid var(--line-2)",
      }}>
        <span style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid var(--ink-dim)", display: "block" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {meal.name}
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-mute)", fontWeight: 600, marginTop: 2 }}>
          {meal.time} · P{meal.p} · C{meal.c} · F{meal.f}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.02em" }}>{meal.cal}</div>
        <div style={{ fontSize: 11, color: "var(--ink-dim)", fontWeight: 700 }}>kcal</div>
      </div>
      <button
        onClick={onDelete}
        aria-label="Delete meal"
        style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--ink-dim)", fontSize: 16, padding: 4, flexShrink: 0 }}
      >
        ×
      </button>
    </div>
  );
}

// ── WeightChart ───────────────────────────────────────────────────────────────
function WeightChart({ data }: { data: WeightEntry[] }) {
  const W = 320, H = 120, pad = 14;
  const kgs = data.map(d => d.kg);
  const min = Math.min(...kgs);
  const max = Math.max(...kgs);
  const span = max - min || 1;
  const pts = data.map((d, i) => {
    const x = data.length === 1 ? W / 2 : pad + (i / (data.length - 1)) * (W - 2 * pad);
    const y = pad + (1 - (d.kg - min) / span) * (H - 2 * pad);
    return { x, y };
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)} ${H - pad} L${pts[0].x.toFixed(1)} ${H - pad} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", height: "auto" }} preserveAspectRatio="xMidYMid meet">
      <path d={area} fill="var(--accent-soft)" stroke="none" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.2} fill="var(--card)" stroke="var(--accent)" strokeWidth={2} />
      ))}
    </svg>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase = "closed" | "snap" | "text" | "detecting" | "results";

// ── Main component ────────────────────────────────────────────────────────────
export function FitnessScreen() {
  const router = useRouter();
  const [meals, setMeals] = useSyncedStore<MealRow[]>("pcc-meals", []);
  const [stats, setStats] = useSyncedStore<FitStats>("pcc-fitstats", DEFAULT_STATS);
  const [weights, setWeights] = useSyncedStore<WeightEntry[]>("pcc-weights", []);
  const [editingStats, setEditingStats] = useState(false);
  const [weightDraft, setWeightDraft] = useState("");

  const [phase, setPhase] = useState<Phase>("closed");
  const [mode, setMode] = useState<"photo" | "text">("photo");
  const [mealText, setMealText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [detected, setDetected] = useState<MealDetection | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
  }, []);
  const dateLabel = now ? now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }) : "";

  const totalEaten = meals.reduce((a, m) => a + m.cal, 0);
  const macroP = meals.reduce((a, m) => a + m.p, 0);
  const macroC = meals.reduce((a, m) => a + m.c, 0);
  const macroF = meals.reduce((a, m) => a + m.f, 0);
  const remaining = Math.max(stats.calGoal - totalEaten, 0);

  const sortedWeights = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const latestWeight = sortedWeights[sortedWeights.length - 1];
  const prevWeight = sortedWeights[sortedWeights.length - 2];
  const weightDelta = latestWeight && prevWeight ? +(latestWeight.kg - prevWeight.kg).toFixed(1) : null;

  const logWeight = useCallback(() => {
    const kg = parseFloat(weightDraft);
    if (!kg || kg <= 0) return;
    const today = new Date().toISOString().slice(0, 10);
    setWeights(prev => [...prev.filter(w => w.date !== today), { date: today, kg }]);
    setWeightDraft("");
  }, [weightDraft, setWeights]);

  const setStat = (key: keyof FitStats, val: number) =>
    setStats(prev => ({ ...prev, [key]: Number.isFinite(val) ? val : 0 }));

  // ── meal capture flow ───────────────────────────────────────────────────────
  const openSnap = useCallback(() => { setPhase("snap"); setMode("photo"); setDetected(null); setPhoto(null); }, []);
  const openText = useCallback(() => {
    setPhase("text"); setMode("text"); setMealText(""); setDetected(null);
    setTimeout(() => textRef.current?.focus(), 120);
  }, []);
  const closeSheet = useCallback(() => { setPhase("closed"); setDetected(null); setMealText(""); setPhoto(null); }, []);

  const onPickFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }, []);

  const detect = useCallback(() => {
    if (phase === "detecting") return;
    if (!photo) { fileRef.current?.click(); return; }
    setPhase("detecting");
    const floor = new Promise<void>((r) => setTimeout(r, 1200));
    Promise.all([analyseMeal({ image: photo }), floor]).then(([d]) => { setDetected(d); setPhase("results"); });
  }, [phase, photo]);

  const parseText = useCallback(() => {
    const raw = mealText.trim();
    if (!raw || phase === "detecting") return;
    setPhase("detecting");
    const floor = new Promise<void>((r) => setTimeout(r, 1000));
    Promise.all([analyseMeal({ text: raw }), floor]).then(([d]) => { setDetected(d); setPhase("results"); });
  }, [mealText, phase]);

  const patchItem = useCallback((i: number, patch: Partial<MealDetection["items"][number]>) => {
    setDetected((d) => {
      if (!d) return d;
      const items = d.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it));
      const num = (x: number | undefined) => Number(x) || 0;
      return {
        ...d, items,
        total: items.reduce((a, b) => a + num(b.cal), 0),
        p: items.reduce((a, b) => a + num(b.p), 0),
        c: items.reduce((a, b) => a + num(b.c), 0),
        f: items.reduce((a, b) => a + num(b.f), 0),
      };
    });
  }, []);

  const setMealName = useCallback((name: string) => setDetected((d) => (d ? { ...d, name } : d)), []);

  const logMeal = useCallback(() => {
    if (!detected) return;
    const row: MealRow = {
      name: detected.name, time: "Just now",
      cal: detected.total, p: detected.p, c: detected.c, f: detected.f,
    };
    setMeals((prev) => [...prev, row]); // persists via useSyncedStore
    setToast(`Logged ${detected.total} kcal · ${detected.name}`);
    setPhase("closed"); setDetected(null); setPhoto(null);
    setTimeout(() => setToast(null), 2800);
  }, [detected, setMeals]);

  const isOpen = phase !== "closed";
  const isSnap = phase === "snap" || (phase === "detecting" && mode === "photo") || (phase === "results" && mode === "photo");
  const isTextMode = phase === "text" || (phase === "detecting" && mode === "text") || (phase === "results" && mode === "text");
  const isDetecting = phase === "detecting";
  const isResults = phase === "results";

  const primaryLabel = isDetecting
    ? (mode === "text" ? "Calculating…" : "Detecting…")
    : isResults ? "Log this meal"
    : mode === "text" ? "Calculate macros"
    : photo ? "Detect food" : "Choose a photo";

  const primaryAction = isResults ? logMeal : isTextMode ? parseText : detect;

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", position: "relative" }}>
      <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} style={{ display: "none" }} />

      <div style={{ paddingBottom: "calc(64px + 72px + env(safe-area-inset-bottom))", overflowY: "auto" }}>

        {/* header */}
        <div style={{ padding: "20px 18px 0" }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--ink)" }}>
            Fitness
          </h1>
          <div style={{ fontSize: 13, color: "var(--ink-mute)", fontWeight: 600, marginTop: 2 }}>
            {dateLabel}
          </div>
        </div>

        {/* steps / stats card */}
        <div style={{
          margin: "16px 18px 0",
          background: "var(--card)", border: "1px solid var(--line-2)",
          borderRadius: 20, padding: "18px 16px",
          boxShadow: "var(--card-shadow)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "var(--card-soft)", borderRadius: 99, padding: "4px 11px",
              fontSize: 11.5, color: "var(--ink-mute)", fontWeight: 700,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--ink-dim)" }} />
              Garmin · not connected
            </span>
            <button
              onClick={() => setEditingStats(v => !v)}
              style={{
                border: "none", background: editingStats ? "var(--accent)" : "var(--accent-soft)",
                color: editingStats ? "var(--on-accent-2)" : "var(--accent-ink)",
                borderRadius: 99, padding: "5px 13px", cursor: "pointer",
                fontFamily: "inherit", fontSize: 12.5, fontWeight: 700,
              }}
            >
              {editingStats ? "Done" : "Enter manually"}
            </button>
          </div>

          {editingStats ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {([
                ["Steps", "steps"], ["Step goal", "stepGoal"],
                ["Distance (km)", "distanceKm"], ["Active (kcal)", "activeCal"],
                ["Resting HR", "restingHr"], ["Calorie goal", "calGoal"],
              ] as [string, keyof FitStats][]).map(([label, key]) => (
                <label key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--ink-mute)", fontWeight: 700 }}>{label}</span>
                  <input
                    type="number"
                    value={stats[key]}
                    onChange={(e) => setStat(key, parseFloat(e.target.value))}
                    style={{
                      border: "1px solid var(--line-3)", background: "var(--card-hi)",
                      borderRadius: 10, padding: "9px 11px", outline: "none",
                      fontFamily: "inherit", fontSize: 15, fontWeight: 700, color: "var(--ink)", width: "100%", boxSizing: "border-box",
                    }}
                  />
                </label>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <StepsRing steps={stats.steps} goal={stats.stepGoal} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
                <StatCell label="Distance" value={`${stats.distanceKm} km`} />
                <div style={{ height: 1, background: "var(--line-2)" }} />
                <StatCell label="Active burn" value={`${stats.activeCal} kcal`} />
                <div style={{ height: 1, background: "var(--line-2)" }} />
                <StatCell label="Resting HR" value={stats.restingHr ? `${stats.restingHr} bpm` : "—"} />
              </div>
            </div>
          )}
        </div>

        {/* calorie budget card */}
        <div style={{
          margin: "12px 18px 0",
          background: "var(--card)", border: "1px solid var(--line-2)",
          borderRadius: 20, padding: "16px",
          boxShadow: "var(--card-shadow)",
        }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>Calories</span>
            <span style={{ fontSize: 13, color: "var(--ink-mute)", fontWeight: 600 }}>
              {totalEaten} / {stats.calGoal} kcal
            </span>
          </div>

          <MacroBar eaten={totalEaten} goal={stats.calGoal} p={macroP} c={macroC} f={macroF} />

          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--accent-ink)", marginTop: 8 }}>
            {remaining}
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-mute)", marginLeft: 5 }}>kcal remaining</span>
          </div>

          <div style={{ display: "flex", gap: 0, marginTop: 12 }}>
            {[
              { color: "var(--protein)", label: "Protein", val: macroP },
              { color: "var(--carbs)",   label: "Carbs",   val: macroC },
              { color: "var(--fat)",     label: "Fat",     val: macroF },
            ].map(({ color, label, val }) => (
              <div key={label} style={{ flex: 1, display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: color, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>{val}g</div>
                  <div style={{ fontSize: 11, color: "var(--ink-mute)", fontWeight: 700 }}>{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* weight tracker */}
        <div style={{
          margin: "12px 18px 0",
          background: "var(--card)", border: "1px solid var(--line-2)",
          borderRadius: 20, padding: "16px",
          boxShadow: "var(--card-shadow)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" }}>Weight</h2>
            {latestWeight && (
              <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--ink)" }}>
                  {latestWeight.kg}
                  <span style={{ fontSize: 12, color: "var(--ink-mute)", fontWeight: 700, marginLeft: 2 }}>kg</span>
                </span>
                {weightDelta !== null && weightDelta !== 0 && (
                  <span style={{
                    fontSize: 12, fontWeight: 800,
                    color: weightDelta < 0 ? "var(--cat-personal)" : "var(--cat-work)",
                  }}>
                    {weightDelta > 0 ? "+" : ""}{weightDelta}
                  </span>
                )}
              </div>
            )}
          </div>

          {sortedWeights.length >= 2 && (
            <div style={{ marginTop: 12 }}>
              <WeightChart data={sortedWeights} />
            </div>
          )}
          {sortedWeights.length === 1 && (
            <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--ink-mute)", fontWeight: 600 }}>
              Log another day to start the graph.
            </div>
          )}
          {sortedWeights.length === 0 && (
            <div style={{ marginTop: 8, fontSize: 13, color: "var(--ink-mute)", fontWeight: 600 }}>
              Log your weight to start tracking.
            </div>
          )}

          <div style={{ marginTop: 13, display: "flex", gap: 8 }}>
            <input
              type="number"
              value={weightDraft}
              onChange={(e) => setWeightDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") logWeight(); }}
              placeholder="Today's weight (kg)"
              style={{
                flex: 1, minWidth: 0, border: "1px solid var(--line-3)", background: "var(--card-hi)",
                borderRadius: 12, padding: "11px 14px", outline: "none",
                fontFamily: "inherit", fontSize: 15, fontWeight: 600, color: "var(--ink)",
              }}
            />
            <button onClick={logWeight} style={{
              border: "none", borderRadius: 12, background: "var(--accent)", color: "#fff",
              fontFamily: "inherit", fontSize: 14, fontWeight: 700, padding: "0 18px", cursor: "pointer",
            }}>
              Log
            </button>
          </div>
        </div>

        {/* today's meals */}
        <div style={{ margin: "20px 18px 0", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em" }}>Today&apos;s meals</h2>
          <span style={{ fontSize: 12.5, color: "var(--ink-mute)", fontWeight: 700 }}>{meals.length} logged</span>
        </div>

        <div style={{ margin: "11px 18px 0", display: "flex", flexDirection: "column", gap: 9 }}>
          {meals.length === 0 ? (
            <div style={{
              padding: "20px 4px", textAlign: "center",
              fontSize: 13.5, color: "var(--ink-mute)", fontWeight: 600,
            }}>
              No meals yet — snap or describe one below.
            </div>
          ) : (
            meals.map((m, i) => (
              <MealListRow key={i} meal={m} onDelete={() => setMeals(prev => prev.filter((_, j) => j !== i))} />
            ))
          )}
        </div>

        {/* AI nutrition strip */}
        <div
          role="button"
          onClick={() => router.push("/ask")}
          style={{
            margin: "16px 18px 0",
            background: "var(--accent-soft)", border: "1px solid var(--accent-soft-2)",
            borderRadius: 18, padding: "15px 16px", cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0,
              background: "var(--accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ width: 11, height: 11, borderRadius: "50%", border: "2px solid var(--on-accent-2)" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--accent-ink)" }}>Ask about your nutrition</div>
              <div style={{ fontSize: 12, color: "var(--accent-ink)", fontWeight: 600, opacity: 0.8, marginTop: 1 }}>
                &ldquo;Am I hitting my protein goal?&rdquo;
              </div>
            </div>
            <span style={{ fontSize: 18, color: "var(--accent-ink)", fontWeight: 700 }}>›</span>
          </div>
        </div>
      </div>

      {/* floating dock — snap + describe buttons */}
      <div style={{
        position: "fixed",
        left: 0, right: 0,
        bottom: "calc(64px + env(safe-area-inset-bottom))",
        zIndex: 45,
        padding: "10px 18px 12px",
        background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, var(--bg) 45%)",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
      }}>
        <button onClick={openSnap} style={{
          flex: 1, maxWidth: 188,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          background: "var(--accent)", border: "none", borderRadius: 18,
          padding: "14px 14px", cursor: "pointer",
          boxShadow: "0 10px 26px rgba(23,166,179,0.32)",
        }}>
          <svg width={21} height={21} viewBox="0 0 24 24" fill="none">
            <path d="M4 8.5C4 7.4 4.9 6.5 6 6.5H7.6L8.5 4.8C8.7 4.3 9.2 4 9.7 4H14.3C14.8 4 15.3 4.3 15.5 4.8L16.4 6.5H18C19.1 6.5 20 7.4 20 8.5V17C20 18.1 19.1 19 18 19H6C4.9 19 4 18.1 4 17V8.5Z" stroke="var(--on-accent-2)" strokeWidth="1.9" strokeLinejoin="round"/>
            <circle cx="12" cy="12.5" r="3.2" stroke="var(--on-accent-2)" strokeWidth="1.9"/>
          </svg>
          <span style={{ fontSize: 15, fontWeight: 800, color: "var(--on-accent-2)", letterSpacing: "-0.01em" }}>Snap a meal</span>
        </button>

        <button onClick={openText} style={{
          flex: 1, maxWidth: 188,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
          background: "var(--card)", border: "1.5px solid var(--accent-soft-2)",
          borderRadius: 18, padding: "14px 14px", cursor: "pointer",
          boxShadow: "0 8px 22px rgba(80,65,40,0.10)",
        }}>
          <svg width={21} height={21} viewBox="0 0 24 24" fill="none">
            <path d="M5 7h14M5 12h14M5 17h9" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: 15, fontWeight: 800, color: "var(--accent-ink)", letterSpacing: "-0.01em" }}>Describe it</span>
        </button>
      </div>

      {/* toast */}
      {toast && (
        <div style={{
          position: "fixed", left: "50%", bottom: "calc(140px + env(safe-area-inset-bottom))",
          transform: "translateX(-50%)",
          zIndex: 80,
          display: "flex", alignItems: "center", gap: 9,
          background: "var(--ink)", color: "#fff",
          fontSize: 13, fontWeight: 600,
          padding: "11px 16px", borderRadius: 99,
          boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
          whiteSpace: "nowrap", maxWidth: 340,
          animation: "toastIn .3s cubic-bezier(.2,.8,.2,1)",
        }}>
          <span style={{
            width: 16, height: 16, borderRadius: "50%", background: "var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <span style={{ color: "var(--on-accent-2)", fontSize: 10, fontWeight: 800 }}>✓</span>
          </span>
          {toast}
        </div>
      )}

      {/* scrim */}
      {isOpen && (
        <div onClick={closeSheet} style={{
          position: "fixed", inset: 0, zIndex: 70,
          background: "rgba(45,42,36,0.42)",
          animation: "fadeIn .25s ease-out",
        }} />
      )}

      {/* bottom sheet */}
      {isOpen && (
        <div style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 71,
          background: "var(--bg)", borderRadius: "28px 28px 0 0",
          padding: "14px 20px calc(30px + env(safe-area-inset-bottom))",
          boxShadow: "0 -10px 40px rgba(0,0,0,0.18)",
          animation: "sheetUp .35s cubic-bezier(.2,.8,.2,1)",
          maxHeight: "92dvh", overflowY: "auto",
        }}>
          <div style={{ width: 40, height: 5, borderRadius: 99, background: "var(--check-border)", margin: "0 auto 16px" }} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>
              {isResults ? "Detected meal" : isTextMode ? "Describe your meal" : "Snap your meal"}
            </h3>
            <button onClick={closeSheet} style={{
              border: "none", background: "var(--card-soft)",
              width: 30, height: 30, borderRadius: "50%", cursor: "pointer",
              fontSize: 15, color: "var(--ink-soft)", fontWeight: 700,
            }}>✕</button>
          </div>

          {/* photo block */}
          {(isSnap && !isResults) && (
            <div
              onClick={() => { if (!isDetecting) fileRef.current?.click(); }}
              style={{
                marginTop: 14, position: "relative", width: "100%", height: 212,
                borderRadius: 18, overflow: "hidden", cursor: isDetecting ? "default" : "pointer",
                border: "1px solid var(--line-2)", background: "var(--card-soft)",
              }}
            >
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="Meal" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexDirection: "column", gap: 8,
                }}>
                  <svg width={32} height={32} viewBox="0 0 24 24" fill="none">
                    <path d="M4 8.5C4 7.4 4.9 6.5 6 6.5H7.6L8.5 4.8C8.7 4.3 9.2 4 9.7 4H14.3C14.8 4 15.3 4.3 15.5 4.8L16.4 6.5H18C19.1 6.5 20 7.4 20 8.5V17C20 18.1 19.1 19 18 19H6C4.9 19 4 18.1 4 17V8.5Z" stroke="var(--ink-dim)" strokeWidth="1.9" strokeLinejoin="round"/>
                    <circle cx="12" cy="12.5" r="3.2" stroke="var(--ink-dim)" strokeWidth="1.9"/>
                  </svg>
                  <span style={{ fontSize: 13, color: "var(--ink-mute)", fontWeight: 600 }}>Tap to add your meal photo</span>
                </div>
              )}
              {[
                { top: 12, left: 12, borderTop: "3px solid var(--on-accent-2)", borderLeft: "3px solid var(--on-accent-2)", borderRadius: "4px 0 0 0" },
                { top: 12, right: 12, borderTop: "3px solid var(--on-accent-2)", borderRight: "3px solid var(--on-accent-2)", borderRadius: "0 4px 0 0" },
                { bottom: 12, left: 12, borderBottom: "3px solid var(--on-accent-2)", borderLeft: "3px solid var(--on-accent-2)", borderRadius: "0 0 0 4px" },
                { bottom: 12, right: 12, borderBottom: "3px solid var(--on-accent-2)", borderRight: "3px solid var(--on-accent-2)", borderRadius: "0 0 4px 0" },
              ].map((s, i) => (
                <span key={i} style={{ position: "absolute", width: 22, height: 22, ...s }} />
              ))}
              {isDetecting && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(23,166,179,0.10)", pointerEvents: "none" }}>
                  <div style={{
                    position: "absolute", left: 0, right: 0, height: 2,
                    background: "var(--accent)", boxShadow: "0 0 14px 2px var(--accent)",
                    animation: "scanline 1.3s ease-in-out infinite alternate",
                  }} />
                  <div style={{
                    position: "absolute", left: 0, right: 0, bottom: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    gap: 8, padding: 12, background: "rgba(45,42,36,0.55)",
                  }}>
                    <PulseDots color="#fff" />
                    <span style={{ fontSize: 13, color: "#fff", fontWeight: 700 }}>Detecting food…</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* text block */}
          {(isTextMode && !isResults) && (
            <div>
              <textarea
                ref={textRef}
                value={mealText}
                onChange={(e) => setMealText(e.target.value)}
                placeholder={`e.g. "500g soya chunks" or "2 eggs and toast"`}
                style={{
                  marginTop: 14, width: "100%", height: 92, resize: "none",
                  border: "1px solid var(--line-2)", background: "var(--card-hi)",
                  borderRadius: 14, padding: "13px 15px", outline: "none",
                  fontFamily: "inherit", fontSize: 15.5, lineHeight: 1.5,
                  fontWeight: 500, color: "var(--ink)", boxSizing: "border-box",
                }}
              />
              <div className="mscroll" style={{ display: "flex", gap: 7, overflowX: "auto", padding: "10px 0 2px" }}>
                {EXAMPLE_CHIPS.map((chip) => (
                  <button key={chip} onClick={() => setMealText(chip)} style={{
                    flexShrink: 0,
                    border: "1px dashed var(--check-border)", background: "var(--card)",
                    borderRadius: 99, padding: "7px 13px",
                    fontFamily: "inherit", fontSize: 12.5, fontWeight: 600,
                    color: "var(--ink-soft)", cursor: "pointer", whiteSpace: "nowrap",
                  }}>
                    {chip}
                  </button>
                ))}
              </div>
              {isDetecting && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 14 }}>
                  <PulseDots color="var(--accent)" />
                  <span style={{ fontSize: 13, color: "var(--accent-ink)", fontWeight: 700 }}>Reading your meal…</span>
                </div>
              )}
            </div>
          )}

          {/* results — every value editable */}
          {isResults && detected && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
                  <input
                    value={detected.name}
                    onChange={(e) => setMealName(e.target.value)}
                    aria-label="Meal name"
                    style={{
                      flex: 1, minWidth: 0,
                      border: "none", borderBottom: "1px dashed var(--check-border)",
                      background: "transparent", outline: "none",
                      fontFamily: "inherit", fontSize: 14, fontWeight: 800,
                      letterSpacing: "-0.01em", color: "var(--ink)", padding: "2px 0",
                    }}
                  />
                </div>
                <span style={{ fontSize: 12, color: "var(--accent-ink)", fontWeight: 700, flexShrink: 0 }}>{detected.conf}% match</span>
              </div>

              <div style={{ marginTop: 11, display: "flex", flexDirection: "column", gap: 7 }}>
                {detected.items.map((it, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 9,
                    padding: "10px 13px",
                    background: "var(--card-hi)", border: "1px solid var(--line-2)",
                    borderRadius: 12,
                    animation: `popItem .35s ease-out ${i * 0.08}s both`,
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-soft-2)", border: "2px solid var(--accent)", flexShrink: 0 }} />
                    <input value={it.name} onChange={(e) => patchItem(i, { name: e.target.value })} aria-label="Food name" style={{
                      flex: 1, minWidth: 0, border: "none", background: "transparent", outline: "none",
                      fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: "var(--ink)",
                    }} />
                    <input value={it.portion} onChange={(e) => patchItem(i, { portion: e.target.value })} aria-label="Portion" style={{
                      width: 64, flexShrink: 0, textAlign: "right",
                      border: "none", borderBottom: "1px dashed var(--check-border)",
                      background: "transparent", outline: "none",
                      fontFamily: "inherit", fontSize: 12.5, color: "var(--ink-mute)", fontWeight: 700,
                    }} />
                    <input type="number" value={it.cal} onChange={(e) => patchItem(i, { cal: Math.max(0, Number(e.target.value) || 0) })} aria-label="Calories" style={{
                      width: 56, flexShrink: 0, textAlign: "right",
                      border: "none", borderBottom: "1px dashed var(--check-border)",
                      background: "transparent", outline: "none",
                      fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--ink)",
                    }} />
                    <span style={{ fontSize: 11, color: "var(--ink-dim)", fontWeight: 700, flexShrink: 0 }}>kcal</span>
                  </div>
                ))}
              </div>

              <div style={{
                marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "13px 15px", background: "var(--accent-soft)", borderRadius: 13,
              }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--accent-ink)" }}>
                  Total · P{detected.p} · C{detected.c} · F{detected.f}
                </span>
                <span style={{ fontSize: 18, fontWeight: 800, color: "var(--accent-ink)", letterSpacing: "-0.02em" }}>
                  {detected.total} kcal
                </span>
              </div>
            </div>
          )}

          {/* primary action */}
          <button onClick={primaryAction} disabled={isDetecting} style={{
            marginTop: 18, width: "100%", border: "none", borderRadius: 15,
            background: isDetecting ? "var(--accent-soft-2)" : "var(--accent)",
            color: isDetecting ? "var(--accent-ink)" : "#fff",
            fontFamily: "inherit", fontSize: 15.5, fontWeight: 800,
            padding: 15, cursor: isDetecting ? "default" : "pointer",
            letterSpacing: "-0.01em",
          }}>
            {primaryLabel}
          </button>

          {isResults && (
            <div style={{ marginTop: 11, textAlign: "center", fontSize: 12, color: "var(--ink-mute)", fontWeight: 600 }}>
              Tap any name, portion, or calorie value to fix it before logging
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--ink)" }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "var(--ink-mute)", fontWeight: 600, marginTop: 1 }}>{label}</div>
    </div>
  );
}

function PulseDots({ color }: { color: string }) {
  return (
    <span style={{ display: "flex", gap: 4 }}>
      {[0, 0.2, 0.4].map((d) => (
        <span key={d} style={{
          width: 6, height: 6, borderRadius: "50%", background: color,
          animation: `pulse 1s ease-in-out ${d}s infinite`,
        }} />
      ))}
    </span>
  );
}
