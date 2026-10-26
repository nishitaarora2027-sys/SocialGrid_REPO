import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan, Subscription } from "@/lib/types";

export type CurrentSubscription = Pick<Subscription, "status" | "plan_id" | "current_period_end">;

/** Plans a client can pay for online (active, ₹1 or more), cheapest first, plus their subscription */
export async function loadBillingInfo(supabase: SupabaseClient, businessId: string) {
  const [{ data: plans }, { data: sub }] = await Promise.all([
    supabase.from("plans").select("*").eq("active", true).gt("price_inr", 0).order("price_inr"),
    supabase
      .from("subscriptions")
      .select("status, plan_id, current_period_end")
      .eq("business_id", businessId)
      .maybeSingle<CurrentSubscription>(),
  ]);
  return { plans: (plans ?? []) as Plan[], subscription: sub ?? null };
}
