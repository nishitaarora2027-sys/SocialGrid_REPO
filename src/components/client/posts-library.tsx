"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2Icon, DownloadIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OptionPreview } from "@/components/shared/option-preview";
import { DeliveryView, usePostActions } from "@/components/client/delivery-view";
import { formatDate } from "@/lib/format";
import type { ContentOption, ContentType, Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

const FILTERS: { key: string; types: ContentType[] | null }[] = [
  { key: "all", types: null },
  { key: "post", types: ["single_post", "caption_only"] },
  { key: "carousel", types: ["carousel"] },
  { key: "story", types: ["story"] },
  { key: "reel", types: ["reel"] },
  { key: "festival", types: ["festival_greeting"] },
];

export function PostsLibrary({
  options,
  urls,
  businessName,
}: {
  options: ContentOption[];
  urls: Record<string, string>;
  businessName: string;
}) {
  const t = useTranslations("posts");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState<ContentOption | null>(null);
  const types = FILTERS.find((f) => f.key === filter)?.types;
  const shown = types ? options.filter((o) => types.includes(o.content_type)) : options;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-3 py-3 lg:space-y-5 lg:px-10 lg:py-8">
      <h1 className="text-[30px] leading-tight font-bold max-lg:sr-only">{t("title")}</h1>
      <div className="scrollbar-none flex gap-2 overflow-x-auto px-3 lg:px-0">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
            className={cn(
              "min-h-10 shrink-0 rounded-full border px-4 text-[16px] font-semibold transition-colors duration-150",
              filter === f.key ? "border-primary bg-primary text-on-primary" : "border-line bg-surface",
            )}
          >
            {t(`filters.${f.key}`)}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="mx-3 flex flex-col items-center gap-4 rounded-[20px] border border-line bg-surface px-6 py-12 text-center lg:mx-0">
          <p className="text-[18px] font-semibold">{t("empty")}</p>
          <Button asChild>
            <Link href="/chat">{t("askForPost")}</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 px-3 sm:grid-cols-3 lg:grid-cols-4 lg:px-0">
          {shown.map((o) => (
            <PostCard key={o.id} option={o} urls={urls} businessName={businessName} onOpen={() => setOpen(o)} />
          ))}
        </div>
      )}

      <DeliveryView
        option={open}
        urls={urls}
        businessName={businessName}
        open={!!open}
        onOpenChange={(v) => !v && setOpen(null)}
      />
    </main>
  );
}

function PostCard({
  option,
  urls,
  businessName,
  onOpen,
}: {
  option: ContentOption;
  urls: Record<string, string>;
  businessName: string;
  onOpen: () => void;
}) {
  const t = useTranslations("delivery");
  const tTypes = useTranslations("contentTypes");
  const locale = useLocale() as Locale;
  const actions = usePostActions(option, urls, businessName);
  return (
    <div className="flex flex-col gap-2 rounded-[16px] border border-line bg-surface p-2">
      <button type="button" onClick={onOpen} className="relative block text-left">
        <OptionPreview option={option} urls={urls} className="rounded-[12px]" />
        {option.chosen && (
          <CheckCircle2Icon className="absolute bottom-2 left-2 size-6 rounded-full bg-surface text-primary" aria-label={t("chosen")} />
        )}
      </button>
      <button type="button" onClick={onOpen} className="px-1 text-left">
        <div className="truncate text-[16px] font-semibold">{tTypes(option.content_type as never)}</div>
        <div className="text-[14px] text-ink-muted">{option.delivered_at && formatDate(option.delivered_at, locale)}</div>
      </button>
      {actions && actions.items.length > 0 ? (
        <Button variant="outline" className="h-11 text-[16px]" onClick={actions.onDownloadAll} disabled={!!actions.busy}>
          {actions.busy === "download" ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
          {t("download")}
        </Button>
      ) : (
        <Button variant="outline" className="h-11 text-[16px]" onClick={onOpen}>
          {t("open")}
        </Button>
      )}
    </div>
  );
}
