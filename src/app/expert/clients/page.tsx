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
    <main className="space-y-5 p-4 lg:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button asChild>
          <Link href="/expert/clients/new">
            <PlusIcon /> {t("create")}
          </Link>
        </Button>
      </div>
      {!businesses?.length ? (
        <p className="rounded-2xl border-2 border-dashed p-10 text-center text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(businesses as Business[]).map((b) => (
            <Link key={b.id} href={`/expert/clients/${b.id}`} className="space-y-2 rounded-2xl border bg-card p-4 shadow-sm hover:border-primary">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-lg font-bold">{b.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {profBy[b.owner_profile_id]?.display_name} · {formatPhone(profBy[b.owner_profile_id]?.phone)}
                  </div>
                </div>
                <Badge variant={subscriptionVariant(subBy[b.id])}>{subBy[b.id] ? tSub(subBy[b.id]) : "—"}</Badge>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span>{tInd(b.industry)}</span>
                <span>
                  {t("lastRequest")}: {lastReq[b.id] ? formatDate(lastReq[b.id], locale) : t("never")}
                </span>
                <span className={openCount[b.id] ? "font-bold text-primary" : ""}>
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
