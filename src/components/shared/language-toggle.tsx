"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { LanguagesIcon } from "lucide-react";
import { setLocale } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

/** Always-visible English / हिंदी switch */
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
      className={cn("flex h-11 items-center rounded-full border-2 bg-card p-0.5", pending && "opacity-60", className)}
      role="group"
      aria-label="Language / भाषा"
    >
      <LanguagesIcon className="mx-1.5 hidden size-4 text-muted-foreground sm:block" aria-hidden />
      {(["en", "hi"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => choose(l)}
          aria-pressed={locale === l}
          className={cn(
            "h-full rounded-full px-2.5 text-sm font-bold transition-colors sm:px-3",
            locale === l ? "bg-primary text-primary-foreground" : "text-muted-foreground",
          )}
        >
          {l === "en" ? "English" : "हिंदी"}
        </button>
      ))}
    </div>
  );
}
