"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatDue } from "@/lib/format";
import type { Locale, MessagePayload } from "@/lib/types";

/** Renders a system message stored as i18n key + params in the viewer's language */
export function useSystemText() {
  const t = useTranslations("system");
  const tTypes = useTranslations("contentTypes");
  const locale = useLocale() as Locale;

  return (payload: MessagePayload) => {
    const key = payload.i18nKey;
    if (!key) return "";
    const p = payload.params ?? {};
    const values: Record<string, string | number> = { ...p };
    if (typeof p.due === "string") values.due = formatDue(p.due, locale);
    if ("topic_en" in p) values.topic = String(p[`topic_${locale}`] ?? p.topic_en);
    if (typeof p.type === "string") values.type = tTypes(p.type as never);
    try {
      return t(key as never, values as never);
    } catch {
      return key;
    }
  };
}
