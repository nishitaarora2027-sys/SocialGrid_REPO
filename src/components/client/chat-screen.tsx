"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarCheckIcon,
  CameraIcon,
  CheckIcon,
  ClockIcon,
  LightbulbIcon,
  Loader2Icon,
  MessageCircleIcon,
  PartyPopperIcon,
  PencilIcon,
  SendIcon,
  XIcon,
} from "lucide-react";
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
import { chooseOption, markConversationRead, requestChanges, respondSuggestion } from "@/lib/actions/client";
import { dayPart, formatDue } from "@/lib/format";
import type { ThreadData } from "@/lib/thread";
import type { Locale, PlanSlot, QuickStartCard, Suggestion } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ChatScreen({
  businessId,
  businessName,
  conversationId,
  ownerName,
  cards,
  slots,
  thread,
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
  recentRequests: RecentRequest[];
  canRequest: boolean;
  supportWhatsapp: string;
}) {
  const t = useTranslations("chat");
  const tErr = useTranslations("errors");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const bottom = useRef<HTMLDivElement>(null);
  const [card, setCard] = useState<QuickStartCard | null>(null);
  const [openOption, setOpenOption] = useState<string | null>(null);
  const [changesFor, setChangesFor] = useState<string | null>(null);

  useRealtimeRefresh("messages", `conversation_id=eq.${conversationId}`);

  const { messages, options, suggestions, requests, urls } = thread;
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

  const working = Object.values(requests).filter((r) => ["new", "in_progress", "revision_requested"].includes(r.status));
  const showError = (code: string) => toast.error(tErr.has(code as never) ? tErr(code as never) : tErr("generic"));

  const onChoose = async (optionId: string) => {
    const res = await chooseOption(optionId);
    if (!res.ok) {
      showError(res.error);
      return;
    }
    setOpenOption(optionId);
    router.refresh();
  };

  const onChip = async (requestId: string, optionIds: string[], chip: string) => {
    if (chip === "looks_good") {
      if (optionIds.length === 1) return onChoose(optionIds[0]);
      return toast(t("pickOneFirst"));
    }
    if (chip === "make_changes") return setChangesFor(requestId);
    const res = await requestChanges(requestId, null, chip);
    if (!res.ok) return showError(res.error);
    router.refresh();
  };

  const greeting = t(`greeting.${dayPart()}`, { name: ownerName });
  // The big idea cards stay until the client has sent something; after that they shrink to chips
  const hasClientMessages = messages.some((m) => m.sender === "client");

  return (
    <>
      {slots.length > 0 && <WeekStrip slots={slots} />}

      <main className="flex flex-1 flex-col gap-3 py-4">
        {!hasClientMessages ? (
          <Welcome greeting={greeting} cards={cards} onCard={setCard} disabled={!canRequest} />
        ) : (
          <div className="px-4 pb-1">
            <h1 className="text-xl font-bold">{greeting}</h1>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={m.id} className="space-y-3">
            {isNewDay(messages[i - 1], m) && <DateDivider iso={m.created_at} />}
            {m.kind === "options_card" ? (
              <OptionsCard
                options={(m.payload.optionIds ?? []).map((id) => options[id]).filter(Boolean)}
                request={m.request_id ? requests[m.request_id] : undefined}
                urls={urls}
                revision={m.payload.revision ?? 0}
                interactive={!!m.request_id && latestCardFor[m.request_id] === m.id}
                onChoose={onChoose}
                onOpen={setOpenOption}
                onChip={(chip) => m.request_id && onChip(m.request_id, m.payload.optionIds ?? [], chip)}
              />
            ) : m.kind === "suggestion" ? (
              m.payload.suggestionId && suggestions[m.payload.suggestionId] ? (
                <SuggestionCard suggestion={suggestions[m.payload.suggestionId]} canRequest={canRequest} />
              ) : null
            ) : (
              <MessageBubble message={m} urls={urls} viewer="client" />
            )}
          </div>
        ))}

        {working.length > 0 && (
          <div className="flex px-2">
            <div className="flex items-center gap-3 rounded-2xl rounded-bl-md border bg-bubble-team px-4 py-3 shadow-sm">
              <span className="flex gap-1" aria-hidden>
                {[0, 1, 2].map((d) => (
                  <span key={d} className="typing-dot size-2 rounded-full bg-primary" style={{ animationDelay: `${d * 0.2}s` }} />
                ))}
              </span>
              <span className="text-[15px] font-medium">
                {t("workingOn", { due: formatDue(working[0].due_at, locale) })}
              </span>
            </div>
          </div>
        )}
        <div ref={bottom} />
      </main>

      {canRequest ? (
        <Composer
          businessId={businessId}
          recentRequests={recentRequests}
          requestLabel={requestLabel}
          topSlot={
            hasClientMessages && cards.length > 0 ? (
              <div className="scrollbar-none -mx-3 mb-2 flex gap-2 overflow-x-auto px-3">
                <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-muted-foreground">
                  <LightbulbIcon className="size-4" /> {t("quickIdeas")}
                </span>
                {cards.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCard(c)}
                    className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border-2 bg-card px-3.5 text-sm font-semibold"
                  >
                    <CardIcon name={c.icon} className="size-4 text-primary" />
                    {locale === "hi" ? c.label_hi : c.label_en}
                  </button>
                ))}
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
    </>
  );
}

function Welcome({
  greeting,
  cards,
  onCard,
  disabled,
}: {
  greeting: string;
  cards: QuickStartCard[];
  onCard: (c: QuickStartCard) => void;
  disabled: boolean;
}) {
  const t = useTranslations("chat");
  const locale = useLocale() as Locale;
  return (
    <section className="space-y-5 px-4 pt-2">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          {greeting} <PartyPopperIcon className="size-6 text-primary" />
        </h1>
        <p className="text-lg text-muted-foreground">{t("welcomeSubtitle")}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <button
            key={c.id}
            type="button"
            disabled={disabled}
            onClick={() => onCard(c)}
            className="flex min-h-28 flex-col items-start justify-between gap-3 rounded-3xl border-2 bg-card p-4 text-left shadow-sm transition active:scale-[0.97] disabled:opacity-50"
          >
            <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary">
              <CardIcon name={c.icon} className="size-6" />
            </span>
            <span className="text-[17px] leading-tight font-bold">{locale === "hi" ? c.label_hi : c.label_en}</span>
          </button>
        ))}
      </div>
      <p className="flex items-center gap-2 text-muted-foreground">
        <MessageCircleIcon className="size-5 shrink-0" /> {t("orTypeBelow")}
      </p>
    </section>
  );
}

function WeekStrip({ slots }: { slots: PlanSlot[] }) {
  const t = useTranslations("week");
  const tTypes = useTranslations("contentTypes");
  const days = t.raw("days") as string[];
  return (
    <section className="border-b bg-card/60 px-3 py-2.5">
      <div className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-muted-foreground">
        <CalendarCheckIcon className="size-4" /> {t("title")}
      </div>
      <div className="scrollbar-none flex gap-2 overflow-x-auto">
        {slots.map((s) => {
          const state = s.status === "done" ? "done" : s.status === "waiting_photo" ? "waiting" : "upcoming";
          return (
            <div
              key={s.id}
              className={cn(
                "flex min-w-32 shrink-0 flex-col rounded-2xl border-2 px-3 py-2",
                state === "done" && "border-success/40 bg-success/10",
                state === "waiting" && "border-warning bg-warning/15",
              )}
            >
              <span className="text-xs font-semibold text-muted-foreground">{days[s.day] ?? ""}</span>
              <span className="text-sm font-bold">{tTypes(s.type as never)}</span>
              <span
                className={cn(
                  "mt-0.5 flex items-center gap-1 text-xs font-semibold",
                  state === "done" ? "text-success" : state === "waiting" ? "text-warning-foreground" : "text-muted-foreground",
                )}
              >
                {state === "done" ? <CheckIcon className="size-3.5" /> : state === "waiting" ? <CameraIcon className="size-3.5" /> : <ClockIcon className="size-3.5" />}
                {t(state)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SuggestionCard({ suggestion, canRequest }: { suggestion: Suggestion; canRequest: boolean }) {
  const t = useTranslations("suggestion");
  const tErr = useTranslations("errors");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [pending, start] = useTransition();
  const p = suggestion.payload as Suggestion["payload"] & { days?: number };
  const title = locale === "hi" ? p.title_hi : p.title_en;

  const text =
    suggestion.kind === "festival"
      ? p.days === 0
        ? t("festivalToday", { name: title })
        : t("festival", { name: title, days: p.days ?? 0 })
      : suggestion.kind === "inactivity"
        ? t("idea", { idea: title })
        : title;

  const respond = (accept: boolean) =>
    start(async () => {
      const res = await respondSuggestion(suggestion.id, accept);
      if (!res.ok) toast.error(tErr.has(res.error as never) ? tErr(res.error as never) : tErr("generic"));
      router.refresh();
    });

  return (
    <div className="mx-2 space-y-3 rounded-3xl border-2 border-warning/50 bg-gradient-to-br from-secondary to-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-warning/20 text-warning-foreground">
          {suggestion.kind === "festival" ? <PartyPopperIcon className="size-6" /> : <LightbulbIcon className="size-6" />}
        </span>
        <p className="pt-1 text-[17px] font-semibold">{text}</p>
      </div>
      {suggestion.status === "pending" ? (
        <div className="flex gap-2">
          <Button className="flex-1" disabled={pending || !canRequest} onClick={() => respond(true)}>
            {pending ? <Loader2Icon className="animate-spin" /> : <CheckIcon />} {t("yes")}
          </Button>
          <Button variant="outline" className="flex-1" disabled={pending} onClick={() => respond(false)}>
            <XIcon /> {t("notNow")}
          </Button>
        </div>
      ) : (
        <p className="text-sm font-semibold text-muted-foreground">
          {suggestion.status === "accepted" ? `✓ ${t("accepted")}` : t("dismissed")}
        </p>
      )}
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
                "min-h-12 rounded-full border-2 px-4 font-semibold",
                chip === c ? "border-primary bg-primary text-primary-foreground" : "bg-card",
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
    <div className="sticky bottom-0 space-y-3 border-t bg-card px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <p className="text-[17px] font-medium">{t("blocked")}</p>
      <Button asChild size="lg" className="w-full">
        <a href={href} target={supportWhatsapp ? "_blank" : undefined} rel="noreferrer">
          <MessageCircleIcon /> {t("contactUs")}
        </a>
      </Button>
    </div>
  );
}
