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

  return (
    <aside className="sticky top-0 z-30 border-b border-line bg-surface lg:h-dvh lg:w-[260px] lg:shrink-0 lg:border-r lg:border-b-0">
      <div className="flex items-center justify-between gap-2 px-3 py-2 lg:h-full lg:flex-col lg:items-stretch lg:gap-1 lg:px-4 lg:py-6">
        <Link href="/expert" className="hidden px-2 pb-4 lg:block">
          <Logo />
        </Link>
        <nav className="scrollbar-none flex gap-1 overflow-x-auto lg:flex-col">
          {items.map(({ href, label, icon: Icon, exact, badge, alert }) => {
            const on = active(href, exact);
            return (
              <Link
                key={href}
                href={href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex h-11 shrink-0 items-center gap-3 rounded-[12px] px-3 text-[15px] transition-colors duration-150 lg:h-auto lg:px-3.5 lg:py-3 lg:text-[16px]",
                  on ? "bg-primary-soft font-bold text-primary" : "font-medium text-ink-muted hover:bg-canvas",
                )}
              >
                <Icon className="size-5" aria-hidden />
                <span>{label}</span>
                {!!alert && (
                  <span className="ml-auto rounded-full bg-danger px-1.5 text-[13px] font-bold text-white" title={t("overdue")}>
                    {alert}
                  </span>
                )}
                {!!badge && (
                  <span className={cn("rounded-full bg-primary px-1.5 text-[13px] font-bold text-on-primary", !alert && "ml-auto")}>{badge}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-1 lg:mt-auto lg:flex-wrap lg:border-t lg:border-line lg:pt-4">
          <div className="hidden w-full truncate px-1 pb-2 font-bold lg:block">{name}</div>
          <LanguageToggle />
          <ThemeToggle className="hidden sm:inline-flex" />
          <button
            type="button"
            onClick={() => logout()}
            className="inline-flex h-10 items-center gap-1.5 rounded-[12px] px-2 text-[15px] text-ink-muted hover:bg-canvas"
          >
            <LogOutIcon className="size-4" aria-hidden /> <span className="hidden sm:inline">{t("logout")}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
