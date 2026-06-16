/**
 * Mock NL capture parser — faithful port of parse() from Capture Interaction.dc.html.
 *
 * Heuristics (in order):
 *   type:     deadline if submit/assignment/deadline/due/by; event if test/exam/meeting/…;
 *             task if remind/need to/todo (and not event keywords).
 *   category: Studies if academic words; Work if client/work words; else Personal.
 *   due:      detects tomorrow|thursday|today|tonight, a time like 10pm/3:30pm,
 *             or "night" → 10:00 PM; composes "When · Time".
 *   title:    strips "remind me to", trailing date/time phrases, capitalises.
 *
 * Verified against the three spec examples:
 *   "submit assignment by tomorrow night 10pm"        → Deadline / Studies / Tomorrow · 10:00 PM
 *   "remind me tomorrow at 3pm to email the client"   → Task    / Work    / Tomorrow · 3:00 PM
 *   "DSA test scheduled Thursday"                     → Event   / Studies / Thursday · All day
 *
 * Replace this module with an LLM/NLP service call; keep the ParsedItem return shape.
 */

import type { ParsedItem, ItemType, Category } from "@/lib/domain/types";

export function parse(raw: string): ParsedItem {
  const t = raw.toLowerCase();

  // ── type ──────────────────────────────────────────────────────────────────
  let type: ItemType = "task";
  if (/(submit|assignment|deadline|due|by )/.test(t)) type = "deadline";
  if (/(test|exam|meeting|standup|stand-up|lecture|call|appointment|scheduled)/.test(t))
    type = "event";
  if (/(remind|need to|to-do|todo)/.test(t) && !/(test|exam|scheduled)/.test(t))
    type = "task";

  // ── category ──────────────────────────────────────────────────────────────
  let category: Category = "Personal";
  if (/(assignment|study|studies|lecture|exam|test|dsa|class|course|paper|read)/.test(t))
    category = "Studies";
  else if (/(client|invoice|standup|stand-up|work|project|email|pr |retainer|lumen)/.test(t))
    category = "Work";

  // ── due ───────────────────────────────────────────────────────────────────
  let when = "";
  if (/tomorrow/.test(t))      when = "Tomorrow";
  else if (/thursday/.test(t)) when = "Thursday";
  else if (/today|tonight/.test(t)) when = "Today";

  const tmMatch = t.match(/(\d{1,2})\s*(?::(\d{2}))?\s*(am|pm)/);
  let timeStr = "";
  if (tmMatch) {
    timeStr = tmMatch[1] + (tmMatch[2] ? `:${tmMatch[2]}` : ":00") + " " + tmMatch[3].toUpperCase();
  } else if (/night/.test(t)) {
    timeStr = "10:00 PM";
  }

  let due: string;
  if (when && timeStr)  due = `${when} · ${timeStr}`;
  else if (when)        due = `${when} · ${type === "event" ? "All day" : "9:00 AM"}`;
  else if (timeStr)     due = `Today · ${timeStr}`;
  else                  due = "No date";

  // ── title cleanup ─────────────────────────────────────────────────────────
  let title = raw;
  let cl = raw
    .replace(/^(remind me( to)?|please|can you)\s+/i, "")
    .replace(/\b(by|on|at|tomorrow|tonight|today|thursday|next week|night)\b.*$/i, "")
    .replace(/\s+\d{1,2}(:\d{2})?\s*(am|pm)/i, "")
    .trim();

  if (cl.length > 2) {
    title = cl.charAt(0).toUpperCase() + cl.slice(1);
  }

  return { title, type, category, due, due_datetime: null };
}
