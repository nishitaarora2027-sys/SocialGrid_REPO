"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2Icon, Loader2Icon, PlusIcon, SaveIcon, StarIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/expert/tag-input";
import { addManualExample, deleteRule, saveRule, setExampleGold } from "@/lib/actions/expert-admin";
import { compressImage, uploadFile } from "@/lib/browser/media";
import { TAG_SUGGESTIONS } from "@/lib/brand-options";
import { BUCKETS } from "@/lib/config";
import {
  CONTENT_TYPES,
  INDUSTRIES,
  type Business,
  type ContentType,
  type Example,
  type Industry,
  type OptionTags,
  type Rule,
  type RuleScope,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Biz = Pick<Business, "id" | "name" | "industry">;

export function LibraryView({
  rules,
  examples,
  businesses,
  urls,
  filters,
}: {
  rules: Rule[];
  examples: (Example & { content_options: { chosen: boolean } | null })[];
  businesses: Biz[];
  urls: Record<string, string>;
  filters: { tab?: string; industry?: string; gold?: string; client?: string };
}) {
  const t = useTranslations("expert.library");
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 lg:px-8 lg:py-8">
      <div>
        <h1 className="display text-[34px] leading-tight font-bold lg:text-[40px]">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <Tabs defaultValue={filters.tab ?? "rules"}>
        <TabsList>
          <TabsTrigger value="rules">{t("rules")}</TabsTrigger>
          <TabsTrigger value="examples">{t("examples")}</TabsTrigger>
        </TabsList>
        <TabsContent value="rules">
          <RulesPanel rules={rules} businesses={businesses} />
        </TabsContent>
        <TabsContent value="examples">
          <ExamplesPanel examples={examples} businesses={businesses} urls={urls} filters={filters} />
        </TabsContent>
      </Tabs>
    </main>
  );
}

function RulesPanel({ rules, businesses }: { rules: Rule[]; businesses: Biz[] }) {
  const t = useTranslations("expert.library");
  const tInd = useTranslations("industries");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [scope, setScope] = useState<RuleScope>("client");
  const [businessId, setBusinessId] = useState(businesses[0]?.id ?? "");
  const [industry, setIndustry] = useState<Industry>("restaurant");
  const [text, setText] = useState("");
  const bizName = Object.fromEntries(businesses.map((b) => [b.id, b.name]));

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error);
      router.refresh();
    });

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
      <section className="space-y-3 rounded-[16px] border bg-card p-4">
        <h2 className="font-bold">{t("addRule")}</h2>
        <div className="flex gap-2">
          {(["client", "industry", "global"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={cn("h-10 flex-1 rounded-[12px] border text-sm font-semibold", scope === s ? "border-primary bg-secondary" : "bg-card")}
            >
              {t(`scope.${s}`)}
            </button>
          ))}
        </div>
        {scope === "client" && (
          <NativeSelect value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </NativeSelect>
        )}
        {scope === "industry" && (
          <NativeSelect value={industry} onChange={(e) => setIndustry(e.target.value as Industry)}>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {tInd(i)}
              </option>
            ))}
          </NativeSelect>
        )}
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t("rulePlaceholder")} />
        <Button
          disabled={pending || !text.trim()}
          onClick={() =>
            run(async () => {
              const res = await saveRule({ scope, business_id: businessId || null, industry, text, active: true });
              if (res.ok) setText("");
              return res;
            })
          }
        >
          {pending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />} {t("add")}
        </Button>
      </section>

      <section className="space-y-2">
        {rules.length === 0 && <p className="rounded-[16px] border border-dashed p-8 text-center text-muted-foreground">{t("noRules")}</p>}
        {rules.map((r) => (
          <div key={r.id} className={cn("flex items-start gap-3 rounded-[16px] border bg-card p-3", !r.active && "opacity-50")}>
            <Badge variant="outline" className="mt-0.5 shrink-0">
              {r.scope === "client" ? bizName[r.business_id ?? ""] ?? t("scope.client") : r.scope === "industry" ? tInd(r.industry!) : t("scope.global")}
            </Badge>
            <p className="flex-1">{r.text}</p>
            <Switch
              checked={r.active}
              aria-label={t("active")}
              onCheckedChange={(v) =>
                run(() => saveRule({ id: r.id, scope: r.scope, business_id: r.business_id, industry: r.industry, text: r.text, active: v }))
              }
            />
            <Button variant="ghost" size="sm" onClick={() => confirm(t("confirmDelete")) && run(() => deleteRule(r.id))}>
              <Trash2Icon /> <span className="sr-only">{t("delete")}</span>
            </Button>
          </div>
        ))}
      </section>
    </div>
  );
}

function ExamplesPanel({
  examples,
  businesses,
  urls,
  filters,
}: {
  examples: (Example & { content_options: { chosen: boolean } | null })[];
  businesses: Biz[];
  urls: Record<string, string>;
  filters: { industry?: string; gold?: string; client?: string };
}) {
  const t = useTranslations("expert.library");
  const tInd = useTranslations("industries");
  const tTypes = useTranslations("contentTypes");
  const tTags = useTranslations("tags");
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();

  const setFilter = (k: string, v: string) => {
    const sp = new URLSearchParams({ tab: "examples", ...Object.fromEntries(Object.entries(filters).filter(([, x]) => x)) } as Record<string, string>);
    if (v) sp.set(k, v);
    else sp.delete(k);
    router.push(`/expert/library?${sp}`);
  };
  const urlFor = (m: { path: string; bucket?: string }) => urls[`${m.bucket ?? BUCKETS.deliverables}/${m.path}`];
  const allTags = (tags: OptionTags) => [...(tags.occasion ?? []), ...(tags.style ?? []), ...(tags.goal ?? [])];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect value={filters.industry ?? ""} onChange={(e) => setFilter("industry", e.target.value)} className="w-44">
          <option value="">{t("allIndustries")}</option>
          {INDUSTRIES.map((i) => (
            <option key={i} value={i}>
              {tInd(i)}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect value={filters.client ?? ""} onChange={(e) => setFilter("client", e.target.value)} className="w-48">
          <option value="">{t("allClients")}</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </NativeSelect>
        <label className="flex h-12 items-center gap-2 rounded-[12px] border bg-card px-3 font-semibold">
          <Switch checked={filters.gold === "1"} onCheckedChange={(v) => setFilter("gold", v ? "1" : "")} />
          {t("goldOnly")}
        </label>
        <Button className="ml-auto" onClick={() => setAdding(true)}>
          <PlusIcon /> {t("addExample")}
        </Button>
      </div>

      {examples.length === 0 ? (
        <p className="rounded-[16px] border border-dashed p-8 text-center text-muted-foreground">{t("noExamples")}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {examples.map((e) => {
            const first = e.media[0];
            const url = first && urlFor(first);
            return (
              <div key={e.id} className={cn("space-y-2 rounded-[16px] border bg-card p-3", e.is_gold_standard && "border border-status")}>
                <div className="relative aspect-[4/5] overflow-hidden rounded-[12px] bg-muted">
                  {url &&
                    (first.type === "video" ? (
                      <video src={url} className="h-full w-full object-cover" muted />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ))}
                  {!url && <p className="line-clamp-[10] p-3 text-sm">{e.caption}</p>}
                  <div className="absolute top-2 left-2 flex gap-1">
                    <Badge variant={e.source === "manual" ? "secondary" : "outline"} className="bg-white/90">
                      {t(`source.${e.source}`)}
                    </Badge>
                    {e.content_options?.chosen && (
                      <Badge variant="success">
                        <CheckCircle2Icon /> {t("chosen")}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 text-[13px]">
                  {e.industry && <Badge variant="outline">{tInd(e.industry)}</Badge>}
                  {e.content_type && <Badge variant="outline">{tTypes(e.content_type)}</Badge>}
                  {allTags(e.tags ?? {}).map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tTags.has(tag as never) ? tTags(tag as never) : tag}
                    </Badge>
                  ))}
                </div>
                {e.notes && <p className="text-sm text-muted-foreground">💡 {e.notes}</p>}
                <Button
                  variant={e.is_gold_standard ? "default" : "outline"}
                  size="sm"
                  className="w-full"
                  disabled={pending}
                  onClick={() => start(async () => { await setExampleGold(e.id, !e.is_gold_standard); router.refresh(); })}
                >
                  <StarIcon className={e.is_gold_standard ? "fill-current" : ""} />
                  {e.is_gold_standard ? t("gold") : t("markGold")}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <AddExampleDialog open={adding} onOpenChange={setAdding} businesses={businesses} />
    </div>
  );
}

function AddExampleDialog({ open, onOpenChange, businesses }: { open: boolean; onOpenChange: (o: boolean) => void; businesses: Biz[] }) {
  const t = useTranslations("expert.library");
  const tInd = useTranslations("industries");
  const tTypes = useTranslations("contentTypes");
  const tTags = useTranslations("tags");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [media, setMedia] = useState<{ path: string; type: "image" | "video"; bucket: string; preview: string }[]>([]);
  const [industry, setIndustry] = useState<string>("");
  const [businessId, setBusinessId] = useState("");
  const [contentType, setContentType] = useState<string>("single_post");
  const [caption, setCaption] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<OptionTags>({});
  const [gold, setGold] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" closeLabel={tCommon("close")}>
        <DialogHeader>
          <DialogTitle>{t("addExample")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {media.map((m) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={m.path} src={m.preview} alt="" className="size-24 rounded-[12px] object-cover" />
          ))}
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex size-24 flex-col items-center justify-center gap-1 rounded-[12px] border border-dashed text-[13px] font-semibold text-muted-foreground"
          >
            {busy ? <Loader2Icon className="size-5 animate-spin" /> : <UploadIcon className="size-5" />} {t("upload")}
          </button>
          <input
            ref={input}
            type="file"
            accept="image/*,video/*"
            multiple
            hidden
            onChange={async (e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              setBusy(true);
              try {
                for (const f of files) {
                  const isVideo = f.type.startsWith("video/");
                  const blob = isVideo ? f : await compressImage(f, { quality: 0.85 });
                  const path = await uploadFile(BUCKETS.examples, "manual", blob, f.name);
                  setMedia((m) => [...m, { path, type: isVideo ? "video" : "image", bucket: BUCKETS.examples, preview: URL.createObjectURL(blob) }]);
                }
              } catch {
                toast.error(t("uploadFailed"));
              } finally {
                setBusy(false);
              }
            }}
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <NativeSelect value={industry} onChange={(e) => setIndustry(e.target.value)}>
            <option value="">{t("anyIndustry")}</option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {tInd(i)}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
            <option value="">{t("noClient")}</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect value={contentType} onChange={(e) => setContentType(e.target.value)}>
            {CONTENT_TYPES.map((c) => (
              <option key={c} value={c}>
                {tTypes(c)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label>{t("caption")}</Label>
          <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>{t("notes")}</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notesPlaceholder")} />
        </div>
        {(["occasion", "style", "goal"] as const).map((g) => (
          <div key={g} className="space-y-1">
            <Label>{t(`tags.${g}`)}</Label>
            <TagInput
              value={tags[g] ?? []}
              onChange={(v) => setTags({ ...tags, [g]: v })}
              suggestions={TAG_SUGGESTIONS[g]}
              labelFor={(s) => (tTags.has(s as never) ? tTags(s as never) : s)}
            />
          </div>
        ))}
        <label className="flex items-center gap-3 font-semibold">
          <Switch checked={gold} onCheckedChange={setGold} /> {t("markGold")}
        </label>
        <Button
          disabled={pending || busy || (!media.length && !caption.trim())}
          onClick={() =>
            start(async () => {
              const res = await addManualExample({
                industry: (industry || null) as Industry | null,
                business_id: businessId || null,
                content_type: contentType as ContentType,
                media: media.map(({ path, type, bucket }) => ({ path, type, bucket })),
                caption: caption || null,
                notes: notes || null,
                tags,
                is_gold_standard: gold,
              });
              if (!res.ok) return void toast.error(res.error);
              setMedia([]);
              setCaption("");
              setNotes("");
              setTags({});
              onOpenChange(false);
              router.refresh();
            })
          }
        >
          <SaveIcon /> {t("save")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
