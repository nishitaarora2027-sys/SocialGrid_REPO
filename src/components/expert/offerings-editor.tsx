"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageIcon, Loader2Icon, PencilIcon, PlusIcon, SaveIcon, StarIcon, Trash2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { deleteOffering, saveOffering } from "@/lib/actions/expert-clients";
import { compressImage, uploadFile } from "@/lib/browser/media";
import { BUCKETS } from "@/lib/config";
import { formatPrice } from "@/lib/format";
import type { Business, Offering } from "@/lib/types";

type Draft = { id?: string; name: string; price: string; description: string; photo_path: string | null; is_signature: boolean };
const empty: Draft = { name: "", price: "", description: "", photo_path: null, is_signature: false };

/** Menu items (food) or services (salon) with price and photo */
export function OfferingsEditor({ business, offerings, urls }: { business: Business; offerings: Offering[]; urls: Record<string, string> }) {
  const t = useTranslations("expert.offerings");
  const router = useRouter();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const isSalon = business.industry === "salon";

  const save = () =>
    start(async () => {
      if (!editing) return;
      const res = await saveOffering(business.id, {
        id: editing.id,
        name: editing.name,
        price: editing.price ? Number(editing.price) : null,
        description: editing.description || null,
        photo_path: editing.photo_path,
        is_signature: editing.is_signature,
      });
      if (!res.ok) return void toast.error(res.error);
      setEditing(null);
      setLocalUrl(null);
      router.refresh();
    });

  const photoUrl = (p: string | null) => (p ? urls[`${BUCKETS.brandAssets}/${p}`] : undefined);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{isSalon ? t("services") : t("menu")}</h2>
        {!editing && (
          <Button onClick={() => setEditing({ ...empty })}>
            <PlusIcon /> {t("add")}
          </Button>
        )}
      </div>

      {editing && (
        <div className="grid gap-3 rounded-[16px] border border-primary/30 bg-card p-4 md:grid-cols-[8rem_1fr]">
          <div>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex size-32 items-center justify-center overflow-hidden rounded-[12px] border border-dashed text-muted-foreground"
            >
              {uploading ? (
                <Loader2Icon className="size-6 animate-spin" />
              ) : localUrl || photoUrl(editing.photo_path) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={localUrl ?? photoUrl(editing.photo_path)} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-1 text-[13px] font-semibold">
                  <ImageIcon className="size-6" /> {t("photo")}
                </span>
              )}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                setUploading(true);
                try {
                  const blob = await compressImage(f, { quality: 0.85 });
                  const path = await uploadFile(BUCKETS.brandAssets, `${business.id}/offerings`, blob, f.name);
                  setLocalUrl(URL.createObjectURL(blob));
                  setEditing((d) => d && { ...d, photo_path: path });
                } catch {
                  toast.error(t("uploadFailed"));
                } finally {
                  setUploading(false);
                }
              }}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>{t("name")}</Label>
              <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus />
            </div>
            <div className="space-y-1">
              <Label>{t("price")}</Label>
              <Input inputMode="decimal" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value.replace(/[^\d.]/g, "") })} />
            </div>
            <label className="flex items-center gap-3 self-end pb-3">
              <Switch checked={editing.is_signature} onCheckedChange={(v) => setEditing({ ...editing, is_signature: v })} />
              <span className="font-semibold">{t("signature")}</span>
            </label>
            <div className="space-y-1 sm:col-span-2">
              <Label>{t("description")}</Label>
              <Input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button variant="ghost" onClick={() => { setEditing(null); setLocalUrl(null); }}>
                <XIcon /> {t("cancel")}
              </Button>
              <Button disabled={pending || !editing.name.trim()} onClick={save}>
                {pending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />} {t("save")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {offerings.length === 0 && !editing ? (
        <p className="rounded-[16px] border border-dashed p-8 text-center text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-y rounded-[16px] border bg-card">
          {offerings.map((o) => (
            <li key={o.id} className="flex items-center gap-3 px-4 py-3">
              {photoUrl(o.photo_path) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl(o.photo_path)} alt="" className="size-14 rounded-[12px] object-cover" />
              ) : (
                <div className="size-14 rounded-[12px] bg-muted" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 font-semibold">
                  {o.is_signature && <StarIcon className="size-4 fill-status text-warning" />}
                  {o.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatPrice(o.price)} {o.description && `· ${o.description}`}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setEditing({
                    id: o.id,
                    name: o.name,
                    price: o.price?.toString() ?? "",
                    description: o.description ?? "",
                    photo_path: o.photo_path,
                    is_signature: o.is_signature,
                  })
                }
              >
                <PencilIcon /> {t("edit")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => confirm(t("confirmDelete")) && start(async () => { await deleteOffering(business.id, o.id); router.refresh(); })}
              >
                <Trash2Icon /> {t("delete")}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
