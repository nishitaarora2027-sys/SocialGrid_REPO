"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { setLocale } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

/** Always-visible EN / हिं pill */
export function LanguageToggle({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();

  const choose = (l: "en" | "hi") => {
    if (l === locale) return;
    start(async () => {
      await setLocale(l);
      router.refresh();
    });
  };

  return (
    <div
      className={cn("flex items-center rounded-full border border-line bg-surface p-0.5", pending && "opacity-60", className)}
      role="group"
      aria-label="Language / भाषा"
    >
      {(["en", "hi"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => choose(l)}
          aria-pressed={locale === l}
          lang={l}
          className={cn(
            "h-9 min-w-11 rounded-full px-3 text-[14px] font-semibold transition-colors duration-150",
            locale === l ? "bg-primary-soft text-primary" : "text-ink-muted",
          )}
        >
          {l === "en" ? "EN" : "हिं"}
        </button>
      ))}
    </div>
  );
}
