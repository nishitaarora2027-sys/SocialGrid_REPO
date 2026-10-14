"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { HelpCircleIcon, ImagesIcon, LogOutIcon, MenuIcon, MessageCircleIcon, StoreIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { logout } from "@/lib/actions/auth";

export function ClientHeader({
  businessName,
  logoUrl,
  readyCount,
}: {
  businessName: string;
  logoUrl: string | null;
  readyCount: number;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-card/95 px-3 py-2 backdrop-blur">
      <Link href="/chat" className="flex min-w-0 flex-1 items-center gap-2.5">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="size-11 shrink-0 rounded-full border object-cover" />
        ) : (
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
            {businessName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div className="line-clamp-2 text-[15px] leading-tight font-bold break-words">{businessName}</div>
          {readyCount > 0 && pathname !== "/posts" && (
            <div className="text-sm font-semibold text-success">{t("readyCount", { count: readyCount })}</div>
          )}
        </div>
      </Link>
      <LanguageToggle className="shrink-0" />
      <DropdownMenu>
        <DropdownMenuTrigger className="relative flex h-11 shrink-0 items-center gap-1 rounded-xl border-2 bg-card px-2.5 text-sm font-semibold">
          <MenuIcon className="size-5" />
          <span className="sr-only sm:not-sr-only">{t("menu")}</span>
          {readyCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-success text-xs font-bold text-white">
              {readyCount}
            </span>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href="/chat">
              <MessageCircleIcon /> {t("chat")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/posts">
              <ImagesIcon /> {t("posts")}
              {readyCount > 0 && (
                <span className="ml-auto rounded-full bg-success px-2 text-xs font-bold text-white">{readyCount}</span>
              )}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/brand">
              <StoreIcon /> {t("brand")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/help">
              <HelpCircleIcon /> {t("help")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => logout()}>
            <LogOutIcon /> {t("logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
