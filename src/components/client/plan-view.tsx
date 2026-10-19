"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowLeftIcon, ArrowRightIcon, PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { respondSuggestion } from "@/lib/actions/client";
import { formatDue } from "@/lib/format";
import type { Locale, PlanSlot, RequestRow, Suggestion } from "@/lib/types";
import { cn } from "@/lib/utils";

type SlotRequest = Pick<RequestRow, "id" | "status" | "due_at" | "summary">;

const MONTHS: Record<Locale, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  hi: ["जन", "फ़र", "मार्च", "अप्रैल", "मई", "जून", "जुला", "अग", "सित", "अक्टू", "नव", "दिस"],
};

function dayDate(weekStart: string, day: number) {
  const d = new Date(`${weekStart}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + day);
  return { ymd: d.toISOString().slice(0, 10), date: d.getUTCDate(), month: d.getUTCMonth() };
}

export function PlanView({
  weekStart,
  today,
  offset,
  slots,
  requests,
  festival,
  canRequest,
}: {
  weekStart: string;
  today: string;
  offset: number;
  slots: PlanSlot[];
  requests: Record<string, SlotRequest>;
  festival: Suggestion | null;
  canRequest: boolean;
}) {
  const t = useTranslations("plan");
  const tWeek = useTranslations("week");
  const tTypes = useTranslations("contentTypes");
  const locale = useLocale() as Locale;
  const days = tWeek.raw("days") as string[];
  const week = Array.from({ length: 7 }, (_, i) => ({ i, ...dayDate(weekStart, i) }));
  const first = week[0];
  const last = week[6];
  const range =
    first.month === last.month
      ? `${first.date} – ${last.date} ${MONTHS[locale][last.month]}`
      : `${first.date} ${MONTHS[locale][first.month]} – ${last.date} ${MONTHS[locale][last.month]}`;
  const byDay = (d: number) => slots.filter((s) => s.day === d);

  const weekNav = (
    <div className="flex items-center gap-2">
      <Button asChild variant="outline" size="sm" className="h-11">
        <Link href={`/plan?week=${offset - 1}`} scroll={false}>
          <ArrowLeftIcon /> <span className="max-lg:sr-only">{t("lastWeek")}</span>
        </Link>
      </Button>
      <span className="px-1 text-[17px] font-semibold whitespace-nowrap">{range}</span>
      <Button asChild variant="outline" size="sm" className="h-11">
        <Link href={`/plan?week=${offset + 1}`} scroll={false}>
          <span className="max-lg:sr-only">{t("nextWeek")}</span> <ArrowRightIcon />
        </Link>
      </Button>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col">
      {/* laptop */}
      <main className="hidden flex-col gap-[18px] px-10 py-8 lg:flex">
        <div className="flex items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-[30px] leading-tight font-bold">{t("title")}</h1>
            <p className="text-[17px] text-ink-muted">{t("subtitle", { count: slots.length })}</p>
          </div>
          {weekNav}
        </div>
        {festival && offset === 0 && <FestivalCard suggestion={festival} canRequest={canRequest} />}
        <div className="grid grid-cols-[repeat(7,minmax(0,1fr))] gap-2.5">
          {week.map((d) => {
            const isToday = d.ymd === today;
            const items = byDay(d.i);
            return (
              <section
                key={d.i}
                className={cn(
                  "flex min-h-64 flex-col gap-2.5 rounded-[16px] bg-surface p-3",
                  isToday ? "border border-primary" : "border border-line",
                )}
              >
                <header>
                  <div className="text-[17px] font-bold">{days[d.i]}</div>
                  <div className="text-[15px] text-ink-muted">
                    {d.date} {MONTHS[locale][d.month]}
                    {isToday && ` · ${t("today")}`}
                  </div>
                </header>
                {items.map((s) => (
                  <div key={s.id} className="flex flex-col gap-1.5 rounded-[12px] bg-paper p-2">
                    <div className="text-[16px] leading-snug font-semibold">{slotTitle(s)}</div>
                    <SlotChips slot={s} request={s.request_id ? requests[s.request_id] : undefined} small />
                    <SlotAction slot={s} />
                  </div>
                ))}
                {items.length === 0 && canRequest && (
                  <Link
                    href="/chat"
                    className="flex min-h-[110px] items-center justify-center rounded-[12px] border-[1.5px] border-dashed border-line-strong text-[15px] font-semibold text-ink-muted hover:bg-canvas"
                  >
                    <PlusIcon className="mr-1 size-4" /> {t("addPost")}
                  </Link>
                )}
              </section>
            );
          })}
        </div>
      </main>

      {/* phone */}
      <main className="flex flex-1 flex-col gap-1.5 px-3 py-2.5 lg:hidden">
        <div className="flex items-center justify-between gap-2 py-1">
          <span className="text-[16px] font-semibold">{range}</span>
          <span className="text-[16px] text-ink-muted">{t("planned", { count: slots.length })}</span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {week.map((d) => {
            const isToday = d.ymd === today;
            return (
              <button
                key={d.i}
                type="button"
                onClick={() => document.getElementById(`plan-day-${d.i}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
                aria-current={isToday ? "date" : undefined}
                className={cn(
                  "flex flex-col items-center rounded-[12px] py-1.5",
                  isToday ? "bg-primary text-on-primary" : "border border-line bg-surface",
                )}
              >
                <span className={cn("text-[14px]", !isToday && "text-ink-muted")}>{days[d.i].slice(0, locale === "hi" ? 3 : 1)}</span>
                <span className="text-[17px] font-bold">{d.date}</span>
              </button>
            );
          })}
        </div>
        {festival && offset === 0 && <FestivalCard suggestion={festival} canRequest={canRequest} />}
        <div className="mt-1.5 flex flex-col gap-1.5">
          {slots.length === 0 && <p className="py-8 text-center text-[17px] text-ink-muted">{t("empty")}</p>}
          {week.flatMap((d) =>
            byDay(d.i).map((s, k) => (
              <div
                key={s.id}
                id={k === 0 ? `plan-day-${d.i}` : undefined}
                className="flex scroll-mt-24 items-start gap-3.5 rounded-[16px] border border-line bg-surface px-3.5 py-2.5"
              >
                <div className="w-12 shrink-0">
                  <div className="text-[16px] font-bold">{days[d.i]}</div>
                  <div className="text-[14px] text-ink-muted">
                    {d.date} {MONTHS[locale][d.month]}
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="text-[17px] leading-snug font-semibold">{slotTitle(s)}</div>
                  <SlotChips slot={s} request={s.request_id ? requests[s.request_id] : undefined} />
                  <SlotAction slot={s} />
                </div>
                {canRequest && (
                  <Link href="/chat" className="shrink-0 py-0.5 text-[15px] font-semibold text-primary">
                    {t("change")}
                  </Link>
                )}
              </div>
            )),
          )}
        </div>
        <div className="flex-1" />
        {canRequest && (
          <div className="sticky bottom-[var(--tabbar-h)] bg-paper pt-2 pb-1">
            <Button asChild className="w-full">
              <Link href="/chat">
                <PlusIcon /> {t("addToWeek")}
              </Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );

  function slotTitle(s: PlanSlot) {
    return s.goal?.trim() || tTypes(s.type as never);
  }
}

function SlotChips({ slot, request, small }: { slot: PlanSlot; request?: SlotRequest; small?: boolean }) {
  const t = useTranslations("plan");
  const tTypes = useTranslations("contentTypes");
  const locale = useLocale() as Locale;
  const making = slot.status === "in_progress" || (request && ["new", "in_progress", "revision_requested"].includes(request.status));
  const ready = slot.status === "done" || (request && ["delivered", "completed"].includes(request.status));
  const size = small ? "text-[13px] px-2 py-0.5" : "text-[14px] px-2.5 py-0.5";
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className={cn("rounded-full border border-line", size)}>{tTypes(slot.type as never)}</span>
      {ready ? (
        <span className={cn("rounded-full bg-primary-soft font-semibold text-primary", size)}>{t("ready")}</span>
      ) : making ? (
        <span className={cn("rounded-full bg-status-soft font-semibold text-status-ink", size)}>
          {request ? t("makingBy", { time: formatDue(request.due_at, locale) }) : t("making")}
        </span>
      ) : slot.status === "waiting_photo" ? (
        <span className={cn("rounded-full bg-status-soft font-semibold text-status-ink", size)}>{t("needsPhoto")}</span>
      ) : (
        <span className={cn("rounded-full bg-canvas text-ink-muted", size)}>{t("statusPlanned")}</span>
      )}
    </div>
  );
}

function SlotAction({ slot }: { slot: PlanSlot }) {
  const t = useTranslations("plan");
  if (slot.status !== "waiting_photo") return null;
  return (
    <Link href="/chat" className="inline-block text-[15px] font-semibold text-primary">
      {t("sendPhotos")} →
    </Link>
  );
}

function FestivalCard({ suggestion, canRequest }: { suggestion: Suggestion; canRequest: boolean }) {
  const t = useTranslations("plan");
  const tErr = useTranslations("errors");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  const [pending, start] = useTransition();
  if (hidden) return null;
  const name = locale === "hi" ? suggestion.payload.title_hi : suggestion.payload.title_en;

  const respond = (accept: boolean) =>
    start(async () => {
      const res = await respondSuggestion(suggestion.id, accept);
      if (!res.ok) {
        toast.error(tErr.has(res.error as never) ? tErr(res.error as never) : tErr("generic"));
        return;
      }
      setHidden(true);
      if (accept) toast.success(t("festivalAccepted"));
      router.refresh();
    });

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[16px] bg-rose-soft px-3.5 py-3 text-rose-ink">
      <p className="min-w-0 flex-1 text-[17px]">
        {t.rich("festival", { name, b: (c) => <b className="font-bold">{c}</b> })}
      </p>
      <div className="flex items-center gap-1">
        <Button size="sm" className="h-11 bg-surface text-rose-ink hover:bg-surface/80" disabled={pending || !canRequest} onClick={() => respond(true)}>
          {t("yesPlan")}
        </Button>
        <button
          type="button"
          onClick={() => respond(false)}
          disabled={pending}
          aria-label={t("dismiss")}
          className="flex size-11 items-center justify-center rounded-[12px] hover:bg-surface/40"
        >
          <XIcon className="size-5" />
        </button>
      </div>
    </div>
  );
}
