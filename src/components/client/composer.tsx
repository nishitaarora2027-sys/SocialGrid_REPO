"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUpIcon, CameraIcon, FlameIcon, ImagePlusIcon, Loader2Icon, MicIcon, PencilIcon, PlusCircleIcon, XIcon } from "lucide-react";
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
  ideas,
}: {
  businessId: string;
  recentRequests: RecentRequest[];
  requestLabel: (r: RecentRequest) => string;
  /** idea capsules shown beside "Need it today" */
  ideas?: React.ReactNode;
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
  // the big "Tap and tell us" button on the first screen starts a voice note here
  useEffect(() => {
    const start = () => setRecording(true);
    window.addEventListener("sg:voice", start);
    return () => window.removeEventListener("sg:voice", start);
  }, []);
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
    <div className="sticky bottom-[var(--tabbar-h)] z-20 bg-gradient-to-t from-paper from-70% to-transparent px-3 pt-6 pb-3 lg:bottom-0 lg:px-6 lg:pb-6">
      <div className="mx-auto max-w-[820px]">
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

        {!recording && (
          <div className="scrollbar-none -mx-3 mb-2.5 flex gap-2 overflow-x-auto px-3 lg:mx-0 lg:px-0">
            <button
              type="button"
              onClick={() => setUrgent(!urgent)}
              aria-pressed={urgent}
              className={cn(
                "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[15px] font-semibold ring-1 transition-colors duration-150",
                urgent ? "bg-danger text-white ring-danger" : "bg-surface text-ink ring-line hover:ring-line-strong",
              )}
            >
              <FlameIcon className="size-4" /> {t("needToday")}
            </button>
            {ideas && <span className="mx-1 w-px shrink-0 self-stretch bg-line" aria-hidden />}
            {ideas}
          </div>
        )}

        {photos.length > 0 && (
          <div className="scrollbar-none mb-2.5 flex gap-2 overflow-x-auto">
            {photos.map((p, i) => (
              <div key={`${p.name}-${i}`} className="relative size-20 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={URL.createObjectURL(p)} alt="" className="size-20 rounded-[16px] object-cover" />
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
          <div className="glass-card rounded-[28px] p-2">
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
          </div>
        ) : (
          // one glass message bar, the same on phone and laptop: photo · text · mic/send
          <div className="glass-card flex items-end gap-1.5 rounded-[28px] p-1.5">
            <button
              type="button"
              onClick={pickPhotos}
              disabled={sending}
              aria-label={t("addPhoto")}
              title={t("addPhoto")}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-canvas text-ink transition-colors hover:bg-line disabled:opacity-50"
            >
              <CameraIcon className="size-5" />
            </button>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder={t("placeholderShort")}
              aria-label={t("placeholderShort")}
              className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-[10px] text-[17px] leading-snug outline-none placeholder:text-ink-faint"
              onInput={growTextarea}
              disabled={sending}
            />
            <button
              type="button"
              onClick={() => (hasDraft ? submit({ text, photos }) : setRecording(true))}
              disabled={sending}
              aria-label={hasDraft ? t("send") : t("voiceNote")}
              title={hasDraft ? t("send") : t("voiceNote")}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary transition-transform duration-150 active:scale-95 disabled:opacity-60"
            >
              {sending ? (
                <Loader2Icon className="size-5 animate-spin" />
              ) : hasDraft ? (
                <ArrowUpIcon className="size-5" strokeWidth={2.5} />
              ) : (
                <MicIcon className="size-5" />
              )}
            </button>
          </div>
        )}
        <p className="mt-2 hidden text-center text-[13px] text-ink-muted lg:block">{t("composerHint")}</p>
      </div>

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
