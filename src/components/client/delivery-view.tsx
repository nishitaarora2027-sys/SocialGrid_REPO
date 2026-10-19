"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  FileArchiveIcon,
  Loader2Icon,
  PencilIcon,
  Share2Icon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { mediaUrl } from "@/components/shared/option-preview";
import { recordDownload } from "@/lib/actions/client";
import { celebrate, copyText, downloadOne, downloadZip, shareFiles, type DownloadItem } from "@/lib/browser/media";
import type { ContentOption } from "@/lib/types";

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "post";
}

function captionText(o: Pick<ContentOption, "caption" | "hashtags">) {
  return [o.caption, o.hashtags].filter(Boolean).join("\n\n");
}

export function celebrateOnce(optionId: string) {
  try {
    const key = `sg-celebrated-${optionId}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
  } catch {
    // storage unavailable: celebrate anyway
  }
  void celebrate();
}

/** Download / copy caption / share for one delivered option */
export function usePostActions(option: ContentOption | null, urls: Record<string, string>, businessName: string) {
  const t = useTranslations("delivery");
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  if (!option) return null;

  const base = `${slug(businessName)}-${new Date(option.delivered_at ?? option.created_at).toISOString().slice(0, 10)}`;
  const items: DownloadItem[] = option.media
    .map((m, i) => {
      const url = mediaUrl(urls, m.path);
      const ext = m.path.split(".").pop() ?? (m.type === "video" ? "mp4" : "jpg");
      return url ? { url, filename: option.media.length > 1 ? `${base}-${i + 1}.${ext}` : `${base}.${ext}` } : null;
    })
    .filter(Boolean) as DownloadItem[];
  const caption = captionText(option);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch {
      toast.error(t("downloadFailed"));
    } finally {
      setBusy(null);
    }
  };

  const onDownloadAll = () =>
    run("download", async () => {
      if (items.length > 1) await downloadZip(items, `${base}.zip`);
      else await downloadOne(items[0]);
      void recordDownload(option.id, "download");
      celebrateOnce(option.id);
      toast.success(t("downloaded"));
    });

  const onCopy = async () => {
    if (await copyText(caption)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      void recordDownload(option.id, "copy");
      toast.success(t("copied"));
    }
  };

  const onShare = () =>
    run("share", async () => {
      const r = await shareFiles(items, caption);
      if (r === "shared") {
        void recordDownload(option.id, "share");
        celebrateOnce(option.id);
      } else if (r === "unsupported") {
        toast(t("shareUnsupported"));
      }
    });

  return { items, caption, base, busy, copied, run, onDownloadAll, onCopy, onShare };
}

export function DeliveryView({
  option,
  urls,
  businessName,
  open,
  onOpenChange,
  onMakeChanges,
}: {
  option: ContentOption | null;
  urls: Record<string, string>;
  businessName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMakeChanges?: () => void;
}) {
  const t = useTranslations("delivery");
  const tTypes = useTranslations("contentTypes");
  const tCommon = useTranslations("common");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const actions = usePostActions(option, urls, businessName);

  if (!option) return null;

  const reel = option.reel_fields ?? {};
  const isReel = option.content_type === "reel";
  const { items, caption, busy, copied, run, onDownloadAll, onCopy, onShare } = actions!;

  const lines = (s?: string) => (s ?? "").split("\n").map((l) => l.trim()).filter(Boolean);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto h-[95dvh] max-w-2xl gap-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <SheetTitle>{t("yourPost")}</SheetTitle>
            <SheetDescription>{tTypes(option.content_type as never)}</SheetDescription>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="sm">
              <XIcon /> {tCommon("close")}
            </Button>
          </SheetClose>
        </div>

        {/* Media */}
        {items.length > 0 && (
          <div className="scrollbar-none -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5">
            {option.media.map((m, i) => {
              const url = mediaUrl(urls, m.path);
              if (!url) return null;
              return (
                <div key={m.path} className={items.length > 1 ? "w-[85%] shrink-0 snap-center" : "w-full"}>
                  {m.type === "video" ? (
                    <video src={url} controls playsInline className="max-h-[60dvh] w-full rounded-[16px] bg-black" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="" className="max-h-[60dvh] w-full rounded-[16px] bg-muted object-contain" />
                  )}
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        run(`one-${i}`, async () => {
                          await downloadOne(items[i]);
                          void recordDownload(option.id, "download");
                        })
                      }
                      className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border text-sm font-semibold"
                    >
                      {busy === `one-${i}` ? <Loader2Icon className="size-4 animate-spin" /> : <DownloadIcon className="size-4" />}
                      {t("downloadSlide", { n: i + 1 })}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Main actions */}
        <div className="grid gap-2.5">
          {items.length > 0 && (
            <Button size="lg" onClick={onDownloadAll} disabled={!!busy}>
              {busy === "download" ? (
                <Loader2Icon className="animate-spin" />
              ) : items.length > 1 ? (
                <FileArchiveIcon />
              ) : (
                <DownloadIcon />
              )}
              {items.length > 1 ? t("downloadAll", { count: items.length }) : t("download")}
            </Button>
          )}
          {caption && (
            <Button size="lg" variant={copied ? "success" : "outline"} onClick={onCopy}>
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? t("copiedShort") : t("copyCaption")}
            </Button>
          )}
          {items.length > 0 && (
            <Button size="lg" variant="outline" onClick={onShare} disabled={!!busy}>
              {busy === "share" ? <Loader2Icon className="animate-spin" /> : <Share2Icon />}
              {t("share")}
            </Button>
          )}
        </div>

        {/* Reel filming checklist */}
        {isReel && (
          <div className="space-y-4 rounded-[16px] bg-secondary/60 p-4">
            <h3 className="text-lg font-bold">{t("filmingChecklist")}</h3>
            {reel.script && (
              <section>
                <h4 className="mb-1 font-bold">{t("script")}</h4>
                <p className="whitespace-pre-wrap">{reel.script}</p>
              </section>
            )}
            {lines(reel.shot_list).length > 0 && (
              <section>
                <h4 className="mb-2 font-bold">{t("shotList")}</h4>
                <ul className="space-y-2">
                  {lines(reel.shot_list).map((shot, i) => {
                    const id = `${option.id}-shot-${i}`;
                    return (
                      <li key={id} className="flex items-start gap-3">
                        <Checkbox
                          id={id}
                          checked={!!checked[id]}
                          onCheckedChange={(v) => setChecked((c) => ({ ...c, [id]: !!v }))}
                          className="mt-0.5"
                        />
                        <label htmlFor={id} className={checked[id] ? "text-muted-foreground line-through" : ""}>
                          {shot}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
            {reel.on_screen_text && (
              <section>
                <h4 className="mb-1 font-bold">{t("onScreenText")}</h4>
                <p className="whitespace-pre-wrap">{reel.on_screen_text}</p>
              </section>
            )}
            {reel.audio_mood && (
              <section>
                <h4 className="mb-1 font-bold">{t("audioMood")}</h4>
                <p>{reel.audio_mood}</p>
              </section>
            )}
          </div>
        )}

        {caption && (
          <div className="rounded-[16px] border bg-card p-4">
            <h3 className="mb-1 font-bold">{t("caption")}</h3>
            <p className="whitespace-pre-wrap">{caption}</p>
          </div>
        )}

        {onMakeChanges && (
          <Button variant="secondary" size="lg" onClick={onMakeChanges}>
            <PencilIcon /> {t("makeChanges")}
          </Button>
        )}
      </SheetContent>
    </Sheet>
  );
}
