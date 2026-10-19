"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BellIcon, CheckCircle2Icon, ClockIcon, SparklesIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VoicePlayer } from "@/components/shared/voice-player";
import { useSystemText } from "@/components/shared/system-text";
import { formatLongDate, formatTime, relativeDay, sameDay } from "@/lib/format";
import type { Attachment, Locale, Message } from "@/lib/types";
import { cn } from "@/lib/utils";

export function fileUrl(urls: Record<string, string>, a: { bucket: string; path: string }) {
  return urls[`${a.bucket}/${a.path}`];
}

export function ImageGrid({
  attachments,
  urls,
  className,
}: {
  attachments: Attachment[];
  urls: Record<string, string>;
  className?: string;
}) {
  const t = useTranslations("common");
  const [open, setOpen] = useState<string | null>(null);
  const images = attachments.filter((a) => a.type === "image");
  if (!images.length) return null;
  return (
    <>
      <div className={cn("flex flex-wrap gap-1", className)}>
        {images.map((a) => {
          const url = fileUrl(urls, a);
          return (
            <button
              key={a.path}
              type="button"
              onClick={() => url && setOpen(url)}
              className="size-28 overflow-hidden rounded-[16px] bg-canvas lg:size-36"
            >
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" loading="lazy" className="size-full object-cover" />
              ) : null}
            </button>
          );
        })}
      </div>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-3xl p-2 pt-14" closeLabel={t("close")}>
          <DialogTitle className="sr-only">{t("photo")}</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {open && <img src={open} alt="" className="max-h-[80dvh] w-full rounded-[12px] object-contain" />}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Text / photos / voice bubbles and system status lines. Options and suggestion cards are rendered by the caller. */
export function MessageBubble({
  message,
  urls,
  viewer,
  requestLabel,
  senderName,
  first = true,
  last = true,
}: {
  message: Message;
  urls: Record<string, string>;
  viewer: "client" | "expert";
  requestLabel?: string | null;
  /** team member's first name, shown on their messages to build trust */
  senderName?: string;
  /** position in a run of messages from the same person (like Messages: name on the first, time and tail on the last) */
  first?: boolean;
  last?: boolean;
}) {
  const t = useTranslations("chat");
  const tChips = useTranslations("chips");
  const locale = useLocale() as Locale;
  const systemText = useSystemText();

  if (message.sender === "system") {
    const key = message.payload?.i18nKey ?? "";
    const Icon = key.startsWith("ack") || key === "added" ? CheckCircle2Icon : key === "ready" ? SparklesIcon : key === "planReminder" ? BellIcon : ClockIcon;
    // status lines read like the small centred notes in Messages, not like bubbles
    return (
      <p className={cn("mx-auto flex max-w-[85%] items-start justify-center gap-1.5 px-3 py-1 text-center text-[14px] leading-snug", key === "ready" ? "font-semibold text-sun" : "text-ink-muted")}>
        <Icon className="mt-[3px] size-3.5 shrink-0" aria-hidden />
        <span>{systemText(message.payload)}</span>
      </p>
    );
  }

  const mine = viewer === "client" ? message.sender === "client" : message.sender === "expert";
  const voice = message.attachments.find((a) => a.type === "audio");
  const chipKey = message.payload?.i18nKey?.startsWith("chips.") ? message.payload.i18nKey.slice(6) : null;

  const time = formatTime(message.created_at, locale);
  const fromTeam = message.sender === "expert" && !mine;
  const name = fromTeam ? `${senderName?.split(" ")[0] ?? t("teamName")} · SocialGrid` : null;
  const onlyMedia = !message.body && !chipKey && !voice;

  return (
    <div className={cn("flex px-3", mine ? "justify-end" : "justify-start", last ? "mb-1.5" : "")}>
      <div className={cn("flex max-w-[78%] flex-col gap-1 lg:max-w-[68%]", mine ? "items-end" : "items-start")}>
        {first && name && <div className="px-3.5 text-[13px] font-medium text-ink-muted">{name}</div>}
        <div
          className={cn(
            "space-y-2",
            onlyMedia ? "" : "px-4 py-2.5",
            onlyMedia ? "" : mine ? "bg-bubble-client text-on-primary" : "bg-bubble-team text-ink",
            // round everywhere except the corner that points at the speaker, and only on the last bubble of a run
            mine ? (last ? "rounded-[20px_20px_6px_20px]" : "rounded-[20px]") : last ? "rounded-[20px_20px_20px_6px]" : "rounded-[20px]",
          )}
        >
          {viewer === "expert" && requestLabel && (
            <div className={cn("text-[13px] font-semibold", mine ? "text-on-primary/80" : "text-ink-muted")}>↳ {requestLabel}</div>
          )}
          {voice && <VoicePlayer src={fileUrl(urls, voice)} duration={voice.duration} inverse={mine} />}
          <ImageGrid attachments={message.attachments} urls={urls} />
          {chipKey && <p className="font-semibold">{tChips(chipKey as never)}</p>}
          {message.body && <p className="text-[17px] leading-[1.45] whitespace-pre-wrap">{message.body}</p>}
        </div>
        {last && <div className="px-2 text-[12.5px] text-ink-muted tabular-nums">{time}</div>}
      </div>
    </div>
  );
}

export function DateDivider({ iso }: { iso: string }) {
  const t = useTranslations("chat");
  const locale = useLocale() as Locale;
  const rel = relativeDay(iso);
  const label = rel ? t(rel) : formatLongDate(iso, locale);
  return (
    <div className="flex justify-center py-1">
      <span className="text-[13px] font-medium tracking-wide text-ink-muted">{label}</span>
    </div>
  );
}

export function isNewDay(prev: Message | undefined, cur: Message) {
  if (!prev) return true;
  return !sameDay(prev.created_at, cur.created_at);
}
