"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { BookOpenIcon, InboxIcon, LogOutIcon, SettingsIcon, UsersIcon } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { logout } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

export function ExpertNav({ name, newCount, overdueCount }: { name: string; newCount: number; overdueCount: number }) {
  const t = useTranslations("expert.nav");
  const pathname = usePathname();
  const items = [
    { href: "/expert", label: t("queue"), icon: InboxIcon, exact: true, badge: newCount, alert: overdueCount },
    { href: "/expert/clients", label: t("clients"), icon: UsersIcon },
    { href: "/expert/library", label: t("library"), icon: BookOpenIcon },
    { href: "/expert/settings", label: t("settings"), icon: SettingsIcon },
  ];
  const active = (href: string, exact?: boolean) =>
    exact ? pathname === href || pathname.startsWith("/expert/requests") : pathname.startsWith(href);

  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

  return (
    <aside className="sticky top-0 z-30 border-b border-line/80 bg-paper/95 backdrop-blur-xl lg:h-dvh lg:w-[260px] lg:shrink-0 lg:border-r lg:border-b-0 lg:bg-canvas/70">
      <div className="flex items-center justify-between gap-2 px-3 py-2 lg:h-full lg:flex-col lg:items-stretch lg:gap-0 lg:px-3 lg:py-5">
        <Link href="/expert" className="hidden px-3 pb-6 lg:block">
          <Logo />
        </Link>
        <p className="hidden px-3 pb-2 text-[12px] font-semibold tracking-wide text-ink-muted uppercase lg:block">{t("workspace")}</p>
        <nav className="scrollbar-none flex min-w-0 flex-1 gap-1 overflow-x-auto lg:flex-none lg:flex-col">
          {items.map(({ href, label, icon: Icon, exact, badge, alert }) => {
            const on = active(href, exact);
            return (
              <Link
                key={href}
                href={href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex h-10 shrink-0 items-center gap-3 rounded-[10px] px-3 text-[15px] transition-colors duration-150 lg:h-auto lg:py-2.5 lg:text-[16px]",
                  on ? "bg-surface font-semibold text-ink shadow-[0_1px_2px_rgb(0_0_0/0.06)] ring-1 ring-line" : "font-medium text-ink-muted hover:bg-surface/60 hover:text-ink",
                )}
              >
                <Icon className={cn("size-5", on && "text-sun")} aria-hidden />
                <span>{label}</span>
                {/* one clear signal: late work in red; otherwise a quiet count of new requests */}
                {alert ? (
                  <span className="ml-auto rounded-full bg-danger px-2 text-[12px] leading-5 font-bold text-white" title={t("overdue")}>
                    {t("lateCount", { count: alert })}
                  </span>
                ) : badge ? (
                  <span className="ml-auto text-[14px] font-semibold text-ink-muted tabular-nums">{badge}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-1 lg:mt-auto lg:flex-col lg:items-stretch lg:gap-3 lg:border-t lg:border-line lg:px-1 lg:pt-4">
          <div className="hidden items-center gap-3 lg:flex">
            <span className="sunset-bg flex size-10 shrink-0 items-center justify-center rounded-full text-[14px] font-bold text-white">{initials}</span>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[15px] font-semibold">{name}</div>
              <div className="text-[13px] text-ink-muted">{t("teamRole")}</div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 lg:flex-wrap">
            <LanguageToggle />
            <ThemeToggle className="hidden sm:inline-flex" />
            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex h-10 items-center gap-1.5 rounded-full px-2.5 text-[15px] text-ink-muted hover:bg-surface"
            >
              <LogOutIcon className="size-4" aria-hidden /> <span className="hidden sm:inline">{t("logout")}</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
