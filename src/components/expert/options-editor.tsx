"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircle2Icon,
  Loader2Icon,
  PlusIcon,
  SaveIcon,
  SparklesIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/expert/tag-input";
import { mediaUrl } from "@/components/shared/option-preview";
import { deliverOptions, saveDraftOptions, type OptionInput } from "@/lib/actions/expert-requests";
import { generateCaptionDrafts, generateRequestImage } from "@/lib/actions/ai";
import { compressImage, uploadFile } from "@/lib/browser/media";
import { TAG_SUGGESTIONS } from "@/lib/brand-options";
import { BUCKETS, LIMITS } from "@/lib/config";
import { CONTENT_TYPES, type ContentOption, type ContentType, type MediaItem, type RequestRow, type Revision } from "@/lib/types";

type Draft = OptionInput & { key: string };

function toDraft(o: ContentOption): Draft {
  return {
    key: o.id,
    id: o.id,
    content_type: o.content_type,
    media: o.media,
    caption: o.caption,
    hashtags: o.hashtags,
    language: o.language,
    reel_fields: o.reel_fields ?? {},
    tags: o.tags ?? {},
    why_it_works: o.why_it_works,
    expert_notes: o.expert_notes,
  };
}

function emptyDraft(type: ContentType, language: string): Draft {
  return {
    key: crypto.randomUUID(),
    content_type: type,
    media: [],
    caption: "",
    hashtags: "",
    language,
    reel_fields: {},
    tags: {},
    why_it_works: "",
    expert_notes: "",
  };
}

export function OptionsEditor({
  request,
  businessId,
  initial,
  urls,
  lastFeedback,
  ai,
}: {
  request: RequestRow;
  businessId: string;
  initial: ContentOption[];
  urls: Record<string, string>;
  lastFeedback: Revision | null;
  ai: { text: boolean; image: boolean };
}) {
  const t = useTranslations("expert.editor");
  const tChips = useTranslations("chips");
  const tOpt = useTranslations("brandOptions");
  const router = useRouter();
  const defaultType = (request.content_type ?? "single_post") as ContentType;
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    initial.length ? initial.map(toDraft) : [emptyDraft(defaultType, request.language ?? "en")],
  );
  const [localUrls, setLocalUrls] = useState<Record<string, string>>({});
  const [changeNote, setChangeNote] = useState("");
  const [saving, startSave] = useTransition();
  const [delivering, startDeliver] = useTransition();
  const [writing, startWriting] = useTransition();
  const [aiLanguage, setAiLanguage] = useState(request.language ?? "");
  // image ideas from the last AI draft, by draft key, used to prefill "Generate image"
  const [imageIdeas, setImageIdeas] = useState<Record<string, string>>({});

  const aiError = (error: string) => {
    toast.error(t.has(`ai.errors.${error}` as never) ? t(`ai.errors.${error}` as never) : t("ai.failed", { error }));
  };

  const writeWithAi = () => {
    const filled = drafts.some((d) => d.caption?.trim());
    if (filled && !window.confirm(t("ai.confirmReplace"))) return;
    startWriting(async () => {
      const res = await generateCaptionDrafts(request.id, LIMITS.optionsPerRequest, aiLanguage || undefined);
      if (!res.ok) {
        aiError(res.error);
        return;
      }
      const ideas: Record<string, string> = {};
      setDrafts((ds) => {
        const next = [...ds];
        res.drafts.forEach((g, i) => {
          const base = next[i] ?? emptyDraft((next[0]?.content_type as ContentType) ?? defaultType, request.language ?? "en");
          next[i] = {
            ...base,
            caption: g.caption,
            hashtags: g.hashtags,
            why_it_works: g.why_it_works || base.why_it_works,
            ...(aiLanguage ? { language: aiLanguage } : {}),
          };
          if (g.image_idea) ideas[next[i].key] = g.image_idea;
        });
        return next;
      });
      setImageIdeas(ideas);
      toast.success(t("ai.done", { n: res.drafts.length }));
    });
  };

  const update = (key: string, patch: Partial<Draft>) =>
    setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  const payload = () => drafts.map(({ key: _k, ...d }) => (void _k, d));

  const save = async () => {
    const res = await saveDraftOptions(request.id, payload());
    if (!res.ok) {
      toast.error(t.has(`errors.${res.error}` as never) ? t(`errors.${res.error}` as never) : res.error);
      return false;
    }
    // keep ids so the next save updates instead of inserting
    setDrafts((ds) => ds.map((d, i) => ({ ...d, id: res.ids[i] })));
    return true;
  };

  const deliver = () =>
    startDeliver(async () => {
      if (!(await save())) return;
      const res = await deliverOptions(request.id, changeNote || null);
      if (!res.ok) {
        toast.error(t.has(`errors.${res.error}` as never) ? t(`errors.${res.error}` as never) : res.error);
        return;
      }
      toast.success(t("delivered"));
      router.refresh();
    });

  return (
    <div className="space-y-4">
      {lastFeedback && request.current_revision > 0 && (
        <div className="rounded-2xl border-2 border-warning bg-warning/10 p-4">
          <div className="text-sm font-bold">{t("clientWantsChanges", { n: request.current_revision })}</div>
          <p className="mt-1 text-lg">
            {[lastFeedback.feedback_chip && tChips(lastFeedback.feedback_chip as never), lastFeedback.client_feedback]
              .filter(Boolean)
              .join(" — ")}
          </p>
        </div>
      )}

      {ai.text && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-primary/30 bg-primary/5 p-3">
          <SparklesIcon className="size-5 text-primary" />
          <span className="font-semibold">{t("ai.title")}</span>
          <NativeSelect value={aiLanguage} onChange={(e) => setAiLanguage(e.target.value)} className="w-40" aria-label={t("language")}>
            <option value="">{t("ai.brandLanguage")}</option>
            {["en", "hi", "hinglish"].map((l) => (
              <option key={l} value={l}>
                {tOpt(`lang.${l}` as never)}
              </option>
            ))}
          </NativeSelect>
          <Button onClick={writeWithAi} disabled={writing || saving || delivering}>
            {writing ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />} {writing ? t("ai.writing") : t("ai.write")}
          </Button>
          <p className="w-full text-xs text-muted-foreground">{t("ai.hint")}</p>
        </div>
      )}

      {drafts.map((d, i) => (
        <OptionForm
          key={d.key}
          index={i}
          draft={d}
          businessId={businessId}
          requestId={request.id}
          urls={{ ...urls, ...localUrls }}
          onUrl={(path, url) => setLocalUrls((u) => ({ ...u, [`${BUCKETS.deliverables}/${path}`]: url }))}
          onChange={(patch) => update(d.key, patch)}
          imageAi={ai.image}
          imageIdea={imageIdeas[d.key] ?? ""}
          onAiError={aiError}
          onRemove={drafts.length > 1 ? () => setDrafts((ds) => ds.filter((x) => x.key !== d.key)) : undefined}
        />
      ))}

      {drafts.length < LIMITS.optionsPerRequest && (
        <Button
          variant="outline"
          className="w-full border-dashed"
          onClick={() => setDrafts((ds) => [...ds, emptyDraft(ds[0]?.content_type as ContentType ?? defaultType, request.language ?? "en")])}
        >
          <PlusIcon /> {t("addOption")}
        </Button>
      )}

      {request.current_revision > 0 && (
        <div className="space-y-2 rounded-2xl border bg-card p-4">
          <Label htmlFor="change-note">{t("changeNote")}</Label>
          <Textarea id="change-note" value={changeNote} onChange={(e) => setChangeNote(e.target.value)} placeholder={t("changeNotePlaceholder")} />
        </div>
      )}

      <div className="sticky bottom-0 flex flex-wrap gap-2 rounded-2xl border bg-card/95 p-3 shadow-lg backdrop-blur">
        <Button variant="outline" disabled={saving || delivering} onClick={() => startSave(async () => {
          if (await save()) {
            toast.success(t("saved"));
            router.refresh();
          }
        })}>
          {saving ? <Loader2Icon className="animate-spin" /> : <SaveIcon />} {t("saveDraft")}
        </Button>
        <Button variant="success" className="flex-1" disabled={saving || delivering} onClick={deliver}>
          {delivering ? <Loader2Icon className="animate-spin" /> : <CheckCircle2Icon />} {t("approveDeliver")}
        </Button>
        <p className="w-full text-xs text-muted-foreground">{t("deliverHint")}</p>
      </div>
    </div>
  );
}

function OptionForm({
  index,
  draft,
  businessId,
  requestId,
  urls,
  onUrl,
  onChange,
  onRemove,
  imageAi,
  imageIdea,
  onAiError,
}: {
  index: number;
  draft: Draft;
  businessId: string;
  requestId: string;
  urls: Record<string, string>;
  onUrl: (path: string, url: string) => void;
  onChange: (patch: Partial<Draft>) => void;
  onRemove?: () => void;
  imageAi: boolean;
  imageIdea: string;
  onAiError: (error: string) => void;
}) {
  const t = useTranslations("expert.editor");
  const tTypes = useTranslations("contentTypes");
  const tTags = useTranslations("tags");
  const tOpt = useTranslations("brandOptions");
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [idea, setIdea] = useState(imageIdea);
  const [ideaFrom, setIdeaFrom] = useState(imageIdea);
  if (imageIdea !== ideaFrom) {
    // a new AI draft arrived: take its image idea
    setIdeaFrom(imageIdea);
    setIdea(imageIdea);
  }
  const [painting, startPainting] = useTransition();
  const isReel = draft.content_type === "reel";
  const maxMedia =
    draft.content_type === "carousel" ? LIMITS.carouselMaxSlides : draft.content_type === "story" ? LIMITS.storyMaxItems : isReel ? 1 : draft.content_type === "caption_only" ? 0 : 1;

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const added: MediaItem[] = [];
    try {
      for (const f of Array.from(files).slice(0, Math.max(0, maxMedia - draft.media.length))) {
        const isVideo = f.type.startsWith("video/");
        if (isVideo && f.size > LIMITS.videoMaxBytes) {
          toast.error(t("videoTooBig", { name: f.name }));
          continue;
        }
        // keep deliverables sharp: only shrink big images, at high quality
        const blob = isVideo ? f : await compressImage(f, { quality: 0.9, skipBelowBytes: 1.5 * 1024 * 1024 });
        const path = await uploadFile(BUCKETS.deliverables, `${businessId}/${requestId}`, blob, f.name);
        onUrl(path, URL.createObjectURL(blob));
        added.push({ path, type: isVideo ? "video" : "image", name: f.name });
      }
      onChange({ media: [...draft.media, ...added] });
    } catch {
      toast.error(t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const paint = () =>
    startPainting(async () => {
      const res = await generateRequestImage(requestId, idea);
      if (!res.ok) {
        onAiError(res.error);
        return;
      }
      onUrl(res.path, res.url);
      onChange({ media: [...draft.media, { path: res.path, type: "image", name: "ai-image.png" }] });
    });

  const move = (i: number, dir: -1 | 1) => {
    const m = [...draft.media];
    const j = i + dir;
    if (j < 0 || j >= m.length) return;
    [m[i], m[j]] = [m[j], m[i]];
    onChange({ media: m });
  };

  const tagGroups = ["occasion", "style", "goal"] as const;

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-bold">{t("optionN", { n: index + 1 })}</h3>
        <div className="flex items-center gap-2">
          <NativeSelect value={draft.content_type} onChange={(e) => onChange({ content_type: e.target.value as ContentType })} className="w-44" aria-label={t("type")}>
            {CONTENT_TYPES.map((c) => (
              <option key={c} value={c}>
                {tTypes(c)}
              </option>
            ))}
          </NativeSelect>
          {onRemove && (
            <Button variant="ghost" size="sm" onClick={onRemove}>
              <Trash2Icon /> {t("remove")}
            </Button>
          )}
        </div>
      </div>

      {maxMedia > 0 && (
        <div className="space-y-2">
          <Label>
            {t("media")} {isReel && <span className="font-normal text-muted-foreground">({t("optionalVideo")})</span>}
          </Label>
          <div className="flex flex-wrap gap-2">
            {draft.media.map((m, i) => {
              const url = mediaUrl(urls, m.path);
              return (
                <div key={m.path} className="w-28 space-y-1">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-muted">
                    {url &&
                      (m.type === "video" ? (
                        <video src={url} className="h-full w-full object-cover" muted />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      ))}
                    <span className="absolute top-1 left-1 rounded bg-black/60 px-1.5 text-xs font-bold text-white">{i + 1}</span>
                  </div>
                  <div className="flex justify-between">
                    <button type="button" className="rounded p-1 hover:bg-accent disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t("moveUp")}>
                      <ArrowUpIcon className="size-4 -rotate-90" />
                    </button>
                    <button type="button" className="rounded p-1 text-destructive hover:bg-accent" onClick={() => onChange({ media: draft.media.filter((_, j) => j !== i) })} aria-label={t("remove")}>
                      <Trash2Icon className="size-4" />
                    </button>
                    <button type="button" className="rounded p-1 hover:bg-accent disabled:opacity-30" disabled={i === draft.media.length - 1} onClick={() => move(i, 1)} aria-label={t("moveDown")}>
                      <ArrowDownIcon className="size-4 -rotate-90" />
                    </button>
                  </div>
                </div>
              );
            })}
            {draft.media.length < maxMedia && (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                className="flex aspect-[4/5] w-28 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary"
              >
                {uploading ? <Loader2Icon className="size-6 animate-spin" /> : <UploadIcon className="size-6" />}
                {t("upload")}
              </button>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept={isReel || draft.content_type === "story" ? "image/*,video/*" : "image/*"}
            multiple={maxMedia > 1}
            hidden
            onChange={(e) => {
              void onFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <p className="text-xs text-muted-foreground">{t("mediaHint", { max: maxMedia })}</p>
          {imageAi && draft.media.length < maxMedia && (
            <div className="flex flex-wrap gap-2 rounded-xl bg-secondary/50 p-2">
              <Input
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder={t("ai.imagePlaceholder")}
                className="min-w-48 flex-1"
                aria-label={t("ai.imagePlaceholder")}
              />
              <Button variant="outline" onClick={paint} disabled={painting || !idea.trim()}>
                {painting ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />} {painting ? t("ai.painting") : t("ai.image")}
              </Button>
            </div>
          )}
        </div>
      )}

      {isReel && (
        <div className="grid gap-3 rounded-xl bg-secondary/50 p-3">
          {(["script", "shot_list", "on_screen_text", "audio_mood"] as const).map((f) => (
            <div key={f} className="space-y-1">
              <Label>{t(`reel.${f}`)}</Label>
              {f === "audio_mood" ? (
                <Input value={draft.reel_fields[f] ?? ""} onChange={(e) => onChange({ reel_fields: { ...draft.reel_fields, [f]: e.target.value } })} />
              ) : (
                <Textarea
                  value={draft.reel_fields[f] ?? ""}
                  placeholder={f === "shot_list" ? t("reel.shotListHint") : undefined}
                  onChange={(e) => onChange({ reel_fields: { ...draft.reel_fields, [f]: e.target.value } })}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-[1fr_10rem]">
        <div className="space-y-1">
          <Label>{t("caption")}</Label>
          <Textarea value={draft.caption ?? ""} onChange={(e) => onChange({ caption: e.target.value })} className="min-h-32" />
        </div>
        <div className="space-y-1">
          <Label>{t("language")}</Label>
          <NativeSelect value={draft.language} onChange={(e) => onChange({ language: e.target.value })}>
            {["en", "hi", "hinglish"].map((l) => (
              <option key={l} value={l}>
                {tOpt(`lang.${l}` as never)}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <div className="space-y-1">
        <Label>{t("hashtags")}</Label>
        <Input value={draft.hashtags ?? ""} onChange={(e) => onChange({ hashtags: e.target.value })} placeholder="#diwali #indore #sweets" />
      </div>

      <div className="space-y-3 rounded-xl border-2 border-primary/20 p-3">
        <div className="text-sm font-bold">
          {t("learning")} <span className="font-normal text-muted-foreground">— {t("learningHint")}</span>
        </div>
        {tagGroups.map((g) => (
          <div key={g} className="space-y-1">
            <Label>{t(`tags.${g}`)}</Label>
            <TagInput
              value={draft.tags[g] ?? []}
              onChange={(v) => onChange({ tags: { ...draft.tags, [g]: v } })}
              suggestions={TAG_SUGGESTIONS[g]}
              labelFor={(s) => (tTags.has(s as never) ? tTags(s as never) : s.replace(/_/g, " "))}
              placeholder={t("tagPlaceholder")}
            />
          </div>
        ))}
        <div className="space-y-1">
          <Label>{t("whyItWorks")}</Label>
          <Textarea value={draft.why_it_works ?? ""} onChange={(e) => onChange({ why_it_works: e.target.value })} className="min-h-16" />
        </div>
      </div>

      <div className="space-y-1">
        <Label>{t("internalNotes")}</Label>
        <Textarea value={draft.expert_notes ?? ""} onChange={(e) => onChange({ expert_notes: e.target.value })} className="min-h-16" placeholder={t("internalNotesHint")} />
      </div>
    </div>
  );
}
