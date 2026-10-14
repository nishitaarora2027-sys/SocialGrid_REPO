import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Settings } from "@/lib/types";

export const DEFAULT_SETTINGS: Settings = {
  standard_hours: 6,
  urgent_hours: 2,
  revision_hours: 3,
  work_start: "09:00",
  work_end: "21:00",
  work_days: [1, 2, 3, 4, 5, 6, 7],
  timezone: "Asia/Kolkata",
  suggestion_lead_days: 5,
  inactivity_days: 7,
};

export async function getSettings(supabase: SupabaseClient): Promise<Settings> {
  const { data } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle();
  if (!data) return DEFAULT_SETTINGS;
  return {
    ...data,
    standard_hours: Number(data.standard_hours),
    urgent_hours: Number(data.urgent_hours),
    revision_hours: Number(data.revision_hours),
    work_start: String(data.work_start).slice(0, 5),
    work_end: String(data.work_end).slice(0, 5),
  } as Settings;
}
