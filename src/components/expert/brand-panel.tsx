"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BanIcon, BookOpenIcon, ListChecksIcon, PaletteIcon, StarIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { OptionPreview } from "@/components/shared/option-preview";
import { PHOTO_CHECKLIST } from "@/lib/brand-options";
import { BUCKETS } from "@/lib/config";
import { formatPrice } from "@/lib/format";
import type { BrandProfile, Business, ContentOption, Offering, Rule } from "@/lib/types";

/** Always-visible brand summary so experts stay on-brand */
export function BrandPanel({
  business,
  brand,
  offerings,
  rules,
  recentPosts,
  urls,
}: {
  business: Business;
  brand: BrandProfile | null;
  offerings: Offering[];
  rules: Rule[];
  recentPosts: ContentOption[];
  urls: Record<string, string>;
}) {
  const t = useTranslations("expert.brandPanel");
  const tOpt = useTranslations("brandOptions");
  const tCheck = useTranslations("expert.checklist");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const logo = brand?.logo_path ? urls[`${BUCKETS.brandAssets}/${brand.logo_path}`] : null;
  const checklist = business.industry === "salon" ? PHOTO_CHECKLIST.salon : PHOTO_CHECKLIST.food;
  const checklistKey = business.industry === "salon" ? "salon" : "food";

  return (
    <aside className="space-y-4 xl:sticky xl:top-4 xl:max-h-[calc(100dvh-2rem)] xl:overflow-y-auto">
      <div className="space-y-3 rounded-2xl border bg-card p-4">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logo && <img src={logo} alt="" className="size-12 rounded-xl border object-cover" />}
          <h2 className="flex items-center gap-2 font-bold">
            <PaletteIcon className="size-5" /> {t("title")}
          </h2>
        </div>
        {!brand ? (
          <p className="text-sm text-muted-foreground">{t("noBrand")}</p>
        ) : (
          <dl className="space-y-2 text-sm">
            <div className="flex gap-2">
              {(["primary", "secondary", "accent"] as const).map((k) => (
                <span key={k} className="flex items-center gap-1">
                  <span className="size-6 rounded-full border" style={{ background: brand.colors?.[k] }} />
                  <code className="text-xs">{brand.colors?.[k]}</code>
                </span>
              ))}
            </div>
            <Row label={t("font")} value={tOpt(`font.${brand.font_style}` as never)} />
            <Row label={t("tone")} value={tOpt(`tone.${brand.tone}` as never)} />
            <Row
              label={t("languages")}
              value={brand.content_languages.map((l) => tOpt(`lang.${l}` as never)).join(", ") + ` (${t("default")}: ${tOpt(`lang.${brand.default_language}` as never)})`}
            />
            <Row label={t("emoji")} value={tOpt(`emoji.${brand.emoji_level}` as never)} />
            <Row
              label={t("audience")}
              value={[...brand.audience_tags.map((a) => tOpt(`audience.${a}` as never)), brand.audience].filter(Boolean).join(", ")}
            />
            <Row label={t("signature")} value={brand.signature_items} />
            <Row label={t("offers")} value={brand.current_offers} />
            <Row label={t("timings")} value={brand.timings} />
            <Row label={t("contact")} value={[brand.contact_phone, brand.address].filter(Boolean).join(" · ")} />
          </dl>
        )}
      </div>

      {brand && (brand.avoid_list.length > 0 || brand.avoid_custom) && (
        <div className="space-y-2 rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-4">
          <h3 className="flex items-center gap-2 font-bold text-destructive">
            <BanIcon className="size-5" /> {t("avoid")}
          </h3>
          <ul className="list-inside list-disc space-y-0.5 text-sm">
            {brand.avoid_list.map((a) => (
              <li key={a}>{tOpt(`avoid.${a}` as never)}</li>
            ))}
            {brand.avoid_custom && <li className="whitespace-pre-wrap">{brand.avoid_custom}</li>}
          </ul>
          {!business.photo_consent && <p className="text-sm font-semibold text-destructive">{t("noPhotoConsent")}</p>}
        </div>
      )}

      {rules.length > 0 && (
        <div className="space-y-2 rounded-2xl border bg-card p-4">
          <h3 className="flex items-center gap-2 font-bold">
            <BookOpenIcon className="size-5" /> {t("rules")}
          </h3>
          <ul className="space-y-1.5 text-sm">
            {rules.map((r) => (
              <li key={r.id} className="flex gap-2">
                <span className="shrink-0 rounded bg-muted px-1.5 text-xs leading-5 font-semibold uppercase">{t(`scope.${r.scope}`)}</span>
                <span>{r.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2 rounded-2xl border bg-card p-4">
        <h3 className="flex items-center gap-2 font-bold">
          <ListChecksIcon className="size-5" /> {t("checklist")}
        </h3>
        <ul className="space-y-2 text-sm">
          {checklist.map((k) => (
            <li key={k} className="flex items-start gap-2">
              <Checkbox
                id={`chk-${k}`}
                checked={!!checked[k]}
                onCheckedChange={(v) => setChecked((c) => ({ ...c, [k]: !!v }))}
                className="mt-0.5 size-5"
              />
              <label htmlFor={`chk-${k}`}>{tCheck(`${checklistKey}.${k}` as never)}</label>
            </li>
          ))}
        </ul>
      </div>

      {offerings.length > 0 && (
        <div className="space-y-2 rounded-2xl border bg-card p-4">
          <h3 className="font-bold">{business.industry === "salon" ? t("services") : t("menu")}</h3>
          <ul className="space-y-1 text-sm">
            {offerings.map((o) => (
              <li key={o.id} className="flex justify-between gap-2">
                <span className="flex items-center gap-1">
                  {o.is_signature && <StarIcon className="size-3.5 fill-warning text-warning" />}
                  {o.name}
                </span>
                <span className="text-muted-foreground">{formatPrice(o.price)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(brand?.example_paths?.length ?? 0) > 0 && (
        <div className="space-y-2 rounded-2xl border bg-card p-4">
          <h3 className="font-bold">{t("likedExamples")}</h3>
          <div className="grid grid-cols-3 gap-2">
            {brand!.example_paths.map((p) => {
              const url = urls[`${BUCKETS.brandAssets}/${p}`];
              // eslint-disable-next-line @next/next/no-img-element
              return url ? <img key={p} src={url} alt="" className="aspect-square rounded-lg object-cover" /> : null;
            })}
          </div>
        </div>
      )}

      {recentPosts.length > 0 && (
        <div className="space-y-2 rounded-2xl border bg-card p-4">
          <h3 className="font-bold">{t("recentPosts")}</h3>
          <div className="grid grid-cols-3 gap-2">
            {recentPosts.map((o) => (
              <OptionPreview key={o.id} option={o} urls={urls} />
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-semibold text-muted-foreground uppercase">{label}</dt>
      <dd className="whitespace-pre-wrap">{value}</dd>
    </div>
  );
}
