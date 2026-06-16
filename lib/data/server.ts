import "server-only";
import { getServiceClient, getDevUserId } from "@/lib/supabase/admin";
import type { ParsedItem } from "@/lib/domain/types";

/**
 * Server-side data access for the dev single-user. Every function degrades
 * gracefully: if Supabase isn't configured (or the table doesn't exist yet),
 * reads return empty/null and writes return null instead of throwing, so the
 * UI keeps working off local/mock state.
 */

export interface UserContext {
  tasks: Array<Record<string, unknown>>;
  habits: Array<Record<string, unknown>>;
  projects: Array<Record<string, unknown>>;
  notes: Array<Record<string, unknown>>;
}

/** Pull a compact snapshot of the user's data for the Ask-AI grounding. */
export async function fetchUserContext(): Promise<UserContext | null> {
  const sb = getServiceClient();
  const uid = await getDevUserId();
  if (!sb || !uid) return null;

  try {
    const [tasks, habits, projects, notes] = await Promise.all([
      sb.from("tasks")
        .select("title,type,category,due_datetime,status,last_activity_at")
        .eq("user_id", uid).limit(200),
      sb.from("habits")
        .select("title,category,recurrence,time_hint").eq("user_id", uid).limit(100),
      sb.from("projects")
        .select("title,kind,status,last_activity_at").eq("user_id", uid).limit(100),
      sb.from("notes")
        .select("title,body,tag,pinned").eq("user_id", uid).limit(100),
    ]);

    return {
      tasks: tasks.data ?? [],
      habits: habits.data ?? [],
      projects: projects.data ?? [],
      notes: notes.data ?? [],
    };
  } catch {
    return null;
  }
}

/** True if the context has any rows worth grounding an answer on. */
export function hasData(ctx: UserContext | null): ctx is UserContext {
  return Boolean(
    ctx &&
      (ctx.tasks.length || ctx.habits.length || ctx.projects.length || ctx.notes.length),
  );
}

/** Persist a parsed capture as a task. Returns the new row id, or null. */
export async function saveTask(
  item: ParsedItem & { recurrence?: string | null; project_id?: string | null },
): Promise<string | null> {
  const sb = getServiceClient();
  const uid = await getDevUserId();
  if (!sb || !uid) return null;

  try {
    const { data, error } = await sb
      .from("tasks")
      .insert({
        user_id: uid,
        title: item.title,
        type: item.type,
        category: item.category,
        due_datetime: item.due_datetime,
        project_id: item.project_id ?? null,
        status: "open",
      })
      .select("id")
      .single();
    if (error || !data) return null;
    return data.id as string;
  } catch {
    return null;
  }
}

export interface MealInput {
  name: string;
  cal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Persist a logged meal. Returns the new row id, or null. */
export async function saveMeal(meal: MealInput): Promise<string | null> {
  const sb = getServiceClient();
  const uid = await getDevUserId();
  if (!sb || !uid) return null;

  try {
    const { data, error } = await sb
      .from("meals")
      .insert({
        user_id: uid,
        name: meal.name,
        cal: Math.round(meal.cal),
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
      })
      .select("id")
      .single();
    if (error || !data) return null;
    return data.id as string;
  } catch {
    return null;
  }
}
