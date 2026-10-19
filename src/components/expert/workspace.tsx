"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  BanIcon,
  DownloadIcon,
  FlameIcon,
  HistoryIcon,
  Loader2Icon,
  PlayIcon,
  SendIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DateDivider, MessageBubble, fileUrl, isNewDay } from "@/components/shared/message-item";
import { OptionsCard } from "@/components/client/options-card";
import { useRealtimeRefresh } from "@/components/shared/use-realtime";
import { BrandPanel } from "@/components/expert/brand-panel";
import { OptionsEditor } from "@/components/expert/options-editor";
import { StatusBadge, TimeLeft } from "@/components/expert/queue-view";
import { OptionPreview } from "@/components/shared/option-preview";
import { markConversationReadExpert, markInProgress, sendExpertMessage, updateRequestMeta } from "@/lib/actions/expert-requests";
import { downloadOne } from "@/lib/browser/media";
import { formatDateTime, formatDue } from "@/lib/format";
import type { ThreadData } from "@/lib/thread";
import {
  CONTENT_TYPES,
  type BrandProfile,
  type Business,
  type ContentOption,
  type Locale,
  type Offering,
  type RequestRow,
  type Revision,
  type Rule,
} from "@/lib/types";

export function Workspace({
  request,
  business,
  brand,
  offerings,
  rules,
  options,
  revisions,
  recentPosts,
  thread,
  conversationId,
  ai,
}: {
  request: RequestRow;
  business: Business;
  brand: BrandProfile | null;
  offerings: Offering[];
  rules: Rule[];
  options: ContentOption[];
  revisions: Revision[];
  recentPosts: ContentOption[];
  thread: ThreadData;
  conversationId: string;
  ai: { text: boolean; image: boolean };
}) {
  const t = useTranslations("expert.workspace");
  const tTypes = useTranslations("contentTypes");
  const tInd = useTranslations("industries");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [pending, start] = useTransition();
  useRealtimeRefresh("messages", `conversation_id=eq.${conversationId}`);

  useEffect(() => {
    void markConversationReadExpert(conversationId);
  }, [conversationId, thread.messages.length]);

  const currentDrafts = options.filter((o) => o.revision_number === request.current_revision && !o.delivered_at);
  const currentDelivered = options.some((o) => o.revision_number === request.current_revision && o.delivered_at);
  const canEdit = !currentDelivered && !["cancelled"].includes(request.status);
  const done = ["delivered", "completed", "cancelled"].includes(request.status);

  const clientPhotos = useMemo(
    () =>
      thread.messages
        .filter((m) => m.sender === "client")
        .flatMap((m) => m.attachments.filter((a) => a.type === "image").map((a) => ({ ...a, mine: m.request_id === request.id }))),
    [thread.messages, request.id],
  );

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error ?? "Error");
      router.refresh();
    });

  return (
    <main className="space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/expert">
            <ArrowLeftIcon /> {t("backToQueue")}
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/expert/clients/${business.id}`} className="text-xl font-bold hover:underline">
              {business.name}
            </Link>
            <Badge variant="outline">{tInd(business.industry)}</Badge>
            <StatusBadge status={request.status} />
            {request.is_urgent && (
              <Badge variant="destructive">
                <FlameIcon /> {t("urgent")}
              </Badge>
            )}
            {request.current_revision > 0 && <Badge variant="warning">{t("revision", { n: request.current_revision })}</Badge>}
          </div>
          <p className="mt-1 text-muted-foreground">{request.summary || t("seeChat")}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
            <span>
              {t("due")}: <strong>{formatDue(request.due_at, locale)}</strong>
            </span>
            <TimeLeft dueAt={request.due_at} done={done} />
            <span className="text-muted-foreground">
              {t("received")}: {formatDateTime(request.created_at, locale)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <NativeSelect
            value={request.content_type ?? ""}
            onChange={(e) => act(() => updateRequestMeta(request.id, { content_type: e.target.value || null }))}
            aria-label={t("contentType")}
            className="w-48"
          >
            <option value="">{t("chooseType")}</option>
            {CONTENT_TYPES.map((c) => (
              <option key={c} value={c}>
                {tTypes(c)}
              </option>
            ))}
          </NativeSelect>
          <label className="flex h-12 items-center gap-2 rounded-[12px] border bg-card px-3 text-sm font-semibold">
            <Switch
              checked={request.is_urgent}
              onCheckedChange={(v) => act(() => updateRequestMeta(request.id, { is_urgent: v }))}
            />
            {t("urgent")}
          </label>
          {["new", "revision_requested"].includes(request.status) && (
            <Button onClick={() => act(() => markInProgress(request.id))} disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : <PlayIcon />} {t("markInProgress")}
            </Button>
          )}
          {!done && (
            <Button
              variant="ghost"
              onClick={() => confirm(t("confirmCancel")) && act(() => updateRequestMeta(request.id, { status: "cancelled" }))}
            >
              <BanIcon /> {t("cancel")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(320px,1fr)_minmax(0,1.6fr)_minmax(280px,0.9fr)]">
        {/* Chat thread */}
        <section className="flex max-h-[80dvh] flex-col overflow-hidden rounded-[16px] border bg-background">
          <h2 className="border-b bg-card px-4 py-3 font-bold">{t("chat")}</h2>
          <ThreadList thread={thread} requestId={request.id} />
          <ExpertComposer requestId={request.id} businessId={business.id} />
        </section>

        {/* Options */}
        <section className="space-y-4">
          {clientPhotos.length > 0 && (
            <div className="space-y-2 rounded-[16px] border bg-card p-4">
              <h2 className="font-bold">{t("clientPhotos")}</h2>
              {!business.photo_consent && business.industry === "salon" && (
                <p className="flex items-start gap-2 rounded-[12px] bg-status-soft p-3 text-sm font-semibold text-status-ink">
                  <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" /> {t("noConsent")}
                </p>
              )}
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {clientPhotos.map((p, i) => {
                  const url = fileUrl(thread.urls, p);
                  return (
                    <div key={p.path} className={p.mine ? "" : "opacity-60"}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {url && <img src={url} alt="" className="aspect-square w-full rounded-[12px] object-cover" />}
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-1 h-9 w-full"
                        disabled={!url}
                        onClick={() => url && downloadOne({ url, filename: `${business.name}-photo-${i + 1}.${p.path.split(".").pop()}` })}
                      >
                        <DownloadIcon className="size-4" /> {t("download")}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {canEdit ? (
            <OptionsEditor
              key={`${request.id}-${request.current_revision}`}
              request={request}
              businessId={business.id}
              initial={currentDrafts}
              urls={thread.urls}
              lastFeedback={revisions.find((r) => r.number === request.current_revision) ?? null}
              ai={ai}
            />
          ) : (
            <div className="rounded-[16px] border bg-card p-4 text-muted-foreground">
              {request.status === "cancelled" ? t("cancelled") : t("deliveredWaiting")}
            </div>
          )}

          <RevisionHistory request={request} options={options} revisions={revisions} urls={thread.urls} />
        </section>

        {/* Brand */}
        <BrandPanel business={business} brand={brand} offerings={offerings} rules={rules} recentPosts={recentPosts} urls={thread.urls} />
      </div>
    </main>
  );
}

function ThreadList({ thread, requestId }: { thread: ThreadData; requestId: string }) {
  const tReq = useTranslations("expert.workspace");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [thread.messages.length]);
  const { messages, options, requests, urls, suggestions } = thread;
  return (
    <div className="flex-1 space-y-3 overflow-y-auto py-3">
      {messages.map((m, i) => (
        <div key={m.id} className={m.request_id && m.request_id !== requestId ? "opacity-55" : ""}>
          {isNewDay(messages[i - 1], m) && <DateDivider iso={m.created_at} />}
          {m.kind === "options_card" ? (
            <OptionsCard
              options={(m.payload.optionIds ?? []).map((id) => options[id]).filter(Boolean)}
              request={m.request_id ? requests[m.request_id] : undefined}
              urls={urls}
              revision={m.payload.revision ?? 0}
              interactive={false}
            />
          ) : m.kind === "suggestion" ? (
            <div className="mx-2 rounded-[16px] border border-dashed p-3 text-sm text-muted-foreground">
              💡 {tReq("suggestionShown")}: {m.payload.suggestionId && suggestions[m.payload.suggestionId]?.payload.title_en}
            </div>
          ) : (
            <MessageBubble
              message={m}
              urls={urls}
              viewer="expert"
              requestLabel={m.request_id && m.request_id !== requestId ? requests[m.request_id]?.summary : null}
            />
          )}
        </div>
      ))}
      <div ref={end} />
    </div>
  );
}

function ExpertComposer({ requestId, businessId }: { requestId: string; businessId: string }) {
  const t = useTranslations("expert.workspace");
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="flex gap-2 border-t bg-card p-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("messagePlaceholder")}
        className="min-h-12 flex-1 py-2"
        rows={2}
      />
      <Button
        className="h-auto"
        disabled={pending || !text.trim()}
        onClick={() =>
          start(async () => {
            const res = await sendExpertMessage(requestId, businessId, text);
            if (res.ok) {
              setText("");
              router.refresh();
            }
          })
        }
      >
        <SendIcon /> {t("send")}
      </Button>
    </div>
  );
}

function RevisionHistory({
  request,
  options,
  revisions,
  urls,
}: {
  request: RequestRow;
  options: ContentOption[];
  revisions: Revision[];
  urls: Record<string, string>;
}) {
  const t = useTranslations("expert.workspace");
  const tChips = useTranslations("chips");
  const locale = useLocale() as Locale;
  const delivered = options.filter((o) => o.delivered_at);
  if (!delivered.length && !revisions.length) return null;
  const revNumbers = [...new Set([...delivered.map((o) => o.revision_number), ...revisions.map((r) => r.number)])].sort((a, b) => b - a);

  return (
    <div className="space-y-3 rounded-[16px] border bg-card p-4">
      <h2 className="flex items-center gap-2 font-bold">
        <HistoryIcon className="size-5" /> {t("history")}
      </h2>
      {revNumbers.map((n) => {
        const rev = revisions.find((r) => r.number === n);
        const opts = delivered.filter((o) => o.revision_number === n);
        return (
          <div key={n} className="space-y-2 border-t pt-3 first:border-t-0 first:pt-0">
            <div className="text-sm font-bold">
              {n === 0 ? t("firstVersion") : t("revision", { n })}
              {n === request.current_revision && <span className="ml-2 text-primary">({t("current")})</span>}
            </div>
            {rev && (
              <div className="space-y-1 rounded-[12px] bg-muted/60 p-3 text-sm">
                <div>
                  <span className="font-semibold">{t("clientAsked")}:</span>{" "}
                  {[rev.feedback_chip && tChips(rev.feedback_chip as never), rev.client_feedback].filter(Boolean).join(" — ") || "—"}
                </div>
                {rev.expert_change_note && (
                  <div>
                    <span className="font-semibold">{t("weChanged")}:</span> {rev.expert_change_note}
                  </div>
                )}
                <div className="text-[13px] text-muted-foreground">{formatDateTime(rev.created_at, locale)}</div>
              </div>
            )}
            {opts.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {opts.map((o) => (
                  <div key={o.id} className="relative">
                    <OptionPreview option={o} urls={urls} />
                    {o.chosen && <Badge variant="success" className="absolute bottom-1 left-1">{t("chosen")}</Badge>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
