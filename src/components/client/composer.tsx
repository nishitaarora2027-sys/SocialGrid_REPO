"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CameraIcon, FlameIcon, ImagePlusIcon, Loader2Icon, MicIcon, PencilIcon, PlusCircleIcon, SendIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { VoiceRecorder } from "@/components/client/voice-recorder";
import { sendChatMessage } from "@/lib/actions/client";
import { compressImage, uploadFile } from "@/lib/browser/media";
import { BUCKETS, LIMITS } from "@/lib/config";
import type { Attachment, RequestRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export type RecentRequest = Pick<RequestRow, "id" | "summary" | "status" | "due_at" | "quick_start_type">;
type Intent = { type: "new" } | { type: "add"; requestId: string } | { type: "changes"; requestId: string };

interface Draft {
  text: string;
  photos: File[];
  voice?: { blob: Blob; seconds: number };
}

export function Composer({
  businessId,
  recentRequests,
  requestLabel,
  topSlot,
}: {
  businessId: string;
  recentRequests: RecentRequest[];
  requestLabel: (r: RecentRequest) => string;
  topSlot?: React.ReactNode;
}) {
  const t = useTranslations("chat");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [urgent, setUrgent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sending, setSending] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<Draft | null>(null);

  const open = recentRequests.filter((r) => ["new", "in_progress", "revision_requested"].includes(r.status)).slice(0, 2);
  const delivered = recentRequests.filter((r) => ["delivered", "completed"].includes(r.status)).slice(0, 2);
  const needsIntent = open.length + delivered.length > 0;

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const list = [...photos, ...Array.from(files).filter((f) => f.type.startsWith("image/"))];
    if (list.length > LIMITS.photosPerMessage) toast(t("maxPhotos", { max: LIMITS.photosPerMessage }));
    setPhotos(list.slice(0, LIMITS.photosPerMessage));
  };

  const submit = (draft: Draft) => {
    if (!draft.text.trim() && !draft.photos.length && !draft.voice) return;
    if (needsIntent) setPendingDraft(draft);
    else void send(draft, { type: "new" });
  };

  const send = async (draft: Draft, intent: Intent) => {
    setPendingDraft(null);
    setSending(true);
    try {
      const attachments: Attachment[] = [];
      for (const p of draft.photos) {
        const blob = await compressImage(p);
        const path = await uploadFile(BUCKETS.clientUploads, businessId, blob, p.name);
        attachments.push({ bucket: BUCKETS.clientUploads, path, type: "image" });
      }
      if (draft.voice) {
        const path = await uploadFile(BUCKETS.voiceNotes, businessId, draft.voice.blob);
        attachments.push({ bucket: BUCKETS.voiceNotes, path, type: "audio", duration: draft.voice.seconds });
      }
      const res = await sendChatMessage({ text: draft.text, attachments: attachments as never, urgent, intent });
      if (!res.ok) {
        toast.error(tErr.has(res.error as never) ? tErr(res.error as never) : tErr("generic"));
        return;
      }
      if (!draft.voice) {
        setText("");
        setPhotos([]);
      }
      setUrgent(false);
      router.refresh();
    } catch {
      toast.error(tErr("upload"));
    } finally {
      setSending(false);
    }
  };

  const hasDraft = !!(text.trim() || photos.length);
  const pickPhotos = () => fileInput.current?.click();
  const growTextarea = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // laptop: Enter sends, Shift+Enter adds a line
    if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(min-width: 1024px)").matches) {
      e.preventDefault();
      if (hasDraft && !sending) submit({ text, photos });
    }
  };

  return (
    <div className="sticky bottom-[var(--tabbar-h)] z-20 bg-paper px-3 pt-2 pb-2.5 lg:bottom-0 lg:px-0 lg:pb-6">
      {!recording && topSlot && <div className="mb-3">{topSlot}</div>}
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          addPhotos(e.target.files);
          e.target.value = "";
        }}
      />
      {photos.length > 0 && (
        <div className="scrollbar-none mb-2 flex gap-2 overflow-x-auto">
          {photos.map((p, i) => (
            <div key={`${p.name}-${i}`} className="relative size-20 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(p)} alt="" className="size-20 rounded-[12px] object-cover" />
              <button
                type="button"
                onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                className="absolute -top-1.5 -right-1.5 flex size-7 items-center justify-center rounded-full bg-ink text-paper"
                aria-label={t("removePhoto")}
              >
                <XIcon className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {recording ? (
        <VoiceRecorder
          onCancel={() => setRecording(false)}
          onError={(reason) => {
            setRecording(false);
            toast.error(reason === "denied" ? t("micDenied") : t("micUnsupported"));
          }}
          onDone={(blob, seconds) => {
            setRecording(false);
            submit({ text: "", photos: [], voice: { blob, seconds } });
          }}
        />
      ) : (
        <>
          <button
            type="button"
            onClick={() => setUrgent(!urgent)}
            aria-pressed={urgent}
            className={cn(
              "mb-2 inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[15px] font-semibold transition-colors duration-150",
              urgent ? "border-danger bg-danger text-white" : "border-line bg-surface text-ink-muted",
            )}
          >
            <FlameIcon className="size-4" /> {t("needToday")}
          </button>

          {/* phone: round photo button, pill field, round mic that turns into Send */}
          <div className="flex items-end gap-2 lg:hidden">
            <button
              type="button"
              onClick={pickPhotos}
              disabled={sending}
              aria-label={t("addPhoto")}
              className="flex size-12 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface text-ink disabled:opacity-50"
            >
              <CameraIcon className="size-6" />
            </button>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={1}
              placeholder={t("placeholderShort")}
              aria-label={t("placeholderShort")}
              className="max-h-36 min-h-12 flex-1 resize-none rounded-[24px] border border-line-strong bg-surface px-4 py-[11px] text-[17px] leading-snug outline-none placeholder:text-ink-faint focus:border-primary"
              onInput={growTextarea}
              disabled={sending}
            />
            <button
              type="button"
              onClick={() => (hasDraft ? submit({ text, photos }) : setRecording(true))}
              disabled={sending}
              aria-label={hasDraft ? t("send") : t("voiceNote")}
              className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-primary text-on-primary disabled:opacity-60"
            >
              {sending ? (
                <Loader2Icon className="size-6 animate-spin" />
              ) : hasDraft ? (
                <SendIcon className="size-6" />
              ) : (
                <MicIcon className="size-6" />
              )}
            </button>
          </div>

          {/* laptop: one card with labelled buttons */}
          <div className="hidden rounded-[20px] border border-line-strong bg-surface py-3.5 pr-3.5 pl-5 lg:block">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              rows={2}
              placeholder={t("placeholder")}
              aria-label={t("placeholder")}
              className="max-h-36 min-h-12 w-full resize-none bg-transparent text-[18px] leading-snug outline-none placeholder:text-ink-faint"
              onInput={growTextarea}
              disabled={sending}
            />
            <div className="mt-2 flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="h-11" onClick={pickPhotos} disabled={sending}>
                <CameraIcon /> {t("addPhoto")}
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-11" onClick={() => setRecording(true)} disabled={sending}>
                <MicIcon /> {t("voiceNote")}
              </Button>
              <Button
                type="button"
                className="ml-auto h-11 px-5 text-[16px]"
                onClick={() => submit({ text, photos })}
                disabled={sending || !hasDraft}
              >
                {sending ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
                {t("send")}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Is this message a new post, more info for an open request, or changes to a delivered one? */}
      <Sheet open={!!pendingDraft} onOpenChange={(o) => !o && setPendingDraft(null)}>
        <SheetContent side="bottom" className="mx-auto max-w-2xl">
          <SheetTitle>{t("intentTitle")}</SheetTitle>
          <SheetDescription>{t("intentSubtitle")}</SheetDescription>
          <div className="grid gap-2.5">
            <Button size="lg" className="h-auto min-h-14 justify-start py-3 text-left text-[17px] whitespace-normal" onClick={() => pendingDraft && send(pendingDraft, { type: "new" })}>
              <PlusCircleIcon /> {t("intentNew")}
            </Button>
            {open.map((r) => (
              <Button
                key={r.id}
                size="lg"
                variant="outline"
                className="h-auto min-h-14 justify-start py-3 text-left text-[17px] whitespace-normal"
                onClick={() => pendingDraft && send(pendingDraft, { type: "add", requestId: r.id })}
              >
                <ImagePlusIcon /> {t("intentAdd", { label: requestLabel(r) })}
              </Button>
            ))}
            {delivered.map((r) => (
              <Button
                key={r.id}
                size="lg"
                variant="outline"
                className="h-auto min-h-14 justify-start py-3 text-left text-[17px] whitespace-normal"
                onClick={() => pendingDraft && send(pendingDraft, { type: "changes", requestId: r.id })}
              >
                <PencilIcon /> {t("intentChanges", { label: requestLabel(r) })}
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
