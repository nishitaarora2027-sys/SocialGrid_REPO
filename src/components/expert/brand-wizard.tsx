"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, Loader2Icon, SaveIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateBrandProfile, updateBusiness } from "@/lib/actions/expert-clients";
import { compressImage, uploadFile } from "@/lib/browser/media";
import { AUDIENCE_TAGS, AVOID_DEFAULTS, CONTENT_LANGUAGES, EMOJI_LEVELS, FONT_STYLES, TONES } from "@/lib/brand-options";
import { BUCKETS } from "@/lib/config";
import type { BrandProfile, Business, EmojiLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

const STEPS = ["basics", "look", "voice", "audience", "avoid"] as const;
type Step = (typeof STEPS)[number];

const DEFAULT_BRAND: Omit<BrandProfile, "business_id" | "updated_at"> = {
  owner_name: null,
  address: null,
  maps_link: null,
  timings: null,
  contact_phone: null,
  whatsapp: null,
  logo_path: null,
  colors: { primary: "#E8590C", secondary: "#FFF4E6", accent: "#2B8A3E" },
  font_style: "modern",
  example_paths: [],
  tone: "friendly",
  content_languages: ["en"],
  default_language: "en",
  emoji_level: "some",
  audience: null,
  audience_tags: [],
  avoid_list: [],
  avoid_custom: null,
  signature_items: null,
  current_offers: null,
};

/**
 * Brand profile editor. During onboarding (`wizard`) it walks step by step;
 * otherwise every step is reachable from the step bar.
 */
export function BrandWizard({
  business,
  brand,
  urls,
  wizard,
  onFinish,
}: {
  business: Business;
  brand: BrandProfile | null;
  urls: Record<string, string>;
  wizard: boolean;
  onFinish: () => void;
}) {
  const t = useTranslations("expert.brand");
  const tOpt = useTranslations("brandOptions");
  const router = useRouter();
  const [step, setStep] = useState<Step>("basics");
  const [b, setB] = useState({ ...DEFAULT_BRAND, ...(brand ?? {}) });
  const [name, setName] = useState(business.name);
  const [localUrls, setLocalUrls] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const allUrls = { ...urls, ...localUrls };
  const set = <K extends keyof typeof b>(k: K, v: (typeof b)[K]) => setB((x) => ({ ...x, [k]: v }));
  const toggle = (k: "content_languages" | "audience_tags" | "avoid_list", v: string) =>
    set(k, b[k].includes(v) ? b[k].filter((x) => x !== v) : [...b[k], v]);

  const idx = STEPS.indexOf(step);
  const save = (then?: () => void) =>
    start(async () => {
      const { ...payload } = b;
      const res = await updateBrandProfile(business.id, payload as never);
      if (step === "basics" && name.trim() && name !== business.name) {
        await updateBusiness(business.id, { name, ownerName: b.owner_name || undefined });
      } else if (step === "basics" && b.owner_name) {
        await updateBusiness(business.id, { ownerName: b.owner_name });
      }
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t("saved"));
      router.refresh();
      then?.();
    });

  return (
    <div className="space-y-4">
      <ol className="scrollbar-none flex gap-2 overflow-x-auto">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => setStep(s)}
              className={cn(
                "flex h-10 items-center gap-2 rounded-full border px-3 text-sm font-semibold whitespace-nowrap",
                s === step ? "border-primary bg-primary text-primary-foreground" : i < idx ? "border-primary text-primary" : "bg-card",
              )}
            >
              {i < idx && wizard ? <CheckIcon className="size-4" /> : <span>{i + 1}</span>} {t(`steps.${s}`)}
            </button>
          </li>
        ))}
      </ol>

      <div className="space-y-4 rounded-[16px] border bg-card p-4">
        {step === "basics" && (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("businessName")}>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label={t("ownerName")}>
              <Input value={b.owner_name ?? ""} onChange={(e) => set("owner_name", e.target.value)} />
            </Field>
            <Field label={t("address")} className="md:col-span-2">
              <Textarea value={b.address ?? ""} onChange={(e) => set("address", e.target.value)} className="min-h-16" />
            </Field>
            <Field label={t("mapsLink")}>
              <Input value={b.maps_link ?? ""} onChange={(e) => set("maps_link", e.target.value)} placeholder="https://maps.app.goo.gl/..." />
            </Field>
            <Field label={t("timings")}>
              <Input value={b.timings ?? ""} onChange={(e) => set("timings", e.target.value)} placeholder={t("timingsPlaceholder")} />
            </Field>
            <Field label={t("contactPhone")}>
              <Input value={b.contact_phone ?? ""} onChange={(e) => set("contact_phone", e.target.value)} inputMode="tel" />
            </Field>
            <Field label="WhatsApp">
              <Input value={b.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} inputMode="tel" />
            </Field>
          </div>
        )}

        {step === "look" && (
          <div className="space-y-5">
            <Field label={t("logo")}>
              <ImageUpload
                businessId={business.id}
                paths={b.logo_path ? [b.logo_path] : []}
                urls={allUrls}
                max={1}
                onUploaded={(path, url) => {
                  setLocalUrls((u) => ({ ...u, [`${BUCKETS.brandAssets}/${path}`]: url }));
                  set("logo_path", path);
                }}
                onRemove={() => set("logo_path", null)}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              {(["primary", "secondary", "accent"] as const).map((k) => (
                <Field key={k} label={t(`colors.${k}`)}>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={b.colors[k]}
                      onChange={(e) => set("colors", { ...b.colors, [k]: e.target.value })}
                      className="h-12 w-16 cursor-pointer rounded-[12px] border bg-card p-1"
                    />
                    <Input value={b.colors[k]} onChange={(e) => set("colors", { ...b.colors, [k]: e.target.value })} className="font-mono" />
                  </div>
                </Field>
              ))}
            </div>
            <Field label={t("font")}>
              <Choices options={FONT_STYLES} value={[b.font_style]} label={(f) => tOpt(`font.${f}`)} onToggle={(f) => set("font_style", f)} />
            </Field>
            <Field label={t("examples")}>
              <ImageUpload
                businessId={business.id}
                folder="examples"
                paths={b.example_paths}
                urls={allUrls}
                max={12}
                onUploaded={(path, url) => {
                  setLocalUrls((u) => ({ ...u, [`${BUCKETS.brandAssets}/${path}`]: url }));
                  setB((x) => ({ ...x, example_paths: [...x.example_paths, path] }));
                }}
                onRemove={(path) => set("example_paths", b.example_paths.filter((p) => p !== path))}
              />
            </Field>
          </div>
        )}

        {step === "voice" && (
          <div className="space-y-5">
            <Field label={t("tone")}>
              <Choices options={TONES} value={[b.tone]} label={(x) => tOpt(`tone.${x}`)} onToggle={(x) => set("tone", x)} />
            </Field>
            <Field label={t("languages")}>
              <Choices options={CONTENT_LANGUAGES} value={b.content_languages} label={(x) => tOpt(`lang.${x}`)} onToggle={(x) => toggle("content_languages", x)} />
            </Field>
            <Field label={t("defaultLanguage")}>
              <Choices
                options={CONTENT_LANGUAGES}
                value={[b.default_language]}
                label={(x) => tOpt(`lang.${x}`)}
                onToggle={(x) => {
                  set("default_language", x);
                  if (!b.content_languages.includes(x)) set("content_languages", [...b.content_languages, x]);
                }}
              />
            </Field>
            <Field label={t("emoji")}>
              <Choices options={EMOJI_LEVELS} value={[b.emoji_level]} label={(x) => tOpt(`emoji.${x}`)} onToggle={(x) => set("emoji_level", x as EmojiLevel)} />
            </Field>
            <Field label={t("signature")}>
              <Textarea value={b.signature_items ?? ""} onChange={(e) => set("signature_items", e.target.value)} className="min-h-16" />
            </Field>
            <Field label={t("offers")}>
              <Textarea value={b.current_offers ?? ""} onChange={(e) => set("current_offers", e.target.value)} className="min-h-16" />
            </Field>
          </div>
        )}

        {step === "audience" && (
          <div className="space-y-5">
            <Field label={t("audienceTags")}>
              <Choices options={AUDIENCE_TAGS} value={b.audience_tags} label={(x) => tOpt(`audience.${x}`)} onToggle={(x) => toggle("audience_tags", x)} />
            </Field>
            <Field label={t("audience")}>
              <Textarea value={b.audience ?? ""} onChange={(e) => set("audience", e.target.value)} placeholder={t("audiencePlaceholder")} />
            </Field>
          </div>
        )}

        {step === "avoid" && (
          <div className="space-y-5">
            <Field label={t("avoid")}>
              <div className="grid gap-2 sm:grid-cols-2">
                {AVOID_DEFAULTS.map((a) => (
                  <label key={a} className={cn("flex min-h-12 cursor-pointer items-center gap-3 rounded-[12px] border px-3", b.avoid_list.includes(a) && "border-danger bg-danger/5")}>
                    <input type="checkbox" className="size-5 accent-[var(--destructive)]" checked={b.avoid_list.includes(a)} onChange={() => toggle("avoid_list", a)} />
                    <span className="text-sm font-medium">{tOpt(`avoid.${a}`)}</span>
                  </label>
                ))}
              </div>
            </Field>
            <Field label={t("avoidCustom")}>
              <Textarea value={b.avoid_custom ?? ""} onChange={(e) => set("avoid_custom", e.target.value)} />
            </Field>
            <label className="flex min-h-12 items-center gap-3 rounded-[12px] border px-3">
              <input
                type="checkbox"
                className="size-5"
                defaultChecked={business.photo_consent}
                onChange={(e) => void updateBusiness(business.id, { photo_consent: e.target.checked })}
              />
              <span className="font-medium">{t("photoConsent")}</span>
            </label>
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t pt-4">
          {idx > 0 && (
            <Button variant="ghost" onClick={() => setStep(STEPS[idx - 1])}>
              <ArrowLeftIcon /> {t("back")}
            </Button>
          )}
          <Button variant="outline" disabled={pending} onClick={() => save()}>
            {pending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />} {t("save")}
          </Button>
          {idx < STEPS.length - 1 ? (
            <Button className="ml-auto" disabled={pending} onClick={() => save(() => setStep(STEPS[idx + 1]))}>
              {t("saveNext")} <ArrowRightIcon />
            </Button>
          ) : (
            <Button className="ml-auto" variant="success" disabled={pending} onClick={() => save(onFinish)}>
              <CheckIcon /> {t("finish")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Choices<T extends string>({
  options,
  value,
  label,
  onToggle,
}: {
  options: readonly T[];
  value: string[];
  label: (o: T) => string;
  onToggle: (o: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onToggle(o)}
          className={cn(
            "min-h-11 rounded-full border px-4 text-sm font-semibold",
            value.includes(o) ? "border-primary bg-primary text-primary-foreground" : "bg-card",
          )}
        >
          {label(o)}
        </button>
      ))}
    </div>
  );
}

function ImageUpload({
  businessId,
  folder,
  paths,
  urls,
  max,
  onUploaded,
  onRemove,
}: {
  businessId: string;
  folder?: string;
  paths: string[];
  urls: Record<string, string>;
  max: number;
  onUploaded: (path: string, localUrl: string) => void;
  onRemove: (path: string) => void;
}) {
  const t = useTranslations("expert.brand");
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      {paths.map((p) => {
        const url = urls[`${BUCKETS.brandAssets}/${p}`];
        return (
          <div key={p} className="relative size-24">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {url ? <img src={url} alt="" className="size-24 rounded-[12px] border object-cover" /> : <div className="size-24 rounded-[12px] bg-muted" />}
            <button
              type="button"
              onClick={() => onRemove(p)}
              className="absolute -top-2 -right-2 flex size-8 items-center justify-center rounded-full bg-foreground text-background"
              aria-label={t("remove")}
            >
              <Trash2Icon className="size-4" />
            </button>
          </div>
        );
      })}
      {paths.length < max && (
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="flex size-24 flex-col items-center justify-center gap-1 rounded-[12px] border border-dashed text-[13px] font-semibold text-muted-foreground hover:border-primary hover:text-primary"
        >
          {busy ? <Loader2Icon className="size-5 animate-spin" /> : <UploadIcon className="size-5" />}
          {t("upload")}
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple={max > 1}
        hidden
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []).slice(0, max - paths.length);
          e.target.value = "";
          setBusy(true);
          try {
            for (const f of files) {
              const blob = await compressImage(f, { quality: 0.9 });
              const path = await uploadFile(BUCKETS.brandAssets, folder ? `${businessId}/${folder}` : businessId, blob, f.name);
              onUploaded(path, URL.createObjectURL(blob));
            }
          } catch {
            toast.error(t("uploadFailed"));
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
