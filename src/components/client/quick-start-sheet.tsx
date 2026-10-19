"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeftIcon, ArrowRightIcon, CameraIcon, FlameIcon, Loader2Icon, SendIcon, SkipForwardIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { CardIcon } from "@/components/shared/icons";
import { submitQuickStart } from "@/lib/actions/client";
import { compressImage, uploadFile } from "@/lib/browser/media";
import { BUCKETS, LIMITS } from "@/lib/config";
import type { Locale, QuickStartCard } from "@/lib/types";
import { cn } from "@/lib/utils";

/** 1–3 simple questions with tappable answers, then sends a structured request. */
export function QuickStartSheet({
  card,
  businessId,
  onClose,
}: {
  card: QuickStartCard | null;
  businessId: string;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!card} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="mx-auto max-w-2xl">
        {card && <Flow key={card.id} card={card} businessId={businessId} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function Flow({ card, businessId, onClose }: { card: QuickStartCard; businessId: string; onClose: () => void }) {
  const t = useTranslations("quickStart");
  const tErr = useTranslations("errors");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<File[]>([]);
  const [urgent, setUrgent] = useState(false);
  const [sending, setSending] = useState(false);

  const questions = card.questions;
  const label = locale === "hi" ? card.label_hi : card.label_en;
  const isReview = step >= questions.length;
  const q = questions[step];
  const qText = (x: (typeof questions)[number]) => (locale === "hi" ? x.q_hi : x.q_en);

  const next = () => setStep((s) => s + 1);
  const setAnswer = (id: string, v: string) => setAnswers((a) => ({ ...a, [id]: v }));

  const send = async () => {
    setSending(true);
    try {
      const attachments = [];
      for (const p of photos) {
        const blob = await compressImage(p);
        const path = await uploadFile(BUCKETS.clientUploads, businessId, blob, p.name);
        attachments.push({ bucket: BUCKETS.clientUploads, path, type: "image" as const });
      }
      const lines = questions
        .filter((x) => x.type !== "photo" && answers[x.id])
        .map((x) => `${qText(x)} ${answers[x.id]}`);
      const res = await submitQuickStart({
        cardId: card.id,
        answers: Object.fromEntries(questions.filter((x) => answers[x.id]).map((x) => [x.q_en, answers[x.id]])),
        summaryText: [label, ...lines].join("\n"),
        attachments: attachments as never,
        urgent,
      });
      if (!res.ok) {
        toast.error(tErr.has(res.error as never) ? tErr(res.error as never) : tErr("generic"));
        return;
      }
      onClose();
      router.refresh();
    } catch {
      toast.error(tErr("upload"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-[16px] bg-secondary text-primary">
          <CardIcon name={card.icon} className="size-6" />
        </div>
        <div>
          <SheetTitle>{label}</SheetTitle>
          <SheetDescription>
            {isReview ? t("almostDone") : t("stepOf", { n: step + 1, total: questions.length })}
          </SheetDescription>
        </div>
      </div>

      {/* progress dots */}
      <div className="flex gap-1.5">
        {[...questions, null].map((_, i) => (
          <div key={i} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />
        ))}
      </div>

      {!isReview && q && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold">{qText(q)}</h3>

          {q.type === "choice" && (
            <div className="grid gap-2.5">
              {q.options?.map((o) => {
                const value = locale === "hi" ? o.hi : o.en;
                const selected = answers[q.id] === value;
                return (
                  <button
                    key={o.en}
                    type="button"
                    onClick={() => {
                      setAnswer(q.id, value);
                      if (!q.allow_text) setTimeout(next, 150);
                    }}
                    className={cn(
                      "min-h-14 rounded-[16px] border px-4 text-left text-lg font-semibold transition-colors",
                      selected ? "border-primary bg-secondary" : "bg-card",
                    )}
                  >
                    {value}
                  </button>
                );
              })}
              {q.allow_text && (
                <Input
                  placeholder={t("orType")}
                  value={q.options?.some((o) => o.en === answers[q.id] || o.hi === answers[q.id]) ? "" : (answers[q.id] ?? "")}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  className="h-14 text-lg"
                />
              )}
            </div>
          )}

          {q.type === "text" && (
            <Textarea
              autoFocus
              value={answers[q.id] ?? ""}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              placeholder={t("typeHere")}
              className="text-lg"
            />
          )}

          {q.type === "photo" && (
            <div className="space-y-3">
              <Button variant="outline" size="lg" className="w-full" onClick={() => fileInput.current?.click()}>
                <CameraIcon /> {photos.length ? t("addMorePhotos") : t("addPhoto")}
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  const list = [...photos, ...Array.from(e.target.files ?? [])].slice(0, LIMITS.photosPerMessage);
                  setPhotos(list);
                  e.target.value = "";
                }}
              />
              {photos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {photos.map((p, i) => (
                    <div key={`${p.name}-${i}`} className="relative size-20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={URL.createObjectURL(p)} alt="" className="size-20 rounded-[12px] object-cover" />
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
            </div>
          )}

          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                <ArrowLeftIcon /> {t("back")}
              </Button>
            )}
            <Button variant="outline" className="flex-1" onClick={next}>
              <SkipForwardIcon /> {t("skip")}
            </Button>
            <Button className="flex-1" onClick={next}>
              {t("next")} <ArrowRightIcon />
            </Button>
          </div>
        </div>
      )}

      {isReview && (
        <div className="space-y-4">
          <div className="space-y-2 rounded-[16px] bg-secondary/60 p-4">
            {questions.filter((x) => x.type !== "photo").map((x) => (
              <div key={x.id}>
                <div className="text-sm text-muted-foreground">{qText(x)}</div>
                <div className="font-semibold">{answers[x.id] || "—"}</div>
              </div>
            ))}
            {photos.length > 0 && <div className="font-semibold">📷 {t("photosAdded", { count: photos.length })}</div>}
          </div>
          <label className="flex min-h-12 cursor-pointer items-center gap-3">
            <Switch checked={urgent} onCheckedChange={setUrgent} />
            <span className={cn("flex items-center gap-1 text-lg font-semibold", urgent && "text-danger")}>
              <FlameIcon className="size-5" /> {t("needToday")}
            </span>
          </label>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={sending}>
              <ArrowLeftIcon /> {t("back")}
            </Button>
            <Button size="lg" className="flex-1" onClick={send} disabled={sending}>
              {sending ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
              {sending ? t("sending") : t("send")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
