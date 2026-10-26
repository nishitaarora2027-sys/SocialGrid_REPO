import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensurePostCredits } from "@/lib/setup/upgrades";
import type { Plan, Subscription } from "@/lib/types";
import { canCreateRequests } from "./index";

export type CurrentSubscription = Pick<Subscription, "status" | "plan_id" | "current_period_end" | "post_credits">;

/**
 * Plans a client can pay for online (active, ₹1 or more), cheapest first, their subscription,
 * and whether they can ask for posts: with an active plan, a paid-for post, or by paying per post.
 */
export const loadBillingInfo = cache(async (supabase: SupabaseClient, businessId: string) => {
  await ensurePostCredits();
  const [{ data: plans }, { data: sub }] = await Promise.all([
    supabase.from("plans").select("*").eq("active", true).gt("price_inr", 0).order("price_inr"),
    supabase
      .from("subscriptions")
      .select("status, plan_id, current_period_end, post_credits")
      .eq("business_id", businessId)
      .maybeSingle<CurrentSubscription>(),
  ]);
  const list = (plans ?? []) as Plan[];
  const subscription = sub ?? null;
  const perPost = list.find((p) => p.limits.billing === "post") ?? null;
  const canRequest = canCreateRequests(subscription?.status) || (subscription?.post_credits ?? 0) > 0 || !!perPost;
  return { plans: list, perPost, subscription, canRequest };
});

export type BillingInfo = Awaited<ReturnType<typeof loadBillingInfo>>;
