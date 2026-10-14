import { requireClient } from "@/lib/auth/session";
import { signFiles, fileKey } from "@/lib/storage";
import { BUCKETS } from "@/lib/config";
import { ClientHeader } from "@/components/client/client-header";
import type { Subscription } from "@/lib/types";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const { supabase, business } = await requireClient();
  const [{ data: brand }, { count: readyCount }, { data: sub }] = await Promise.all([
    supabase.from("brand_profiles").select("logo_path").eq("business_id", business.id).maybeSingle(),
    supabase
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("status", "delivered"),
    supabase.from("subscriptions").select("status").eq("business_id", business.id).maybeSingle<Pick<Subscription, "status">>(),
  ]);
  let logoUrl: string | null = null;
  if (brand?.logo_path) {
    const urls = await signFiles(supabase, [{ bucket: BUCKETS.brandAssets, path: brand.logo_path }]);
    logoUrl = urls[fileKey(BUCKETS.brandAssets, brand.logo_path)] ?? null;
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col bg-background">
      <ClientHeader businessName={business.name} logoUrl={logoUrl} readyCount={readyCount ?? 0} />
      {sub?.status === "past_due" && <PastDueBanner />}
      {children}
    </div>
  );
}

async function PastDueBanner() {
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations("subscription");
  return (
    <div role="status" className="bg-warning/20 px-4 py-2.5 text-center font-medium text-warning-foreground">
      {t("pastDue")}
    </div>
  );
}
