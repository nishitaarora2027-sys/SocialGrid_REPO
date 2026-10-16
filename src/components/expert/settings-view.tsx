"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRoundIcon, Loader2Icon, PencilIcon, PlusIcon, SaveIcon, Trash2Icon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CARD_ICONS, CardIcon } from "@/components/shared/icons";
import { deleteFestival, saveFestival, savePlan, saveQuickStartCard, updateSettings } from "@/lib/actions/expert-admin";
import { addTeamMember, changeMyPassword } from "@/lib/actions/password";
import { TeamMemberForm } from "@/components/shared/team-member-form";
import { formatDate, formatPrice } from "@/lib/format";
import {
  CONTENT_TYPES,
  INDUSTRIES,
  type ContentType,
  type Festival,
  type Industry,
  type Locale,
  type Plan,
  type QuickStartCard,
  type QuickStartQuestion,
  type Settings,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type ActResult = { ok: boolean; error?: string };

function useAct() {
  const router = useRouter();
  const tCommon = useTranslations("common");
  const [pending, start] = useTransition();
  const act = (fn: () => Promise<ActResult>, onOk?: () => void) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error ?? tCommon("error"));
      else {
        toast.success(tCommon("saved"));
        onOk?.();
      }
      router.refresh();
    });
  return { pending, act };
}

export function SettingsView({
  settings,
  festivals,
  plans,
  cards,
}: {
  settings: Settings;
  festivals: Festival[];
  plans: Plan[];
  cards: QuickStartCard[];
}) {
  const t = useTranslations("expert.settings");
  return (
    <main className="space-y-5 p-4 lg:p-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <Tabs defaultValue="turnaround">
        <TabsList className="scrollbar-none w-full justify-start overflow-x-auto">
          {["turnaround", "festivals", "plans", "quickStart", "account"].map((k) => (
            <TabsTrigger key={k} value={k} className="flex-none">
              {t(`tabs.${k}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="turnaround">
          <TurnaroundForm settings={settings} />
        </TabsContent>
        <TabsContent value="festivals">
          <Festivals festivals={festivals} />
        </TabsContent>
        <TabsContent value="plans">
          <Plans plans={plans} />
        </TabsContent>
        <TabsContent value="quickStart">
          <QuickStartCards cards={cards} />
        </TabsContent>
        <TabsContent value="account">
          <ChangePassword />
          <section className="max-w-md space-y-3 pt-8">
            <h2 className="text-lg font-bold">{t("account.addTeamTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("account.addTeamHint")}</p>
            <TeamMemberForm submit={addTeamMember} />
          </section>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function TurnaroundForm({ settings }: { settings: Settings }) {
  const t = useTranslations("expert.settings");
  const tWeek = useTranslations("week");
  const days = tWeek.raw("days") as string[];
  const [s, setS] = useState(settings);
  const { pending, act } = useAct();
  const num = (k: keyof Settings) => (
    <Input type="number" min={0} step={k.endsWith("hours") ? 0.5 : 1} value={String(s[k])} onChange={(e) => setS({ ...s, [k]: Number(e.target.value) })} />
  );

  return (
    <div className="max-w-2xl space-y-5 rounded-2xl border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label>{t("standardHours")}</Label>
          {num("standard_hours")}
        </div>
        <div className="space-y-1">
          <Label>{t("urgentHours")}</Label>
          {num("urgent_hours")}
        </div>
        <div className="space-y-1">
          <Label>{t("revisionHours")}</Label>
          {num("revision_hours")}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{t("hoursHint")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>{t("workStart")}</Label>
          <Input type="time" value={s.work_start} onChange={(e) => setS({ ...s, work_start: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>{t("workEnd")}</Label>
          <Input type="time" value={s.work_end} onChange={(e) => setS({ ...s, work_end: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1">
        <Label>{t("workDays")}</Label>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setS({ ...s, work_days: s.work_days.includes(d) ? s.work_days.filter((x) => x !== d) : [...s.work_days, d].sort() })}
              className={cn("h-11 min-w-14 rounded-xl border-2 px-3 font-semibold", s.work_days.includes(d) ? "border-primary bg-primary text-primary-foreground" : "bg-card")}
            >
              {days[d - 1]}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>{t("leadDays")}</Label>
          {num("suggestion_lead_days")}
        </div>
        <div className="space-y-1">
          <Label>{t("inactivityDays")}</Label>
          {num("inactivity_days")}
        </div>
      </div>
      <Button
        disabled={pending}
        onClick={() =>
          act(() =>
            updateSettings({
              standard_hours: s.standard_hours,
              urgent_hours: s.urgent_hours,
              revision_hours: s.revision_hours,
              work_start: s.work_start.slice(0, 5),
              work_end: s.work_end.slice(0, 5),
              work_days: s.work_days,
              suggestion_lead_days: s.suggestion_lead_days,
              inactivity_days: s.inactivity_days,
            }),
          )
        }
      >
        {pending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />} {t("save")}
      </Button>
    </div>
  );
}

const emptyFestival = (): Omit<Festival, "id"> & { id?: string } => ({
  name: "",
  name_hi: "",
  date: new Date().toISOString().slice(0, 10),
  industries: [...INDUSTRIES],
  default_lead_days: 5,
  active: true,
});

function Festivals({ festivals }: { festivals: Festival[] }) {
  const t = useTranslations("expert.settings");
  const tInd = useTranslations("industries");
  const locale = useLocale() as Locale;
  const [edit, setEdit] = useState<(Omit<Festival, "id"> & { id?: string }) | null>(null);
  const [showPast, setShowPast] = useState(false);
  const { pending, act } = useAct();
  const today = new Date().toISOString().slice(0, 10);
  const shown = showPast ? festivals : festivals.filter((f) => f.date >= today);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setEdit(emptyFestival())}>
          <PlusIcon /> {t("addFestival")}
        </Button>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <Switch checked={showPast} onCheckedChange={setShowPast} /> {t("showPast")}
        </label>
        <p className="text-sm text-muted-foreground">{t("festivalHint")}</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase">
            <tr>
              <th className="px-3 py-2">{t("date")}</th>
              <th className="px-3 py-2">{t("name")}</th>
              <th className="px-3 py-2">{t("nameHi")}</th>
              <th className="px-3 py-2">{t("industries")}</th>
              <th className="px-3 py-2">{t("lead")}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {shown.map((f) => (
              <tr key={f.id} className={cn(!f.active && "opacity-50")}>
                <td className="px-3 py-2 whitespace-nowrap">{formatDate(`${f.date}T12:00:00+05:30`, locale)}</td>
                <td className="px-3 py-2 font-semibold">{f.name}</td>
                <td className="px-3 py-2">{f.name_hi}</td>
                <td className="px-3 py-2">{f.industries.length === INDUSTRIES.length ? t("all") : f.industries.map((i) => tInd(i)).join(", ")}</td>
                <td className="px-3 py-2">{f.default_lead_days}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <Button variant="ghost" size="sm" onClick={() => setEdit(f)}>
                    <PencilIcon /> {t("edit")}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => confirm(t("confirmDelete")) && act(() => deleteFestival(f.id))}>
                    <Trash2Icon /> <span className="sr-only">{t("delete")}</span>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{edit?.id ? t("editFestival") : t("addFestival")}</DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>{t("name")}</Label>
                <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>{t("nameHi")}</Label>
                <Input value={edit.name_hi} onChange={(e) => setEdit({ ...edit, name_hi: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{t("date")}</Label>
                  <Input type="date" value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>{t("lead")}</Label>
                  <Input type="number" min={0} value={edit.default_lead_days} onChange={(e) => setEdit({ ...edit, default_lead_days: Number(e.target.value) })} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {INDUSTRIES.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      setEdit({ ...edit, industries: edit.industries.includes(i) ? edit.industries.filter((x) => x !== i) : [...edit.industries, i] })
                    }
                    className={cn("h-10 rounded-full border-2 px-3 text-sm font-semibold", edit.industries.includes(i) ? "border-primary bg-secondary" : "bg-card")}
                  >
                    {tInd(i)}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 font-semibold">
                <Switch checked={edit.active} onCheckedChange={(v) => setEdit({ ...edit, active: v })} /> {t("active")}
              </label>
              <Button disabled={pending} onClick={() => act(() => saveFestival(edit), () => setEdit(null))}>
                <SaveIcon /> {t("save")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Plans({ plans }: { plans: Plan[] }) {
  const t = useTranslations("expert.settings");
  const tTypes = useTranslations("contentTypes");
  const [edit, setEdit] = useState<(Omit<Plan, "id"> & { id?: string }) | null>(null);
  const { pending, act } = useAct();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setEdit({ name: "", price_inr: 0, limits: { requests_per_month: null, content_types: null }, active: true })}>
          <PlusIcon /> {t("addPlan")}
        </Button>
        <p className="text-sm text-muted-foreground">{t("plansHint")}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((p) => (
          <div key={p.id} className={cn("space-y-2 rounded-2xl border bg-card p-4", !p.active && "opacity-50")}>
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold">{p.name}</div>
              <div className="font-bold">{formatPrice(p.price_inr)}</div>
            </div>
            <div className="text-sm text-muted-foreground">
              {t("requestsPerMonth")}: {p.limits.requests_per_month ?? t("unlimited")}
            </div>
            <div className="text-sm text-muted-foreground">
              {t("contentTypes")}: {p.limits.content_types?.map((c) => tTypes(c)).join(", ") ?? t("all")}
            </div>
            <Button variant="outline" size="sm" onClick={() => setEdit(p)}>
              <PencilIcon /> {t("edit")}
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{edit?.id ? t("editPlan") : t("addPlan")}</DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{t("name")}</Label>
                  <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>{t("price")}</Label>
                  <Input type="number" min={0} value={edit.price_inr} onChange={(e) => setEdit({ ...edit, price_inr: Number(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>{t("requestsPerMonth")}</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder={t("unlimited")}
                  value={edit.limits.requests_per_month ?? ""}
                  onChange={(e) => setEdit({ ...edit, limits: { ...edit.limits, requests_per_month: e.target.value ? Number(e.target.value) : null } })}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("contentTypes")}</Label>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_TYPES.map((c) => {
                    const list = edit.limits.content_types;
                    const on = !list || list.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          const current = list ?? [...CONTENT_TYPES];
                          const next = on ? current.filter((x) => x !== c) : [...current, c];
                          setEdit({ ...edit, limits: { ...edit.limits, content_types: next.length === CONTENT_TYPES.length ? null : next } });
                        }}
                        className={cn("h-10 rounded-full border-2 px-3 text-sm font-semibold", on ? "border-primary bg-secondary" : "bg-card text-muted-foreground")}
                      >
                        {tTypes(c)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className="flex items-center gap-2 font-semibold">
                <Switch checked={edit.active} onCheckedChange={(v) => setEdit({ ...edit, active: v })} /> {t("active")}
              </label>
              <Button
                disabled={pending || !edit.name.trim()}
                onClick={() =>
                  act(
                    () =>
                      savePlan({
                        ...edit,
                        limits: {
                          requests_per_month: edit.limits.requests_per_month ?? null,
                          content_types: (edit.limits.content_types ?? null) as never,
                        },
                      }),
                    () => setEdit(null),
                  )
                }
              >
                <SaveIcon /> {t("save")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

type CardDraft = Omit<QuickStartCard, "id"> & { id?: string };

function QuickStartCards({ cards }: { cards: QuickStartCard[] }) {
  const t = useTranslations("expert.settings");
  const tInd = useTranslations("industries");
  const tTypes = useTranslations("contentTypes");
  const [industry, setIndustry] = useState<Industry>("restaurant");
  const [edit, setEdit] = useState<CardDraft | null>(null);
  const { pending, act } = useAct();
  const list = cards.filter((c) => c.industry === industry);

  const setQ = (i: number, patch: Partial<QuickStartQuestion>) =>
    edit && setEdit({ ...edit, questions: edit.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {INDUSTRIES.map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndustry(i)}
            className={cn("h-11 rounded-xl border-2 px-4 font-semibold", industry === i ? "border-primary bg-primary text-primary-foreground" : "bg-card")}
          >
            {tInd(i)}
          </button>
        ))}
        <Button
          variant="outline"
          className="ml-auto"
          onClick={() =>
            setEdit({ industry, key: "", label_en: "", label_hi: "", icon: "sparkles", content_type: "single_post", questions: [], sort: list.length + 1, active: true })
          }
        >
          <PlusIcon /> {t("addCard")}
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((c) => (
          <div key={c.id} className={cn("flex items-start gap-3 rounded-2xl border bg-card p-4", !c.active && "opacity-50")}>
            <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
              <CardIcon name={c.icon} className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-bold">{c.label_en}</div>
              <div className="text-sm">{c.label_hi}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                <Badge variant="outline">{tTypes(c.content_type)}</Badge>
                <Badge variant="secondary">{t("questionsCount", { count: c.questions.length })}</Badge>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEdit(c)}>
              <PencilIcon /> {t("edit")}
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{edit?.id ? t("editCard") : t("addCard")}</DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>{t("labelEn")}</Label>
                  <Input value={edit.label_en} onChange={(e) => setEdit({ ...edit, label_en: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>{t("labelHi")}</Label>
                  <Input value={edit.label_hi} onChange={(e) => setEdit({ ...edit, label_hi: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>{t("key")}</Label>
                  <Input
                    value={edit.key}
                    disabled={!!edit.id}
                    onChange={(e) => setEdit({ ...edit, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("contentType")}</Label>
                  <NativeSelect value={edit.content_type} onChange={(e) => setEdit({ ...edit, content_type: e.target.value as ContentType })}>
                    {CONTENT_TYPES.map((c) => (
                      <option key={c} value={c}>
                        {tTypes(c)}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              </div>
              <div className="space-y-1">
                <Label>{t("icon")}</Label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(CARD_ICONS).map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setEdit({ ...edit, icon: name })}
                      className={cn("flex size-11 items-center justify-center rounded-xl border-2", edit.icon === name ? "border-primary bg-secondary" : "bg-card")}
                      aria-label={name}
                    >
                      <CardIcon name={name} className="size-5" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>{t("questions")}</Label>
                {edit.questions.map((q, i) => (
                  <div key={i} className="space-y-2 rounded-xl border p-3">
                    <div className="flex gap-2">
                      <NativeSelect value={q.type} onChange={(e) => setQ(i, { type: e.target.value as QuickStartQuestion["type"] })} className="w-36">
                        <option value="choice">{t("qTypes.choice")}</option>
                        <option value="text">{t("qTypes.text")}</option>
                        <option value="photo">{t("qTypes.photo")}</option>
                      </NativeSelect>
                      <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setEdit({ ...edit, questions: edit.questions.filter((_, j) => j !== i) })}>
                        <XIcon /> {t("remove")}
                      </Button>
                    </div>
                    <Input placeholder={t("qEn")} value={q.q_en} onChange={(e) => setQ(i, { q_en: e.target.value })} />
                    <Input placeholder={t("qHi")} value={q.q_hi} onChange={(e) => setQ(i, { q_hi: e.target.value })} />
                    {q.type === "choice" && (
                      <>
                        <textarea
                          className="min-h-20 w-full rounded-xl border-2 p-2 text-sm"
                          placeholder={t("choicesHint")}
                          value={(q.options ?? []).map((o) => `${o.en} | ${o.hi}`).join("\n")}
                          onChange={(e) =>
                            setQ(i, {
                              options: e.target.value.split("\n").map((line) => {
                                const [en, hi] = line.split("|").map((s) => s.trim());
                                return { en: en ?? "", hi: hi || en || "" };
                              }),
                            })
                          }
                        />
                        <label className="flex items-center gap-2 text-sm font-semibold">
                          <Switch checked={!!q.allow_text} onCheckedChange={(v) => setQ(i, { allow_text: v })} /> {t("allowText")}
                        </label>
                      </>
                    )}
                  </div>
                ))}
                {edit.questions.length < 3 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setEdit({ ...edit, questions: [...edit.questions, { id: `q${Date.now().toString(36)}`, type: "choice", q_en: "", q_hi: "", options: [] }] })
                    }
                  >
                    <PlusIcon /> {t("addQuestion")}
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 font-semibold">
                  <Switch checked={edit.active} onCheckedChange={(v) => setEdit({ ...edit, active: v })} /> {t("active")}
                </label>
                <div className="flex items-center gap-2">
                  <Label>{t("sort")}</Label>
                  <Input type="number" className="h-10 w-20" value={edit.sort} onChange={(e) => setEdit({ ...edit, sort: Number(e.target.value) })} />
                </div>
              </div>
              <Button
                disabled={pending || !edit.key || !edit.label_en || !edit.label_hi}
                onClick={() =>
                  act(
                    () =>
                      saveQuickStartCard({
                        ...edit,
                        questions: edit.questions.map((q) => ({
                          ...q,
                          options: q.type === "choice" ? (q.options ?? []).filter((o) => o.en) : undefined,
                        })),
                      }),
                    () => setEdit(null),
                  )
                }
              >
                <SaveIcon /> {t("save")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChangePassword() {
  const t = useTranslations("expert.settings.account");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const { pending, act } = useAct();
  const plain = { autoCapitalize: "none", autoCorrect: "off", spellCheck: false } as const;
  const save = () =>
    act(
      async () => {
        const res = await changeMyPassword(current, next);
        return res.ok || !res.error ? res : { ok: false, error: t.has(`errors.${res.error}`) ? t(`errors.${res.error}`) : res.error };
      },
      () => {
        setCurrent("");
        setNext("");
      },
    );
  return (
    <section className="max-w-md space-y-4 pt-4">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <KeyRoundIcon className="size-5" /> {t("title")}
      </h2>
      <div className="space-y-2">
        <Label htmlFor="current-password">{t("current")}</Label>
        <Input id="current-password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} {...plain} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-password">{t("next")}</Label>
        <Input id="new-password" type="text" autoComplete="new-password" className="font-mono" value={next} onChange={(e) => setNext(e.target.value)} {...plain} />
        <p className="text-sm text-muted-foreground">{t("hint")}</p>
      </div>
      <Button onClick={save} disabled={pending || !current || next.trim().length < 8}>
        {pending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />} {t("save")}
      </Button>
    </section>
  );
}
