import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireExpert } from "@/lib/auth/session";
import { formatPhone } from "@/lib/auth/phone";
import { formatDate } from "@/lib/format";
import { OPEN_STATUSES, type Business, type Locale, type SubscriptionStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

function subscriptionVariant(s: SubscriptionStatus | undefined) {
  return s === "active" ? "success" : s === "trial" ? "secondary" : s === "past_due" ? "warning" : "destructive";
}

export default async function ClientsPage() {
  const { supabase } = await requireExpert();
  const t = await getTranslations("expert.clients");
  const tInd = await getTranslations("industries");
  const tSub = await getTranslations("subscriptionStatus");
  const locale = (await getLocale()) as Locale;

  const [{ data: businesses }, { data: subs }, { data: reqs }, { data: profiles }] = await Promise.all([
    supabase.from("businesses").select("*").order("name"),
    supabase.from("subscriptions").select("business_id, status"),
    supabase.from("requests").select("business_id, status, created_at").order("created_at", { ascending: false }).limit(2000),
    supabase.from("profiles").select("id, display_name, phone"),
  ]);
  const subBy = Object.fromEntries((subs ?? []).map((s) => [s.business_id, s.status as SubscriptionStatus]));
  const profBy = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
  const lastReq: Record<string, string> = {};
  const openCount: Record<string, number> = {};
  for (const r of reqs ?? []) {
    lastReq[r.business_id] ??= r.created_at;
    if (OPEN_STATUSES.includes(r.status)) openCount[r.business_id] = (openCount[r.business_id] ?? 0) + 1;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 lg:px-8 lg:py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="display text-[34px] leading-tight font-bold lg:text-[40px]">{t("title")}</h1>
        <Button asChild>
          <Link href="/expert/clients/new">
            <PlusIcon /> {t("create")}
          </Link>
        </Button>
      </div>
      {!businesses?.length ? (
        <p className="rounded-[22px] bg-surface p-10 text-center text-ink-muted ring-1 ring-line">{t("empty")}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(businesses as Business[]).map((b) => (
            <Link
              key={b.id}
              href={`/expert/clients/${b.id}`}
              className="space-y-3 rounded-[22px] bg-surface p-5 ring-1 ring-line transition duration-150 hover:-translate-y-0.5 hover:ring-line-strong"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-rose-soft text-[15px] font-bold text-rose-ink">
                  {b.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[18px] font-bold">{b.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {profBy[b.owner_profile_id]?.display_name} · {formatPhone(profBy[b.owner_profile_id]?.phone)}
                  </div>
                </div>
                <Badge variant={subscriptionVariant(subBy[b.id])} className="shrink-0">{subBy[b.id] ? tSub(subBy[b.id]) : "—"}</Badge>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-[14px] text-ink-muted">
                <span>{tInd(b.industry)}</span>
                <span>
                  {t("lastRequest")}: {lastReq[b.id] ? formatDate(lastReq[b.id], locale) : t("never")}
                </span>
                <span className={openCount[b.id] ? "font-semibold text-sun" : ""}>
                  {t("openRequests", { count: openCount[b.id] ?? 0 })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
