"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { BookOpenIcon, InboxIcon, LogOutIcon, SettingsIcon, UsersIcon } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { LanguageToggle } from "@/components/shared/language-toggle";
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
    <aside className="sticky top-0 z-30 border-b bg-card lg:h-dvh lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0">
      <div className="flex items-center justify-between gap-2 px-3 py-2 lg:h-full lg:flex-col lg:items-start lg:gap-4 lg:px-4 lg:py-5">
        <Logo className="hidden lg:flex" />
        <nav className="scrollbar-none flex gap-1 overflow-x-auto lg:w-full lg:flex-col">
          {items.map(({ href, label, icon: Icon, exact, badge, alert }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold lg:text-base",
                active(href, exact) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
              )}
            >
              <Icon className="size-5" />
              <span>{label}</span>
              {!!alert && (
                <span className="ml-auto rounded-full bg-destructive px-1.5 text-xs text-white" title={t("overdue")}>
                  {alert}
                </span>
              )}
              {!!badge && (
                <span className={cn("rounded-full bg-success px-1.5 text-xs text-white", !alert && "ml-auto")}>{badge}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 lg:mt-auto lg:w-full lg:flex-col lg:items-start">
          <LanguageToggle />
          <div className="hidden text-sm text-muted-foreground lg:block">{name}</div>
          <button
            type="button"
            onClick={() => logout()}
            className="flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:bg-accent"
          >
            <LogOutIcon className="size-5" /> <span className="hidden sm:inline">{t("logout")}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
