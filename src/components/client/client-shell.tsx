"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarDaysIcon, CircleHelpIcon, LayoutGridIcon, LogOutIcon, MessageCircleIcon, StoreIcon } from "lucide-react";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { Logo, LogoMark } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { logout } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/chat", icon: MessageCircleIcon, short: "chat", long: "chat" },
  { href: "/plan", icon: CalendarDaysIcon, short: "plan", long: "planLong" },
  { href: "/posts", icon: LayoutGridIcon, short: "posts", long: "postsLong" },
  { href: "/brand", icon: StoreIcon, short: "brand", long: "brandLong" },
  { href: "/help", icon: CircleHelpIcon, short: "help", long: "help" },
] as const;

const TITLES: Record<string, string> = { "/plan": "planTitle", "/posts": "postsLong", "/brand": "brandLong", "/help": "help" };

export function BusinessAvatar({ name, logoUrl, className }: { name: string; logoUrl: string | null; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt="" className={cn("size-10 shrink-0 rounded-[12px] border border-line object-cover", className)} />
  ) : (
    <span
      aria-hidden
      className={cn("flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-rose-soft text-[15px] font-bold text-rose-ink", className)}
    >
      {initials || "•"}
    </span>
  );
}

function useActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

/** Laptop: 260px left sidebar */
export function ClientSidebar({
  businessName,
  ownerName,
  logoUrl,
  readyCount,
}: {
  businessName: string;
  ownerName: string;
  logoUrl: string | null;
  readyCount: number;
}) {
  const t = useTranslations("nav");
  const isActive = useActive();
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line/80 bg-canvas/70 px-3 py-5 lg:flex">
      <Link href="/chat" className="mb-6 px-3">
        <Logo />
      </Link>
      <nav className="flex flex-col gap-1">
        {NAV.map(({ href, icon: Icon, long }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[16px] transition-colors duration-150",
                active ? "bg-surface font-semibold text-ink shadow-[0_1px_2px_rgb(0_0_0/0.06)] ring-1 ring-line" : "font-medium text-ink-muted hover:bg-surface/60 hover:text-ink",
              )}
            >
              <Icon className={cn("size-5", active ? "text-primary" : "")} aria-hidden />
              {t(long)}
              {href === "/posts" && readyCount > 0 && <ReadyBadge count={readyCount} className="ml-auto" />}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto space-y-3 border-t border-line pt-4">
        <div className="flex items-center gap-3 px-1">
          <BusinessAvatar name={businessName} logoUrl={logoUrl} />
          <div className="min-w-0">
            <div className="truncate font-bold">{businessName}</div>
            <div className="truncate text-[14px] text-ink-muted">{ownerName}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
          <button
            type="button"
            onClick={() => logout()}
            className="inline-flex items-center gap-1.5 rounded-[12px] px-2 py-2 text-[15px] text-ink-muted hover:bg-canvas"
          >
            <LogOutIcon className="size-4" aria-hidden /> {t("logout")}
          </button>
        </div>
      </div>
    </aside>
  );
}

/** Phone: frosted header. Chat shows who you're talking to; other pages show their title. */
export function ClientHeader({ businessName }: { businessName: string; logoUrl: string | null }) {
  const t = useTranslations("nav");
  const tChat = useTranslations("chat");
  const pathname = usePathname();
  const titleKey = Object.entries(TITLES).find(([p]) => pathname.startsWith(p))?.[1];
  return (
    <header className="glass-bar sticky top-0 z-30 flex items-center gap-3 border-b border-line/70 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 lg:hidden">
      {titleKey ? (
        <h1 className="display min-w-0 flex-1 truncate text-[22px] font-bold">{t(titleKey as never)}</h1>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <LogoMark className="size-10 shrink-0" />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[17px] font-bold">{tChat("teamName")}</div>
            <div className="truncate text-[14px] text-ink-muted">{tChat("teamFor", { business: businessName })}</div>
          </div>
        </div>
      )}
      <LanguageToggle className="shrink-0" />
    </header>
  );
}

/** Phone: five permanent tabs */
export function BottomTabs({ readyCount }: { readyCount: number }) {
  const t = useTranslations("nav");
  const isActive = useActive();
  return (
    <nav
      aria-label={t("menu")}
      className="glass-bar fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line/70 px-1 pt-2 pb-[max(10px,env(safe-area-inset-bottom))] lg:hidden"
    >
      {NAV.map(({ href, icon: Icon, short }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className="flex min-h-14 flex-col items-center justify-center"
          >
            <span
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-[14px] px-2.5 py-1.5 transition-colors duration-150",
                active && "bg-primary-soft",
              )}
            >
              <Icon className={cn("size-6", active ? "text-primary" : "text-ink-muted")} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
              <span className={cn("text-[15px] leading-none", active ? "font-bold text-primary" : "font-medium text-ink-muted")}>
                {t(short)}
              </span>
              {href === "/posts" && readyCount > 0 && <ReadyBadge count={readyCount} className="absolute -top-1 right-0" />}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function ReadyBadge({ count, className }: { count: number; className?: string }) {
  const t = useTranslations("nav");
  return (
    <span
      aria-label={t("readyCount", { count })}
      className={cn("flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[13px] leading-5 font-bold text-on-primary", className)}
    >
      {count}
    </span>
  );
}
