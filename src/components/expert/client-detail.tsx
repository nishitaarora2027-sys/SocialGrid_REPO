"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CameraIcon, KeyRoundIcon, LightbulbIcon, Loader2Icon, MailIcon, PlayIcon, PlusIcon, SaveIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { BrandWizard } from "@/components/expert/brand-wizard";
import { OfferingsEditor } from "@/components/expert/offerings-editor";
import { StatusBadge } from "@/components/expert/queue-view";
import {
  addCustomSuggestion,
  askForPhoto,
  resetClientPassword,
  updateClientLoginEmail,
  saveWeeklyPlan,
  setSubscription,
  startPlanSlot,
  updateBusiness,
} from "@/lib/actions/expert-clients";
import { formatPhone } from "@/lib/auth/phone";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  CONTENT_TYPES,
  SUBSCRIPTION_STATUSES,
  type AutonomyMode,
  type BrandProfile,
  type Business,
  type ContentType,
  type Locale,
  type Offering,
  type Plan,
  type PlanSlot,
  type PlanSlotTemplate,
  type Profile,
  type RequestRow,
  type Subscription,
  type Suggestion,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export function ClientDetail(props: {
  business: Business;
  owner: Profile;
  brand: BrandProfile | null;
  offerings: Offering[];
  planSlots: PlanSlotTemplate[];
  weekSlots: PlanSlot[];
  subscription: Subscription | null;
  plans: Plan[];
  suggestions: Suggestion[];
  requests: RequestRow[];
  urls: Record<string, string>;
  loginEmail: string;
  initialTab: string;
  wizard: boolean;
}) {
  const t = useTranslations("expert.client");
  const tInd = useTranslations("industries");
  const [tab, setTab] = useState(props.initialTab);
  const { business, owner } = props;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 lg:px-8 lg:py-8">
      <div>
        <Link href="/expert/clients" className="text-sm font-semibold text-primary">
          ← {t("allClients")}
        </Link>
        <h1 className="display text-[34px] leading-tight font-bold lg:text-[40px]">{business.name}</h1>
        <p className="text-muted-foreground">
          {owner.display_name} · {formatPhone(owner.phone)} · {tInd(business.industry)}
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="scrollbar-none w-full justify-start overflow-x-auto">
          {["brand", "offerings", "plan", "account", "history"].map((k) => (
            <TabsTrigger key={k} value={k} className="flex-none">
              {t(`tabs.${k}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="brand">
          <BrandWizard
            business={business}
            brand={props.brand}
            urls={props.urls}
            wizard={props.wizard}
            onFinish={() => setTab("offerings")}
          />
        </TabsContent>
        <TabsContent value="offerings">
          <OfferingsEditor business={business} offerings={props.offerings} urls={props.urls} />
        </TabsContent>
        <TabsContent value="plan">
          <PlanEditor businessId={business.id} initial={props.planSlots} weekSlots={props.weekSlots} />
        </TabsContent>
        <TabsContent value="account">
          <AccountPanel business={business} subscription={props.subscription} plans={props.plans} suggestions={props.suggestions} loginEmail={props.loginEmail} />
        </TabsContent>
        <TabsContent value="history">
          <History requests={props.requests} />
        </TabsContent>
      </Tabs>
    </main>
  );
}

function useAct() {
  const router = useRouter();
  const tCommon = useTranslations("common");
  const [pending, start] = useTransition();
  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, success?: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error ?? tCommon("error"));
      else if (success) toast.success(success);
      router.refresh();
    });
  return { pending, act };
}

const DAYS = [0, 1, 2, 3, 4, 5, 6];

function PlanEditor({ businessId, initial, weekSlots }: { businessId: string; initial: PlanSlotTemplate[]; weekSlots: PlanSlot[] }) {
  const t = useTranslations("expert.plan");
  const tTypes = useTranslations("contentTypes");
  const tWeek = useTranslations("week");
  const days = tWeek.raw("days") as string[];
  const [slots, setSlots] = useState<PlanSlotTemplate[]>(initial);
  const { pending, act } = useAct();
  const router = useRouter();
  const [askFor, setAskFor] = useState<PlanSlot | null>(null);
  const [askText, setAskText] = useState("");

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="space-y-3 rounded-[16px] border bg-card p-4">
        <h2 className="font-bold">{t("template")}</h2>
        <p className="text-sm text-muted-foreground">{t("templateHint")}</p>
        {slots.map((s, i) => (
          <div key={i} className="grid grid-cols-[7rem_1fr] gap-2 sm:grid-cols-[7rem_10rem_1fr_auto]">
            <NativeSelect value={s.day} onChange={(e) => setSlots(slots.map((x, j) => (j === i ? { ...x, day: Number(e.target.value) } : x)))}>
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {days[d]}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect value={s.type} onChange={(e) => setSlots(slots.map((x, j) => (j === i ? { ...x, type: e.target.value as ContentType } : x)))}>
              {CONTENT_TYPES.map((c) => (
                <option key={c} value={c}>
                  {tTypes(c)}
                </option>
              ))}
            </NativeSelect>
            <Input value={s.goal} placeholder={t("goalPlaceholder")} onChange={(e) => setSlots(slots.map((x, j) => (j === i ? { ...x, goal: e.target.value } : x)))} />
            <Button variant="ghost" onClick={() => setSlots(slots.filter((_, j) => j !== i))} aria-label={t("remove")}>
              <Trash2Icon /> <span className="sm:sr-only">{t("remove")}</span>
            </Button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setSlots([...slots, { day: 0, type: "single_post", goal: "" }])}>
            <PlusIcon /> {t("addSlot")}
          </Button>
          <Button disabled={pending} onClick={() => act(() => saveWeeklyPlan(businessId, slots), t("saved"))}>
            {pending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />} {t("save")}
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-[16px] border bg-card p-4">
        <h2 className="font-bold">{t("thisWeek")}</h2>
        {weekSlots.length === 0 && <p className="text-sm text-muted-foreground">{t("noSlots")}</p>}
        <ul className="divide-y">
          {weekSlots.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-2 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">
                  {days[s.day]} · {tTypes(s.type)}
                </div>
                {s.goal && <div className="text-sm text-muted-foreground">{s.goal}</div>}
              </div>
              <Badge variant={s.status === "done" ? "success" : s.status === "waiting_photo" ? "warning" : "secondary"}>
                {t(`status.${s.status}`)}
              </Badge>
              {s.request_id ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/expert/requests/${s.request_id}`}>{t("open")}</Link>
                </Button>
              ) : (
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    act(async () => {
                      const res = await startPlanSlot(s.id);
                      if (res.ok) router.push(`/expert/requests/${res.requestId}`);
                      return res;
                    })
                  }
                >
                  <PlayIcon /> {t("start")}
                </Button>
              )}
              {s.status !== "done" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAskFor(s);
                    setAskText(t("askDefault", { type: tTypes(s.type).toLowerCase() }));
                  }}
                >
                  <CameraIcon /> {t("askPhoto")}
                </Button>
              )}
            </li>
          ))}
        </ul>
        {askFor && (
          <div className="space-y-2 rounded-[12px] bg-secondary/50 p-3">
            <Label>{t("askMessage")}</Label>
            <Textarea value={askText} onChange={(e) => setAskText(e.target.value)} />
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setAskFor(null)}>
                {t("cancel")}
              </Button>
              <Button
                disabled={pending || !askText.trim()}
                onClick={() =>
                  act(async () => {
                    const res = await askForPhoto(askFor.id, askText);
                    setAskFor(null);
                    return res;
                  }, t("asked"))
                }
              >
                <CameraIcon /> {t("send")}
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function AccountPanel({
  business,
  subscription,
  plans,
  suggestions,
  loginEmail,
}: {
  business: Business;
  subscription: Subscription | null;
  plans: Plan[];
  suggestions: Suggestion[];
  loginEmail: string;
}) {
  const t = useTranslations("expert.account");
  const tSub = useTranslations("subscriptionStatus");
  const tTypes = useTranslations("contentTypes");
  const locale = useLocale() as Locale;
  const { pending, act } = useAct();
  const [status, setStatus] = useState(subscription?.status ?? "trial");
  const [planId, setPlanId] = useState(subscription?.plan_id ?? plans[0]?.id ?? "");
  const [email, setEmail] = useState(loginEmail);
  const [periodEnd, setPeriodEnd] = useState(subscription?.current_period_end?.slice(0, 10) ?? "");
  const [password, setPassword] = useState("");
  const [sugg, setSugg] = useState({ title_en: "", title_hi: "", content_type: "", show_at: "" });
  const modes: AutonomyMode[] = ["manual", "ai_draft_review", "auto"];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="space-y-3 rounded-[16px] border bg-card p-4">
        <h2 className="font-bold">{t("subscription")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>{t("status")}</Label>
            <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              {SUBSCRIPTION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {tSub(s)}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <Label>{t("plan")}</Label>
            <NativeSelect value={planId} onChange={(e) => setPlanId(e.target.value)}>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (₹{p.price_inr})
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <Label>{t("periodEnd")}</Label>
            <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{t(`statusHelp.${status}`)}</p>
        <Button
          disabled={pending}
          onClick={() => act(() => setSubscription(business.id, { status, planId: planId || null, currentPeriodEnd: periodEnd || null }), t("saved"))}
        >
          <SaveIcon /> {t("save")}
        </Button>
      </section>

      <section className="space-y-4 rounded-[16px] border bg-card p-4">
        <h2 className="font-bold">{t("settings")}</h2>
        <label className="flex items-center justify-between gap-3">
          <span>
            <span className="font-semibold">{t("suggestions")}</span>
            <span className="block text-sm text-muted-foreground">{t("suggestionsHint")}</span>
          </span>
          <Switch
            checked={business.suggestions_enabled}
            onCheckedChange={(v) => act(() => updateBusiness(business.id, { suggestions_enabled: v }))}
          />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span>
            <span className="font-semibold">{t("photoConsent")}</span>
            <span className="block text-sm text-muted-foreground">{t("photoConsentHint")}</span>
          </span>
          <Switch checked={business.photo_consent} onCheckedChange={(v) => act(() => updateBusiness(business.id, { photo_consent: v }))} />
        </label>
        <div className="space-y-2">
          <div className="font-semibold">{t("autonomy")}</div>
          <div className="grid gap-2">
            {modes.map((m) => {
              const enabled = m === "manual";
              return (
                <button
                  key={m}
                  type="button"
                  disabled={!enabled}
                  onClick={() => act(() => updateBusiness(business.id, { autonomy_mode: m }))}
                  className={cn(
                    "flex min-h-12 items-center justify-between rounded-[12px] border px-3 text-left",
                    business.autonomy_mode === m ? "border-primary bg-secondary" : "bg-card",
                    !enabled && "cursor-not-allowed opacity-60",
                  )}
                >
                  <span>
                    <span className="font-semibold">{t(`modes.${m}.title`)}</span>
                    <span className="block text-sm text-muted-foreground">{t(`modes.${m}.text`)}</span>
                  </span>
                  {!enabled && <Badge variant="outline">{t("comingSoon")}</Badge>}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-[16px] border bg-card p-4">
        <h2 className="flex items-center gap-2 font-bold">
          <LightbulbIcon className="size-5" /> {t("customSuggestion")}
        </h2>
        <Input placeholder={t("suggestionEn")} value={sugg.title_en} onChange={(e) => setSugg({ ...sugg, title_en: e.target.value })} />
        <Input placeholder={t("suggestionHi")} value={sugg.title_hi} onChange={(e) => setSugg({ ...sugg, title_hi: e.target.value })} />
        <div className="grid gap-2 sm:grid-cols-2">
          <NativeSelect value={sugg.content_type} onChange={(e) => setSugg({ ...sugg, content_type: e.target.value })}>
            <option value="">{t("anyType")}</option>
            {CONTENT_TYPES.map((c) => (
              <option key={c} value={c}>
                {tTypes(c)}
              </option>
            ))}
          </NativeSelect>
          <Input type="datetime-local" value={sugg.show_at} onChange={(e) => setSugg({ ...sugg, show_at: e.target.value })} aria-label={t("showAt")} />
        </div>
        <Button
          disabled={pending || !sugg.title_en.trim()}
          onClick={() =>
            act(async () => {
              const res = await addCustomSuggestion(business.id, { ...sugg, content_type: sugg.content_type || null, show_at: sugg.show_at || null });
              if (res.ok) setSugg({ title_en: "", title_hi: "", content_type: "", show_at: "" });
              return res;
            }, t("suggestionAdded"))
          }
        >
          <PlusIcon /> {t("addSuggestion")}
        </Button>
        {suggestions.length > 0 && (
          <ul className="divide-y text-sm">
            {suggestions.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 py-2">
                <span>
                  <span className="font-semibold">{s.payload.title_en}</span>{" "}
                  <span className="text-muted-foreground">
                    · {t(`kinds.${s.kind}`)} · {formatDateTime(s.show_at, locale)}
                  </span>
                </span>
                <Badge variant={s.status === "accepted" ? "success" : s.status === "dismissed" ? "outline" : "secondary"}>
                  {t(`suggestionStatus.${s.status}`)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-[16px] border bg-card p-4">
        <h2 className="flex items-center gap-2 font-bold">
          <MailIcon className="size-5" /> {t("loginEmail")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("loginEmailHint")}</p>
        <div className="flex gap-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-label={t("loginEmail")}
          />
          <Button
            disabled={pending || !email.includes("@") || email.trim().toLowerCase() === loginEmail}
            onClick={() =>
              act(async () => {
                const res = await updateClientLoginEmail(business.id, email);
                return res.ok || !t.has(`errors.${res.error}`) ? res : { ok: false, error: t(`errors.${res.error}`) };
              }, t("emailChanged"))
            }
          >
            <SaveIcon /> {t("save")}
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-[16px] border bg-card p-4">
        <h2 className="flex items-center gap-2 font-bold">
          <KeyRoundIcon className="size-5" /> {t("resetPassword")}
        </h2>
        <div className="flex gap-2">
          <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("newPassword")} className="font-mono" />
          <Button
            disabled={pending || password.length < 6}
            onClick={() =>
              act(async () => {
                const res = await resetClientPassword(business.id, password);
                if (res.ok) setPassword("");
                return res;
              }, t("passwordChanged"))
            }
          >
            <SaveIcon /> {t("save")}
          </Button>
        </div>
      </section>
    </div>
  );
}

function History({ requests }: { requests: RequestRow[] }) {
  const t = useTranslations("expert.client");
  const tTypes = useTranslations("contentTypes");
  const locale = useLocale() as Locale;
  if (!requests.length) return <p className="text-muted-foreground">{t("noHistory")}</p>;
  return (
    <ul className="divide-y rounded-[16px] border bg-card">
      {requests.map((r) => (
        <li key={r.id}>
          <Link href={`/expert/requests/${r.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-accent/50">
            <span className="w-28 text-sm text-muted-foreground">{formatDate(r.created_at, locale)}</span>
            <span className="min-w-0 flex-1 truncate">{r.summary || "—"}</span>
            <span className="text-sm">{r.content_type ? tTypes(r.content_type) : ""}</span>
            {r.current_revision > 0 && <Badge variant="warning">R{r.current_revision}</Badge>}
            <StatusBadge status={r.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
