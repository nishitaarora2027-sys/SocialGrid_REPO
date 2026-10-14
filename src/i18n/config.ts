import type { Locale } from "@/lib/types";

export const LOCALES: Locale[] = ["en", "hi"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function resolveLocale(value: string | undefined | null): Locale {
  return value === "hi" ? "hi" : "en";
}

/** Picks the English or Hindi variant of a bilingual DB field */
export function pick<T extends Record<string, unknown>>(obj: T, base: string, locale: Locale): string {
  const v = obj[`${base}_${locale}`] ?? obj[`${base}_en`];
  return typeof v === "string" ? v : "";
}
