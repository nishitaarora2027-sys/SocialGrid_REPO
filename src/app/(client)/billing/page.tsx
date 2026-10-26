import { getTranslations } from "next-intl/server";
import { requireClient } from "@/lib/auth/session";
import { loadBillingInfo } from "@/lib/billing/plans";
import { PlanPicker } from "@/components/client/plan-picker";

export const dynamic = "force-dynamic";

/** Payments: the client's plan and the plans they can pay for online */
export default async function BillingPage() {
  const t = await getTranslations("subscription");
  const { supabase, business } = await requireClient();
  const { plans, subscription } = await loadBillingInfo(supabase, business.id);

  return (
    <main className="w-full max-w-5xl flex-1 space-y-3 px-3 py-3 lg:space-y-5 lg:px-10 lg:py-8">
      <h1 className="text-[30px] leading-tight font-bold max-lg:sr-only">{t("pageTitle")}</h1>
      <PlanPicker
        plans={plans}
        currentPlanId={subscription?.plan_id ?? null}
        status={subscription?.status ?? null}
        periodEnd={subscription?.current_period_end ?? null}
        businessName={business.name}
      />
    </main>
  );
}
