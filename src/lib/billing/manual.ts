import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BillingProvider } from "./types";

/** Experts set subscription status by hand from the dashboard. */
export const manualBillingProvider: BillingProvider = {
  name: "manual",

  async createSubscription({ businessId, planId, status = "trial", currentPeriodEnd = null }) {
    const admin = createAdminClient();
    const { error } = await admin.from("subscriptions").upsert(
      {
        business_id: businessId,
        plan_id: planId,
        status,
        current_period_end: currentPeriodEnd,
        provider: "manual",
      },
      { onConflict: "business_id" },
    );
    if (error) throw error;
    return { providerRef: null };
  },

  async cancel(businessId) {
    const admin = createAdminClient();
    const { error } = await admin
      .from("subscriptions")
      .update({ status: "expired" })
      .eq("business_id", businessId);
    if (error) throw error;
  },

  async handleWebhook() {
    return { handled: false };
  },
};
