"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2Icon, ImagesIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OptionPreview } from "@/components/shared/option-preview";
import { DeliveryView } from "@/components/client/delivery-view";
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
  const locale = useLocale() as Locale;
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState<ContentOption | null>(null);
  const types = FILTERS.find((f) => f.key === filter)?.types;
  const shown = types ? options.filter((o) => types.includes(o.content_type)) : options;

  return (
    <main className="flex-1 space-y-4 px-4 py-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "min-h-11 shrink-0 rounded-full border-2 px-4 font-semibold",
              filter === f.key ? "border-primary bg-primary text-primary-foreground" : "bg-card",
            )}
          >
            {t(`filters.${f.key}`)}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed px-6 py-12 text-center">
          <ImagesIcon className="size-12 text-muted-foreground" />
          <p className="text-lg font-semibold">{t("empty")}</p>
          <Button asChild>
            <Link href="/chat">{t("askForPost")}</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {shown.map((o) => (
            <button key={o.id} type="button" onClick={() => setOpen(o)} className="space-y-1.5 text-left">
              <div className="relative">
                <OptionPreview option={o} urls={urls} />
                {o.chosen && (
                  <CheckCircle2Icon className="absolute bottom-2 left-2 size-6 rounded-full bg-white text-success" />
                )}
              </div>
              <div className="text-sm text-muted-foreground">{o.delivered_at && formatDate(o.delivered_at, locale)}</div>
            </button>
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
