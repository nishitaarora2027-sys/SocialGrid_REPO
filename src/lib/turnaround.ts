import { fromZonedTime, toZonedTime } from "date-fns-tz";
import type { Settings } from "@/lib/types";

export type TurnaroundKind = "standard" | "urgent" | "revision";

export type WorkingHours = Pick<Settings, "work_start" | "work_end" | "work_days" | "timezone">;

export function targetHours(settings: Settings, kind: TurnaroundKind) {
  if (kind === "urgent") return Number(settings.urgent_hours);
  if (kind === "revision") return Number(settings.revision_hours);
  return Number(settings.standard_hours);
}

function parseTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return { h: h || 0, m: m || 0 };
}

/** ISO weekday (1 = Monday ... 7 = Sunday) of a zoned date */
function isoWeekday(d: Date) {
  const day = d.getDay();
  return day === 0 ? 7 : day;
}

/**
 * Adds `hours` of working time to `start`, counting only minutes inside the
 * configured working window on working days (in the configured timezone).
 */
export function addWorkingHours(start: Date, hours: number, wh: WorkingHours): Date {
  let remaining = Math.round(hours * 60) * 60_000;
  const open = parseTime(wh.work_start);
  const close = parseTime(wh.work_end);
  const workDays = wh.work_days.length ? wh.work_days : [1, 2, 3, 4, 5, 6, 7];
  let cursor = start.getTime();

  for (let i = 0; i < 400; i++) {
    const local = toZonedTime(new Date(cursor), wh.timezone);
    const y = local.getFullYear();
    const mo = local.getMonth();
    const d = local.getDate();

    if (workDays.includes(isoWeekday(local))) {
      const windowStart = fromZonedTime(new Date(y, mo, d, open.h, open.m), wh.timezone).getTime();
      let windowEnd = fromZonedTime(new Date(y, mo, d, close.h, close.m), wh.timezone).getTime();
      if (windowEnd <= windowStart) windowEnd = windowStart + 24 * 3600_000; // open all day
      if (cursor < windowStart) cursor = windowStart;
      if (cursor < windowEnd) {
        const available = windowEnd - cursor;
        if (remaining <= available) return new Date(cursor + remaining);
        remaining -= available;
      }
    }
    // jump to local midnight of the next day
    cursor = fromZonedTime(new Date(y, mo, d + 1, 0, 0), wh.timezone).getTime();
  }
  return new Date(cursor + remaining);
}

export function computeDueAt(settings: Settings, kind: TurnaroundKind, from = new Date()) {
  return addWorkingHours(from, targetHours(settings, kind), settings);
}

/** "on_time" | "soon" (under 1 hour) | "overdue" — drives green/amber/red in the queue */
export function urgencyLevel(dueAt: string | Date, now = new Date()) {
  const ms = new Date(dueAt).getTime() - now.getTime();
  if (ms < 0) return "overdue" as const;
  if (ms < 60 * 60_000) return "soon" as const;
  return "on_time" as const;
}
