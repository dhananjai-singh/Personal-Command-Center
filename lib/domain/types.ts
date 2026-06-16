// ─── Core domain types ────────────────────────────────────────────────────────
// These match both the Supabase schema and the UI state shapes from the README.

export type Category = "Studies" | "Work" | "Personal";
export type ItemType = "task" | "deadline" | "event";
export type ThemeName = "paper" | "cloud" | "blush" | "mist" | "ink";

// ─── Tasks ────────────────────────────────────────────────────────────────────
export interface Task {
  id: string;
  user_id: string;
  title: string;
  type: ItemType;
  category: Category;
  due_datetime: string | null; // ISO 8601
  status: "open" | "done";
  project_id: string | null;
  created_at: string;
  completed_at: string | null;
  last_activity_at: string;
}

// UI-only derived state added on top of Task
export interface TaskWithMeta extends Task {
  isSlipping: boolean; // idle ≥ 3 days
}

// ─── Habits ───────────────────────────────────────────────────────────────────
export interface Habit {
  id: string;
  user_id: string;
  title: string;
  category: Category;
  time_hint: string | null; // e.g. "7:00 AM"
  recurrence: "daily" | "weekly";
  recurrence_detail: string | null;
  created_at: string;
}

export interface HabitCompletion {
  id: string;
  habit_id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
}

// UI view model for a single habit row (Today Dashboard / mobile)
export interface HabitRow {
  habit: Habit;
  done: boolean;
  streak: number;
  week: boolean[]; // last 7 days, index 0 = oldest
}

// ─── Projects ────────────────────────────────────────────────────────────────
export interface Project {
  id: string;
  user_id: string;
  title: string;
  kind: "one_time" | "recurring";
  status: "open" | "done";
  last_activity_at: string;
  created_at: string;
}

// ─── Notes ───────────────────────────────────────────────────────────────────
export interface Note {
  id: string;
  user_id: string;
  title: string | null;
  body: string;
  tag: Category | null;
  pinned: boolean;
  task_id: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

// Transient flag added client-side when a note was just created
export interface NoteWithMeta extends Note {
  fresh?: boolean;
}

// ─── Fitness ─────────────────────────────────────────────────────────────────
export interface Meal {
  id: string;
  user_id: string;
  name: string;
  logged_at: string;
  cal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FitnessDay {
  steps: number;
  step_goal: number;
  distance_km: number;
  active_cal: number;
  resting_hr: number;
  cal_goal: number;
  synced_at: string;
}

// ─── Capture parser output ───────────────────────────────────────────────────
// This is the contract between the parser service and the UI.
export interface ParsedItem {
  title: string;
  type: ItemType;
  category: Category;
  due: string | null;  // human-readable, e.g. "Tomorrow · 10:00 PM"
  due_datetime: string | null; // ISO for persistence
}

// ─── Food parser output ──────────────────────────────────────────────────────
// FoodItem is the UI-layer shape from the food DB (short macro keys p/c/f).
// The Supabase Meal table uses full column names (protein/carbs/fat).
export interface FoodItem {
  per?: string;   // "100g" | "100ml" | "unit" | "slice" (from food DB)
  aliases?: string[];
  name: string;
  portion: string;
  cal: number;
  p: number;  // protein grams
  c: number;  // carbs grams
  f: number;  // fat grams
  est?: boolean; // true = estimated fallback, not a DB match
}

export interface MealDetection {
  name: string;
  conf: number; // 0–100
  items: Array<{ name: string; portion: string; cal: number; p: number; c: number; f: number; est?: boolean }>;
  total: number; // total kcal
  p: number;
  c: number;
  f: number;
  time: string; // "Now" or formatted time
}

// ─── Chat ────────────────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text?: string;
  // For AI messages, the key routes to a canned/structured answer
  key?: "slipping" | "thursday" | "studies3" | "streaks";
  // Structured result items to render as cards
  items?: AiResultItem[];
  intro?: string;
  outro?: string;
}

export interface AiResultItem {
  id: string;
  type: ItemType | "habit" | "note";
  title: string;
  category: Category | null;
  meta: string;       // right-aligned label, e.g. "9 days / idle"
  metaWarning: boolean; // clay color if true
}

// ─── Notes search output ─────────────────────────────────────────────────────
export interface NoteSearchResult {
  answer: string;     // human-readable summary, e.g. "Found 3 notes — top match: "TCP handshake""
  matchIds: string[]; // note ids, best match first
}
