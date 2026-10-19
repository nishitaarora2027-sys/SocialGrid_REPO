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
              className="size-24 overflow-hidden rounded-[12px] bg-canvas lg:size-30"
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
}: {
  message: Message;
  urls: Record<string, string>;
  viewer: "client" | "expert";
  requestLabel?: string | null;
  /** team member's first name, shown on their messages to build trust */
  senderName?: string;
}) {
  const t = useTranslations("chat");
  const tChips = useTranslations("chips");
  const locale = useLocale() as Locale;
  const systemText = useSystemText();

  if (message.sender === "system") {
    const key = message.payload?.i18nKey ?? "";
    const Icon = key.startsWith("ack") || key === "added" ? CheckCircle2Icon : key === "ready" ? SparklesIcon : key === "planReminder" ? BellIcon : ClockIcon;
    return (
      <div className="flex justify-center px-2">
        <div
          className={cn(
            "flex max-w-[90%] items-start gap-2 rounded-[14px] px-3.5 py-2 text-[15px]",
            key === "ready" ? "bg-primary-soft font-semibold text-primary" : "bg-canvas text-ink-muted",
          )}
        >
          <Icon className="mt-0.5 size-5 shrink-0" />
          <span>{systemText(message.payload)}</span>
        </div>
      </div>
    );
  }

  const mine = viewer === "client" ? message.sender === "client" : message.sender === "expert";
  const voice = message.attachments.find((a) => a.type === "audio");
  const chipKey = message.payload?.i18nKey?.startsWith("chips.") ? message.payload.i18nKey.slice(6) : null;

  const time = formatTime(message.created_at, locale);
  const meta =
    message.sender === "expert" && !mine ? [senderName?.split(" ")[0], "SocialGrid", time].filter(Boolean).join(" · ") : time;

  return (
    <div className={cn("flex px-3", mine ? "justify-end" : "justify-start")}>
      <div className={cn("flex max-w-[82%] flex-col gap-1", mine ? "items-end" : "items-start")}>
        <div
          className={cn(
            "space-y-2 px-3.5 py-2.5",
            mine
              ? "rounded-[18px_18px_6px_18px] bg-primary-soft"
              : "rounded-[18px_18px_18px_6px] border border-line bg-surface",
          )}
        >
          {viewer === "expert" && requestLabel && (
            <div className="text-[13px] font-semibold text-ink-muted">↳ {requestLabel}</div>
          )}
          {voice && <VoicePlayer src={fileUrl(urls, voice)} duration={voice.duration} />}
          <ImageGrid attachments={message.attachments} urls={urls} />
          {chipKey && <p className="font-semibold">{tChips(chipKey as never)}</p>}
          {message.body && <p className="text-[17px] leading-[1.45] whitespace-pre-wrap">{message.body}</p>}
        </div>
        <div className={cn("px-1 text-[13px]", mine ? "text-primary-ink" : "text-ink-muted")}>
          {meta || t("teamName")}
        </div>
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
      <span className="text-[14px] text-ink-muted">{label}</span>
    </div>
  );
}

export function isNewDay(prev: Message | undefined, cur: Message) {
  if (!prev) return true;
  return !sameDay(prev.created_at, cur.created_at);
}
