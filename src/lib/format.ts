import type { Locale } from "@/lib/types";

// Dates are formatted by hand instead of with Intl/toLocaleString: browsers and Node ship
// different ICU data (e.g. "अक्टूबर" vs "अक्तूबर"), which breaks hydration and looks
// inconsistent across phones. India has no daylight saving, so a fixed offset is exact.

const IST_OFFSET_MS = 330 * 60_000;

const MONTHS: Record<Locale, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  hi: ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"],
};
const MONTHS_LONG_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS: Record<Locale, string[]> = {
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  hi: ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"],
};
const WEEKDAYS_SHORT: Record<Locale, string[]> = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  hi: ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"],
};

/** Calendar parts of an instant, in IST */
function ist(input: string | Date) {
  const d = new Date(new Date(input).getTime() + IST_OFFSET_MS);
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth(),
    d: d.getUTCDate(),
    wd: d.getUTCDay(),
    h: d.getUTCHours(),
    min: d.getUTCMinutes(),
  };
}

function dayKey(input: string | Date) {
  const p = ist(input);
  return `${p.y}-${String(p.m + 1).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

/** "6:00 PM" / "शाम 6:00 बजे" */
export function formatTime(iso: string | Date, locale: Locale) {
  const { h, min } = ist(iso);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = String(min).padStart(2, "0");
  if (locale === "hi") {
    const part = h >= 4 && h < 12 ? "सुबह" : h >= 12 && h < 16 ? "दोपहर" : h >= 16 && h < 20 ? "शाम" : "रात";
    return `${part} ${h12}:${mm} बजे`;
  }
  return `${h12}:${mm} ${h < 12 ? "AM" : "PM"}`;
}

/** "17 Oct 2026" / "17 अक्टूबर 2026" */
export function formatDate(iso: string | Date, locale: Locale) {
  const p = ist(iso);
  return `${p.d} ${MONTHS[locale][p.m]} ${p.y}`;
}

/** "17 Oct, 6:00 PM" */
export function formatDateTime(iso: string | Date, locale: Locale) {
  const p = ist(iso);
  return `${p.d} ${MONTHS[locale][p.m]}, ${formatTime(iso, locale)}`;
}

/** "Wednesday, 14 October" / "बुधवार, 14 अक्टूबर" */
export function formatLongDate(iso: string | Date, locale: Locale) {
  const p = ist(iso);
  const month = locale === "hi" ? MONTHS.hi[p.m] : MONTHS_LONG_EN[p.m];
  return `${WEEKDAYS[locale][p.wd]}, ${p.d} ${month}`;
}

/** "6:00 PM today" / "आज शाम 6:00 बजे तक" / "Fri 17 Oct, 11:00 AM" */
export function formatDue(iso: string, locale: Locale, now = new Date()) {
  const time = formatTime(iso, locale);
  const tomorrow = new Date(now.getTime() + 24 * 3600_000);
  if (dayKey(iso) === dayKey(now)) return locale === "hi" ? `आज ${time} तक` : `${time} today`;
  if (dayKey(iso) === dayKey(tomorrow)) return locale === "hi" ? `कल ${time} तक` : `tomorrow ${time}`;
  const p = ist(iso);
  const date = `${WEEKDAYS_SHORT[locale][p.wd]} ${p.d} ${MONTHS[locale][p.m]}`;
  return locale === "hi" ? `${date}, ${time} तक` : `${date}, ${time}`;
}

/** "2h 15m" left, or "-35m" when overdue */
export function formatTimeLeft(iso: string, now = new Date()) {
  const ms = new Date(iso).getTime() - now.getTime();
  const sign = ms < 0 ? "-" : "";
  const mins = Math.floor(Math.abs(ms) / 60_000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h >= 24) return `${sign}${Math.floor(h / 24)}d ${h % 24}h`;
  return h > 0 ? `${sign}${h}h ${m}m` : `${sign}${m}m`;
}

export type DayPart = "morning" | "afternoon" | "evening";
export function dayPart(now = new Date()): DayPart {
  const { h } = ist(now);
  if (h >= 4 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  return "evening";
}

/** Today's date in IST as YYYY-MM-DD */
export function todayIST(now = new Date()) {
  return dayKey(now);
}

/** Monday of the IST week containing `now`, as YYYY-MM-DD */
export function weekStartIST(now = new Date()) {
  const [y, m, d] = todayIST(now).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = (date.getUTCDay() + 6) % 7; // 0 = Monday
  date.setUTCDate(date.getUTCDate() - dow);
  return date.toISOString().slice(0, 10);
}

/** Indian digit grouping: 1500000 → "15,00,000" */
export function formatINR(n: number) {
  const [int, dec] = Math.abs(n).toFixed(2).replace(/\.00$/, "").split(".");
  const last3 = int.slice(-3);
  const rest = int.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${n < 0 ? "-" : ""}${rest ? `${rest},${last3}` : last3}${dec ? `.${dec}` : ""}`;
}

export function formatPrice(price: number | null | undefined) {
  if (price == null) return "";
  return `₹${formatINR(Number(price))}`;
}

export function isoDaysAgo(days: number, now = new Date()) {
  return new Date(now.getTime() - days * 24 * 3600_000).toISOString();
}

/** "today" / "yesterday" (IST) or null for older dates */
export function relativeDay(iso: string, now = new Date()): "today" | "yesterday" | null {
  const d = dayKey(iso);
  if (d === dayKey(now)) return "today";
  if (d === dayKey(new Date(now.getTime() - 24 * 3600_000))) return "yesterday";
  return null;
}

/** Same IST calendar day? */
export function sameDay(a: string, b: string) {
  return dayKey(a) === dayKey(b);
}

/** True once the instant has passed */
export function isPast(iso: string, now = new Date()) {
  return new Date(iso).getTime() < now.getTime();
}
