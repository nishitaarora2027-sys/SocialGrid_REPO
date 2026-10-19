"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2Icon, CheckIcon, CopyIcon, DownloadIcon, FileArchiveIcon, Loader2Icon, PencilIcon, Share2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OptionPreview } from "@/components/shared/option-preview";
import { usePostActions } from "@/components/client/delivery-view";
import type { ContentOption } from "@/lib/types";
import type { ThreadRequest } from "@/lib/thread";
import { cn } from "@/lib/utils";

export const CHANGE_CHIPS = ["different_colours", "shorter_caption", "brighter", "try_hindi"] as const;

export function OptionsCard({
  options,
  request,
  urls,
  revision,
  interactive,
  businessName,
  onChoose,
  onOpen,
  onAskChanges,
}: {
  options: ContentOption[];
  request: ThreadRequest | undefined;
  urls: Record<string, string>;
  revision: number;
  interactive: boolean;
  businessName?: string;
  onChoose?: (optionId: string) => Promise<void>;
  onOpen?: (optionId: string) => void;
  onAskChanges?: () => void;
}) {
  const t = useTranslations("delivery");
  const [pending, start] = useTransition();
  const track = useRef<HTMLDivElement>(null);
  const chosenIndex = options.findIndex((o) => o.chosen);
  const [index, setIndex] = useState(Math.max(0, chosenIndex));
  const superseded = request ? revision < request.current_revision : false;
  const canAct = interactive && !superseded && !!request && ["delivered", "completed"].includes(request.status);
  const current = options[index] ?? options[0];
  const chosen = chosenIndex >= 0 ? options[chosenIndex] : null;
  const actions = usePostActions(chosen && current?.id === chosen.id ? chosen : null, urls, businessName ?? "post");

  const goTo = (i: number) => {
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div
      id={request ? `options-${request.id}` : undefined}
      className={cn(
        "mx-3 flex max-w-[460px] scroll-mt-28 flex-col gap-3 rounded-[20px] border border-line bg-surface p-3.5",
        superseded && "opacity-60",
      )}
    >
      <h3 className="text-[19px] leading-tight font-bold">
        {superseded ? t("olderVersion") : chosen ? t("yourChoice") : t("readyOne")}
      </h3>

      <div
        ref={track}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
        className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto"
      >
        {options.map((o) => (
          <div key={o.id} className="w-full shrink-0 snap-center space-y-2">
            <button type="button" onClick={() => onOpen?.(o.id)} className="relative block w-full text-left" disabled={!onOpen}>
              <OptionPreview option={o} urls={urls} className="rounded-[14px]" />
              {o.chosen && (
                <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[13px] font-bold text-on-primary">
                  <CheckCircle2Icon className="size-4" /> {t("chosen")}
                </span>
              )}
            </button>
            {o.caption && o.media.length > 0 && <p className="line-clamp-3 text-[16px] whitespace-pre-wrap text-ink-muted">{o.caption}</p>}
          </div>
        ))}
      </div>

      {options.length > 1 && (
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex gap-1.5">
            {options.map((o, i) => (
              <button
                key={o.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={t("optionN", { n: i + 1 })}
                aria-current={i === index}
                className="flex size-6 items-center justify-center"
              >
                <span className={cn("size-2 rounded-full", i === index ? "bg-primary" : "bg-line-strong")} />
              </button>
            ))}
          </div>
          <p className="text-[16px] text-ink-muted">{t("optionOf", { n: index + 1, count: options.length })}</p>
        </div>
      )}

      {actions && !superseded ? (
        <div className="grid gap-2">
          {actions.items.length > 0 && (
            <Button size="lg" onClick={actions.onDownloadAll} disabled={!!actions.busy}>
              {actions.busy === "download" ? (
                <Loader2Icon className="animate-spin" />
              ) : actions.items.length > 1 ? (
                <FileArchiveIcon />
              ) : (
                <DownloadIcon />
              )}
              {actions.items.length > 1 ? t("downloadAll", { count: actions.items.length }) : t("download")}
            </Button>
          )}
          <div className="flex gap-2 [&>*]:flex-1">
            {actions.caption && (
              <Button variant="outline" className="text-[16px]" onClick={actions.onCopy}>
                {actions.copied ? <CheckIcon /> : <CopyIcon />}
                {actions.copied ? t("copiedShort") : t("copyCaption")}
              </Button>
            )}
            {actions.items.length > 0 && (
              <Button variant="outline" className="text-[16px]" onClick={actions.onShare} disabled={!!actions.busy}>
                {actions.busy === "share" ? <Loader2Icon className="animate-spin" /> : <Share2Icon />}
                {t("shareShort")}
              </Button>
            )}
          </div>
          {canAct && onAskChanges && (
            <button type="button" onClick={onAskChanges} className="py-1.5 text-[16px] font-semibold text-primary">
              {t("askChanges")}
            </button>
          )}
        </div>
      ) : (
        canAct &&
        !chosen &&
        current && (
          <div className="grid gap-2">
            {onChoose && (
              <Button size="lg" disabled={pending} onClick={() => start(() => onChoose(current.id))}>
                {pending && <Loader2Icon className="animate-spin" />}
                {t("chooseThis")}
              </Button>
            )}
            {onAskChanges && (
              <Button variant="outline" className="text-[17px] font-semibold" onClick={onAskChanges}>
                <PencilIcon /> {t("askChanges")}
              </Button>
            )}
          </div>
        )
      )}
    </div>
  );
}
