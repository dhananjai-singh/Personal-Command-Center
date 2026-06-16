/**
 * Mock Ask AI canned answers — faithful port of pickKey() + answers + suggestionDefs
 * from both Ask AI Mobile.dc.html and Ask AI.dc.html (desktop).
 *
 * Replace with a real LLM + retrieval pipeline.
 */

export type AiKey = "slipping" | "thursday" | "studies3" | "streaks";

export interface AiCard {
  title: string;
  type: "task" | "deadline" | "event" | "project";
  category: "Studies" | "Work" | "Personal";
  sub: string;
  meta: string;
  metaSub: string;
  warn: boolean;
}

export interface AiAnswer {
  intro: string;
  cards: AiCard[];
  outro: string;
}

export const ANSWERS: Record<AiKey, AiAnswer> = {
  slipping: {
    intro: "Three things have gone quiet for 3+ days. Nudging them up so they don't disappear:",
    cards: [
      { title: "Budgeting side-app",               type: "project",  category: "Personal", sub: "Project · one-time",   meta: "9 days",    metaSub: "no activity", warn: true },
      { title: "Portfolio redesign",                type: "project",  category: "Studies",  sub: "Project · one-time",   meta: "6 days",    metaSub: "no activity", warn: true },
      { title: "Read distributed-systems paper",    type: "task",     category: "Work",     sub: "Task · unscheduled",   meta: "4 days",    metaSub: "no activity", warn: true },
    ],
    outro: "Budgeting side-app is the oldest. Want me to pull its open tasks?",
  },
  thursday: {
    intro: "Here's everything on Thursday, June 12:",
    cards: [
      { title: "OS unit test",      type: "event", category: "Studies",  sub: "Event",           meta: "9:00 AM",  metaSub: "Thu", warn: false },
      { title: "Networks lecture",  type: "event", category: "Studies",  sub: "Event · recurring", meta: "1:30 PM", metaSub: "Thu", warn: false },
      { title: "Gym",               type: "event", category: "Personal", sub: "Routine",          meta: "6:00 PM",  metaSub: "Thu", warn: false },
    ],
    outro: "Your morning is heaviest — the OS test is the only graded item.",
  },
  studies3: {
    intro: "Everything in Studies due within the next 3 days:",
    cards: [
      { title: "Finish DBMS problem set 4", type: "task",     category: "Studies", sub: "Task",     meta: "Today",    metaSub: "5:00 PM",  warn: true },
      { title: "ML project report",         type: "deadline", category: "Studies", sub: "Deadline", meta: "Tomorrow", metaSub: "10:00 PM", warn: true },
      { title: "OS unit test",              type: "event",    category: "Studies", sub: "Event",    meta: "Thu",      metaSub: "9:00 AM",  warn: false },
    ],
    outro: "Two are due before tomorrow night. The DBMS set is closest.",
  },
  streaks: {
    intro: "Your routines are holding well — here are the live streaks:",
    cards: [
      { title: "Meditate 10 min", type: "task", category: "Personal", sub: "Daily · done today", meta: "21 days", metaSub: "best streak", warn: false },
      { title: "Plan tomorrow",   type: "task", category: "Work",     sub: "Daily",              meta: "16 days", metaSub: "current",     warn: false },
      { title: "Inbox to zero",   type: "task", category: "Work",     sub: "Weekday",            meta: "5 days",  metaSub: "current",     warn: false },
    ],
    outro: "Meditation is your strongest habit. Inbox-to-zero is most at risk — it missed Monday.",
  },
};

export const SUGGESTION_DEFS: Array<{ label: string; key: AiKey }> = [
  { label: "What do I have Thursday?",   key: "thursday" },
  { label: "Studies due in 3 days",      key: "studies3" },
  { label: "How are my streaks?",        key: "streaks" },
  { label: "What's slipping this week?", key: "slipping" },
];

export function pickKey(text: string): AiKey {
  const t = text.toLowerCase();
  if (/slip|neglect|forgot|behind/.test(t)) return "slipping";
  if (/thursday|thu\b/.test(t))             return "thursday";
  if (/streak|habit|routine/.test(t))       return "streaks";
  if (/studies|study|assignment|3 days|three days|due/.test(t)) return "studies3";
  return "slipping";
}
