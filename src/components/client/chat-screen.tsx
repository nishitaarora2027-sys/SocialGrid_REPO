"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon, MessageCircleIcon, PencilIcon, SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { CardIcon } from "@/components/shared/icons";
import { DateDivider, MessageBubble, isNewDay } from "@/components/shared/message-item";
import { Composer, type RecentRequest } from "@/components/client/composer";
import { DeliveryView } from "@/components/client/delivery-view";
import { CHANGE_CHIPS, OptionsCard } from "@/components/client/options-card";
import { QuickStartSheet } from "@/components/client/quick-start-sheet";
import { useRealtimeRefresh } from "@/components/shared/use-realtime";
import { chooseOption, markConversationRead, requestChanges } from "@/lib/actions/client";
import { celebrate } from "@/lib/browser/media";
import { dayPart, formatDue, isPast } from "@/lib/format";
import type { ThreadData } from "@/lib/thread";
import type { Locale, PlanSlot, QuickStartCard } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ChatScreen({
  businessId,
  businessName,
  conversationId,
  ownerName,
  cards,
  slots,
  thread,
  teamNames,
  recentRequests,
  canRequest,
  supportWhatsapp,
}: {
  businessId: string;
  businessName: string;
  conversationId: string;
  ownerName: string;
  cards: QuickStartCard[];
  slots: PlanSlot[];
  thread: ThreadData;
  teamNames: Record<string, string>;
  recentRequests: RecentRequest[];
  canRequest: boolean;
  supportWhatsapp: string;
}) {
  const t = useTranslations("chat");
  const tDelivery = useTranslations("delivery");
  const tErr = useTranslations("errors");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const bottom = useRef<HTMLDivElement>(null);
  const [card, setCard] = useState<QuickStartCard | null>(null);
  const [openOption, setOpenOption] = useState<string | null>(null);
  const [changesFor, setChangesFor] = useState<string | null>(null);

  useRealtimeRefresh("messages", `conversation_id=eq.${conversationId}`);

  const { messages, options, requests, urls } = thread;
  const lastId = messages.at(-1)?.id;
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    void markConversationRead();
  }, [lastId]);

  const cardByKey = useMemo(() => Object.fromEntries(cards.map((c) => [c.key, c])), [cards]);
  const requestLabel = (r: { summary: string | null; quick_start_type: string | null }) => {
    const c = r.quick_start_type ? cardByKey[r.quick_start_type] : null;
    if (c) return locale === "hi" ? c.label_hi : c.label_en;
    return r.summary || t("yourRequest");
  };

  // Latest options card per request is the interactive one
  const latestCardFor = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of messages) if (m.kind === "options_card" && m.request_id) map[m.request_id] = m.id;
    return map;
  }, [messages]);

  // The pinned status bar follows the newest open post, or the newest one waiting to be chosen
  const byNewest = Object.values(requests).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const tracked =
    byNewest.find((r) => OPEN.includes(r.status)) ??
    byNewest.find((r) => r.status === "delivered");

  const showError = (code: string) => toast.error(tErr.has(code as never) ? tErr(code as never) : tErr("generic"));

  const onChoose = async (optionId: string) => {
    const res = await chooseOption(optionId);
    if (!res.ok) {
      showError(res.error);
      return;
    }
    void celebrate();
    toast.success(tDelivery("savedToPosts"));
    router.refresh();
  };

  const greeting = t(`greeting.${dayPart()}`, { name: ownerName });
  // Idea chips sit in the welcome state; once the owner has written, they move above the composer on laptop
  const hasClientMessages = messages.some((m) => m.sender === "client");
  // festival / idea suggestions live on the Weekly plan page, not in the chat
  const shown = messages.filter((m) => m.kind !== "suggestion");
  const ideaChips = <IdeaChips cards={cards} onCard={setCard} disabled={!canRequest} />;

  return (
    <div className="flex min-w-0 flex-1">
    <div className="mx-auto flex w-full max-w-[880px] min-w-0 flex-1 flex-col lg:px-8">
      {tracked && (
        <StatusBar
          title={requestLabel(tracked)}
          status={tracked.status}
          dueAt={tracked.due_at}
          onTap={() => document.getElementById(`options-${tracked.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
        />
      )}

      <main className="flex flex-1 flex-col justify-end gap-2.5 px-0 py-3.5">
        {!hasClientMessages && (
          <section className="space-y-4 px-3 pb-2">
            <div className="space-y-1">
              <h1 className="text-[22px] leading-tight font-bold lg:text-[28px]">{greeting}</h1>
              <p className="text-[17px] text-ink-muted">{t("welcomeSubtitle")}</p>
            </div>
            {ideaChips}
          </section>
        )}

        {shown.map((m, i) => (
          <div key={m.id} className="space-y-2.5">
            {isNewDay(shown[i - 1], m) && <DateDivider iso={m.created_at} />}
            {m.kind === "options_card" ? (
              <OptionsCard
                options={(m.payload.optionIds ?? []).map((id) => options[id]).filter(Boolean)}
                request={m.request_id ? requests[m.request_id] : undefined}
                urls={urls}
                revision={m.payload.revision ?? 0}
                interactive={!!m.request_id && latestCardFor[m.request_id] === m.id}
                businessName={businessName}
                onChoose={onChoose}
                onOpen={setOpenOption}
                onAskChanges={canRequest && m.request_id ? () => setChangesFor(m.request_id) : undefined}
              />
            ) : (
              <MessageBubble
                message={m}
                urls={urls}
                viewer="client"
                senderName={m.sender_profile_id ? teamNames[m.sender_profile_id] : undefined}
              />
            )}
          </div>
        ))}
        <div ref={bottom} />
      </main>

      {canRequest ? (
        <Composer
          businessId={businessId}
          recentRequests={recentRequests}
          requestLabel={requestLabel}
          topSlot={
            hasClientMessages && cards.length > 0 ? (
              <div className="hidden lg:block">
                <IdeaChips cards={cards} onCard={setCard} disabled={!canRequest} oneRow />
              </div>
            ) : null
          }
        />
      ) : (
        <BlockedNotice supportWhatsapp={supportWhatsapp} />
      )}

      <QuickStartSheet card={card} businessId={businessId} onClose={() => setCard(null)} />
      <DeliveryView
        option={openOption ? options[openOption] : null}
        urls={urls}
        businessName={businessName}
        open={!!openOption}
        onOpenChange={(o) => !o && setOpenOption(null)}
        onMakeChanges={
          canRequest && openOption
            ? () => {
                const rid = options[openOption]?.request_id;
                setOpenOption(null);
                if (rid) setChangesFor(rid);
              }
            : undefined
        }
      />
      <ChangesSheet requestId={changesFor} onClose={() => setChangesFor(null)} />
    </div>
    <WeekRail slots={slots} openRequests={byNewest.filter((r) => OPEN.includes(r.status))} requestLabel={requestLabel} />
    </div>
  );
}

const OPEN = ["new", "in_progress", "revision_requested"];
const STEP: Record<string, number> = { new: 0, in_progress: 1, revision_requested: 1, delivered: 2, completed: 2 };

/** Received · Making · Ready, with the promised time */
function StatusBar({
  title,
  status,
  dueAt,
  onTap,
}: {
  title: string;
  status: string;
  dueAt: string;
  onTap: () => void;
}) {
  const t = useTranslations("statusBar");
  const locale = useLocale() as Locale;
  const step = STEP[status] ?? 0;
  const late = step < 2 && isPast(dueAt);
  const labels = [t("received"), t("making"), t("ready")];
  return (
    <button
      type="button"
      onClick={onTap}
      data-testid="status-bar"
      className="sticky top-[calc(53px+max(12px,env(safe-area-inset-top)))] z-20 mx-3 mt-2.5 flex flex-col gap-2 rounded-[16px] bg-status-soft px-3.5 py-3 text-left lg:top-6 lg:mx-0 lg:mt-6"
    >
      <span className="flex w-full items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-[16px] font-bold text-ink">{title}</span>
        <span className="shrink-0 text-[16px] font-semibold text-status-ink">
          {step === 2 ? t("readyNow") : late ? t("late") : t("readyBy", { time: formatDue(dueAt, locale) })}
        </span>
      </span>
      <span className="grid w-full grid-cols-3 gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className={cn("h-1.5 rounded-[3px]", i <= step ? "bg-status" : "bg-status-track")} />
        ))}
      </span>
      <span className="grid w-full grid-cols-3 gap-1 text-[14px] text-status-ink">
        {labels.map((l, i) => (
          <span key={l} className={cn(i === step && "font-bold text-ink")} aria-current={i === step ? "step" : undefined}>
            {l}
          </span>
        ))}
      </span>
    </button>
  );
}

function IdeaChips({
  cards,
  onCard,
  disabled,
  oneRow,
}: {
  cards: QuickStartCard[];
  onCard: (c: QuickStartCard) => void;
  disabled: boolean;
  oneRow?: boolean;
}) {
  const locale = useLocale() as Locale;
  return (
    <div className={cn("flex gap-2", oneRow ? "scrollbar-none overflow-x-auto" : "flex-wrap")}>
      {cards.map((c) => (
        <button
          key={c.id}
          type="button"
          disabled={disabled}
          onClick={() => onCard(c)}
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-line bg-surface px-4 text-[16px] font-semibold transition-colors duration-150 hover:bg-canvas disabled:opacity-50"
        >
          <CardIcon name={c.icon} className="size-5 text-primary" />
          {locale === "hi" ? c.label_hi : c.label_en}
        </button>
      ))}
    </div>
  );
}

function ChangesSheet({ requestId, onClose }: { requestId: string | null; onClose: () => void }) {
  const t = useTranslations("changes");
  const tChips = useTranslations("chips");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const [text, setText] = useState("");
  const [chip, setChip] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      if (!requestId || (!text.trim() && !chip)) return;
      const res = await requestChanges(requestId, text, chip);
      if (!res.ok) {
        toast.error(tErr.has(res.error as never) ? tErr(res.error as never) : tErr("generic"));
        return;
      }
      setText("");
      setChip(null);
      onClose();
      router.refresh();
    });

  return (
    <Sheet open={!!requestId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="mx-auto max-w-2xl">
        <SheetTitle className="flex items-center gap-2">
          <PencilIcon className="size-5" /> {t("title")}
        </SheetTitle>
        <SheetDescription>{t("subtitle")}</SheetDescription>
        <div className="flex flex-wrap gap-2">
          {CHANGE_CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChip(chip === c ? null : c)}
              className={cn(
                "min-h-12 rounded-full border px-4 text-[16px] font-semibold transition-colors duration-150",
                chip === c ? "border-primary bg-primary text-on-primary" : "border-line bg-surface",
              )}
            >
              {tChips(c)}
            </button>
          ))}
        </div>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t("placeholder")} className="text-lg" />
        <Button size="lg" onClick={submit} disabled={pending || (!text.trim() && !chip)}>
          {pending ? <Loader2Icon className="animate-spin" /> : <SendIcon />} {t("send")}
        </Button>
      </SheetContent>
    </Sheet>
  );
}

function BlockedNotice({ supportWhatsapp }: { supportWhatsapp: string }) {
  const t = useTranslations("subscription");
  const href = supportWhatsapp ? `https://wa.me/${supportWhatsapp.replace(/\D/g, "")}` : "/help";
  return (
    <div className="sticky bottom-[var(--tabbar-h)] mx-3 mb-3 space-y-3 rounded-[16px] border border-line bg-canvas p-4">
      <p className="text-[17px] font-medium text-danger">{t("blocked")}</p>
      <Button asChild size="lg" className="w-full">
        <a href={href} target={supportWhatsapp ? "_blank" : undefined} rel="noreferrer">
          <MessageCircleIcon /> {t("contactUs")}
        </a>
      </Button>
    </div>
  );
}

/** Laptop (wide screens): this week's plan and posts being made, beside the chat */
function WeekRail({
  slots,
  openRequests,
  requestLabel,
}: {
  slots: PlanSlot[];
  openRequests: { id: string; summary: string | null; quick_start_type: string | null; due_at: string; status: string }[];
  requestLabel: (r: { summary: string | null; quick_start_type: string | null }) => string;
}) {
  const t = useTranslations("rail");
  const tWeek = useTranslations("week");
  const tTypes = useTranslations("contentTypes");
  const locale = useLocale() as Locale;
  const days = tWeek.raw("days") as string[];
  return (
    <aside className="sticky top-0 hidden h-dvh w-[320px] shrink-0 flex-col gap-6 overflow-y-auto border-l border-line bg-surface px-5 py-6 xl:flex">
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[18px] font-bold">{t("thisWeek")}</h2>
          <Link href="/plan" className="text-[15px] font-semibold text-primary">
            {t("seePlan")} →
          </Link>
        </div>
        {slots.length === 0 ? (
          <p className="text-[15px] text-ink-muted">{t("noPlan")}</p>
        ) : (
          <ul className="space-y-2">
            {slots.map((s) => (
              <li key={s.id} className="flex items-start gap-3 rounded-[12px] bg-paper px-3 py-2">
                <span className="w-10 shrink-0 text-[15px] font-bold">{days[s.day]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{s.goal?.trim() || tTypes(s.type as never)}</span>
                  <span className="text-[13px] text-ink-muted">
                    {tTypes(s.type as never)} · {t(`slot.${s.status}` as never)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {openRequests.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[18px] font-bold">{t("beingMade")}</h2>
          <ul className="space-y-2">
            {openRequests.map((r) => (
              <li key={r.id} className="rounded-[12px] bg-status-soft px-3 py-2">
                <span className="block truncate text-[15px] font-semibold">{requestLabel(r)}</span>
                <span className="text-[13px] text-status-ink">
                  {isPast(r.due_at) ? t("late") : formatDue(r.due_at, locale)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
