"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2Icon, HeartHandshakeIcon, PointerIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OptionPreview } from "@/components/shared/option-preview";
import type { ContentOption } from "@/lib/types";
import type { ThreadRequest } from "@/lib/thread";
import { cn } from "@/lib/utils";

export const CHANGE_CHIPS = ["try_hindi", "shorter_caption", "different_colours", "brighter"] as const;

export function OptionsCard({
  options,
  request,
  urls,
  revision,
  interactive,
  onChoose,
  onOpen,
  onChip,
}: {
  options: ContentOption[];
  request: ThreadRequest | undefined;
  urls: Record<string, string>;
  revision: number;
  interactive: boolean;
  onChoose?: (optionId: string) => Promise<void>;
  onOpen?: (optionId: string) => void;
  onChip?: (chip: string) => void;
}) {
  const t = useTranslations("delivery");
  const tChips = useTranslations("chips");
  const [pending, start] = useTransition();
  const superseded = request ? revision < request.current_revision : false;
  const canAct = interactive && !superseded && request && ["delivered", "completed"].includes(request.status);
  const chips = ["looks_good", "make_changes", ...CHANGE_CHIPS.slice(0, 3)];

  return (
    <div className={cn("mx-2 space-y-3 rounded-3xl border-2 border-primary/20 bg-card p-3 shadow-md", superseded && "opacity-60")}>
      <div className="px-1">
        <div className="text-lg font-bold">
          {superseded ? t("olderVersion") : options.length > 1 ? t("readyPickOne", { count: options.length }) : t("readyOne")}
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <HeartHandshakeIcon className="size-4" /> {t("madeByTeam")}
        </div>
      </div>

      <div className="scrollbar-none -mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-1">
        {options.map((o, i) => (
          <div
            key={o.id}
            className={cn(
              "flex shrink-0 snap-center flex-col gap-2 rounded-2xl border-2 bg-background p-2",
              options.length > 1 ? "w-[78%] sm:w-[46%]" : "w-full",
              o.chosen && "border-success",
            )}
          >
            <button type="button" onClick={() => onOpen?.(o.id)} className="text-left" disabled={!onOpen}>
              {options.length > 1 && <div className="mb-1 px-1 text-sm font-bold text-muted-foreground">{t("optionN", { n: i + 1 })}</div>}
              <OptionPreview option={o} urls={urls} />
            </button>
            {o.caption && <p className="line-clamp-3 px-1 text-[15px] whitespace-pre-wrap">{o.caption}</p>}
            {o.chosen ? (
              <Button variant="success" onClick={() => onOpen?.(o.id)} disabled={!onOpen}>
                <CheckCircle2Icon /> {t("yourChoiceOpen")}
              </Button>
            ) : (
              canAct &&
              onChoose && (
                <Button disabled={pending} onClick={() => start(() => onChoose(o.id))}>
                  <PointerIcon /> {t("chooseThis")}
                </Button>
              )
            )}
          </div>
        ))}
      </div>
      {options.length > 1 && <p className="text-center text-xs text-muted-foreground">{t("swipeHint")}</p>}

      {canAct && onChip && (
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChip(c)}
              className="min-h-11 rounded-full border-2 border-primary/30 bg-secondary px-4 text-sm font-semibold text-secondary-foreground active:scale-95"
            >
              {tChips(c as never)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
