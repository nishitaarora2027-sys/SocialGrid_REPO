"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { MoonIcon, SunIcon } from "lucide-react";
import { setTheme } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const isDark = () => document.documentElement.classList.contains("dark");
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

/** Light / Dark switch; flips the class at once and remembers it in a cookie */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations("nav");
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  const flip = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    void setTheme(next ? "dark" : "light");
  };

  const Icon = dark ? SunIcon : MoonIcon;
  return (
    <button
      type="button"
      onClick={flip}
      aria-pressed={dark}
      className={cn("inline-flex items-center gap-1.5 rounded-[12px] px-2 py-2 text-[15px] text-ink-muted hover:bg-canvas", className)}
    >
      <Icon className="size-4" aria-hidden />
      {dark ? t("light") : t("dark")}
    </button>
  );
}
