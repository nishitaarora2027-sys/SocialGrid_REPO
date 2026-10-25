import { requireClient } from "@/lib/auth/session";
import { signFiles, fileKey } from "@/lib/storage";
import { BUCKETS } from "@/lib/config";
import { BottomTabs, ClientHeader, ClientSidebar } from "@/components/client/client-shell";
import { PayButton } from "@/components/client/pay-button";
import type { Subscription } from "@/lib/types";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const { supabase, business, profile } = await requireClient();
  const [{ data: brand }, { count: readyCount }, { data: sub }] = await Promise.all([
    supabase.from("brand_profiles").select("logo_path").eq("business_id", business.id).maybeSingle(),
    supabase
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("status", "delivered"),
    supabase
      .from("subscriptions")
      .select("status, plan:plans(price_inr)")
      .eq("business_id", business.id)
      .maybeSingle<Pick<Subscription, "status"> & { plan: { price_inr: number } | null }>(),
  ]);
  let logoUrl: string | null = null;
  if (brand?.logo_path) {
    const urls = await signFiles(supabase, [{ bucket: BUCKETS.brandAssets, path: brand.logo_path }]);
    logoUrl = urls[fileKey(BUCKETS.brandAssets, brand.logo_path)] ?? null;
  }

  return (
    <div className="client-shell min-h-dvh bg-paper lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <ClientSidebar
        businessName={business.name}
        ownerName={profile.display_name}
        logoUrl={logoUrl}
        readyCount={readyCount ?? 0}
      />
      <div className="flex min-h-dvh min-w-0 flex-col pb-[var(--tabbar-h)]">
        <ClientHeader businessName={business.name} logoUrl={logoUrl} />
        {sub?.status === "past_due" && <PastDueBanner price={sub.plan?.price_inr} />}
        {children}
      </div>
      <BottomTabs readyCount={readyCount ?? 0} />
    </div>
  );
}

async function PastDueBanner({ price }: { price?: number | null }) {
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations("subscription");
  return (
    <div role="status" className="mx-3 mt-2.5 space-y-2.5 rounded-[16px] bg-status-soft px-3.5 py-3 text-[16px] font-semibold text-status-ink lg:mx-6 lg:mt-6">
      <p>{t("pastDue")}</p>
      <PayButton price={price} size="default" />
    </div>
  );
}
