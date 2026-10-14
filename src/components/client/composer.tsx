"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FlameIcon, ImagePlusIcon, Loader2Icon, MicIcon, PencilIcon, PlusCircleIcon, SendIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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

  return (
    <div className="sticky bottom-0 z-20 border-t bg-card/95 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur">
      {!recording && topSlot}
      {photos.length > 0 && (
        <div className="scrollbar-none mb-2 flex gap-2 overflow-x-auto">
          {photos.map((p, i) => (
            <div key={`${p.name}-${i}`} className="relative size-20 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(p)} alt="" className="size-20 rounded-xl object-cover" />
              <button
                type="button"
                onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                className="absolute -top-1.5 -right-1.5 flex size-7 items-center justify-center rounded-full bg-foreground text-background"
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
          <label className="mb-2 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-1">
            <Switch checked={urgent} onCheckedChange={setUrgent} />
            <span className={cn("flex items-center gap-1 font-semibold", urgent && "text-destructive")}>
              <FlameIcon className="size-5" /> {t("needToday")}
            </span>
          </label>
          <div className="flex items-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-12 shrink-0 flex-col gap-0 px-2 text-[11px]"
              onClick={() => fileInput.current?.click()}
              disabled={sending}
            >
              <ImagePlusIcon className="size-5" />
              {t("photo")}
            </Button>
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
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={1}
              placeholder={t("placeholder")}
              className="max-h-36 min-h-12 flex-1 resize-none rounded-2xl border-2 border-input bg-background px-4 py-2.5 text-[17px] outline-none focus:border-primary"
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
              }}
              disabled={sending}
            />
            {text.trim() || photos.length ? (
              <Button
                type="button"
                className="h-12 shrink-0 flex-col gap-0 px-3 text-[11px]"
                onClick={() => submit({ text, photos })}
                disabled={sending}
              >
                {sending ? <Loader2Icon className="size-5 animate-spin" /> : <SendIcon className="size-5" />}
                {t("send")}
              </Button>
            ) : (
              <Button
                type="button"
                className="h-12 shrink-0 flex-col gap-0 px-3 text-[11px]"
                onClick={() => setRecording(true)}
                disabled={sending}
              >
                {sending ? <Loader2Icon className="size-5 animate-spin" /> : <MicIcon className="size-5" />}
                {t("voice")}
              </Button>
            )}
          </div>
        </>
      )}

      {/* Is this message a new post, more info for an open request, or changes to a delivered one? */}
      <Sheet open={!!pendingDraft} onOpenChange={(o) => !o && setPendingDraft(null)}>
        <SheetContent side="bottom" className="mx-auto max-w-2xl">
          <SheetTitle>{t("intentTitle")}</SheetTitle>
          <SheetDescription>{t("intentSubtitle")}</SheetDescription>
          <div className="grid gap-2.5">
            <Button size="lg" className="h-auto min-h-14 justify-start py-3 text-left whitespace-normal" onClick={() => pendingDraft && send(pendingDraft, { type: "new" })}>
              <PlusCircleIcon /> {t("intentNew")}
            </Button>
            {open.map((r) => (
              <Button
                key={r.id}
                size="lg"
                variant="outline"
                className="h-auto min-h-14 justify-start py-3 text-left whitespace-normal"
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
                className="h-auto min-h-14 justify-start py-3 text-left whitespace-normal"
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
