"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CameraIcon, ClockIcon, Loader2Icon, MapPinIcon, PaletteIcon, PencilIcon, PhoneIcon, SaveIcon, StarIcon, TagIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { addBrandPhotos, updateOfferingPrice, updateTimings } from "@/lib/actions/client";
import { compressImage, uploadFile } from "@/lib/browser/media";
import { formatPhone } from "@/lib/auth/phone";
import { BUCKETS } from "@/lib/config";
import { formatPrice } from "@/lib/format";
import type { BrandProfile, Business, Offering } from "@/lib/types";

/** Read-mostly brand page. Clients can update timings and prices, and add photos. */
export function BrandView({
  business,
  brand,
  offerings,
  photos,
  urls,
}: {
  business: Business;
  brand: BrandProfile | null;
  offerings: Offering[];
  photos: { id: string; path: string }[];
  urls: Record<string, string>;
}) {
  const t = useTranslations("brand");
  const tOpts = useTranslations("brandOptions");
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const logo = brand?.logo_path ? urls[`${BUCKETS.brandAssets}/${brand.logo_path}`] : null;

  const onPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const paths = [];
      for (const f of Array.from(files).slice(0, 10)) {
        paths.push(await uploadFile(BUCKETS.clientUploads, business.id, await compressImage(f), f.name));
      }
      const res = await addBrandPhotos(paths);
      if (res.ok) {
        toast.success(t("photosAdded"));
        router.refresh();
      }
    } catch {
      toast.error(t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="flex-1 space-y-4 px-4 py-4">
      <div className="flex items-center gap-4">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="size-20 rounded-2xl border object-cover" />
        ) : (
          <div className="flex size-20 items-center justify-center rounded-2xl bg-primary text-3xl font-bold text-primary-foreground">
            {business.name.slice(0, 1)}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold">{business.name}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClockIcon className="size-5 text-primary" /> {t("timings")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TimingsEditor initial={brand?.timings ?? ""} />
        </CardContent>
      </Card>

      {offerings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TagIcon className="size-5 text-primary" /> {business.industry === "salon" ? t("services") : t("menu")}
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {offerings.map((o) => (
              <OfferingRow key={o.id} offering={o} photo={o.photo_path ? urls[`${BUCKETS.brandAssets}/${o.photo_path}`] : undefined} />
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CameraIcon className="size-5 text-primary" /> {t("photos")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground">{t("photosHelp")}</p>
          <Button variant="outline" size="lg" className="w-full" onClick={() => fileInput.current?.click()} disabled={uploading}>
            {uploading ? <Loader2Icon className="animate-spin" /> : <CameraIcon />} {t("addPhotos")}
          </Button>
          <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => onPhotos(e.target.files)} />
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p) => {
                const url = urls[`${BUCKETS.clientUploads}/${p.path}`];
                // eslint-disable-next-line @next/next/no-img-element
                return url ? <img key={p.id} src={url} alt="" className="aspect-square w-full rounded-xl object-cover" /> : null;
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {brand && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PaletteIcon className="size-5 text-primary" /> {t("look")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              {(["primary", "secondary", "accent"] as const).map((k) => (
                <div key={k} className="flex flex-col items-center gap-1">
                  <span className="size-12 rounded-full border-2" style={{ background: brand.colors?.[k] }} />
                  <span className="text-xs text-muted-foreground">{t(`colors.${k}`)}</span>
                </div>
              ))}
            </div>
            <Info label={t("tone")} value={tOpts.has(`tone.${brand.tone}` as never) ? tOpts(`tone.${brand.tone}` as never) : brand.tone} />
            <Info label={t("signature")} value={brand.signature_items} />
            <Info label={t("offers")} value={brand.current_offers} />
          </CardContent>
        </Card>
      )}

      {brand && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPinIcon className="size-5 text-primary" /> {t("contact")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Info label={t("address")} value={brand.address} />
            <Info label={t("phone")} value={formatPhone(brand.contact_phone)} icon={<PhoneIcon className="size-4" />} />
            <Info label="WhatsApp" value={formatPhone(brand.whatsapp)} />
          </CardContent>
        </Card>
      )}
      <p className="pb-4 text-center text-sm text-muted-foreground">{t("otherChanges")}</p>
    </main>
  );
}

function Info({ label, value, icon }: { label: string; value: string | null | undefined; icon?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="flex items-center gap-1.5 font-medium whitespace-pre-wrap">
        {icon}
        {value}
      </div>
    </div>
  );
}

function TimingsEditor({ initial }: { initial: string }) {
  const t = useTranslations("brand");
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium whitespace-pre-wrap">{initial || t("notSet")}</p>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <PencilIcon /> {t("change")}
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <Textarea value={value} onChange={(e) => setValue(e.target.value)} placeholder={t("timingsPlaceholder")} />
      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => setEditing(false)}>
          <XIcon /> {t("cancel")}
        </Button>
        <Button
          className="flex-1"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await updateTimings(value);
              if (res.ok) {
                toast.success(t("saved"));
                setEditing(false);
                router.refresh();
              }
            })
          }
        >
          <SaveIcon /> {t("save")}
        </Button>
      </div>
    </div>
  );
}

function OfferingRow({ offering, photo }: { offering: Offering; photo?: string }) {
  const t = useTranslations("brand");
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(offering.price?.toString() ?? "");
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="flex items-center gap-3 py-3">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 font-semibold">
          {offering.is_signature && <StarIcon className="size-4 fill-warning text-warning" />}
          {offering.name}
        </div>
        {!editing && <div className="text-muted-foreground">{formatPrice(offering.price) || "—"}</div>}
        {editing && (
          <div className="mt-1 flex gap-2">
            <Input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))} className="h-11" />
            <Button
              size="sm"
              className="h-11"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await updateOfferingPrice(offering.id, price ? Number(price) : null);
                  if (res.ok) {
                    toast.success(t("saved"));
                    setEditing(false);
                    router.refresh();
                  }
                })
              }
            >
              <SaveIcon /> {t("save")}
            </Button>
          </div>
        )}
      </div>
      {!editing && (
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <PencilIcon /> {t("changePrice")}
        </Button>
      )}
    </div>
  );
}
