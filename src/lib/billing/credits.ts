import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensurePostCredits } from "@/lib/setup/upgrades";

/**
 * Per-post payments. Each verified payment adds one credit to the business's subscription row;
 * asking for a post without an active plan uses one. Updates are compare-and-set on the old
 * count, so two requests at once can't spend the same credit.
 */
async function changeCredits(businessId: string, delta: 1 | -1, extra: Record<string, unknown> = {}) {
  await ensurePostCredits();
  const admin = createAdminClient();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: sub } = await admin
      .from("subscriptions")
      .select("post_credits")
      .eq("business_id", businessId)
      .maybeSingle<{ post_credits: number }>();

    if (!sub) {
      if (delta < 0) return null;
      const { error } = await admin
        .from("subscriptions")
        .insert({ business_id: businessId, status: "expired", provider: "razorpay", post_credits: 1, ...extra });
      if (!error) return 1;
      continue; // someone created the row meanwhile: retry as an update
    }

    const next = sub.post_credits + delta;
    if (next < 0) return null;
    const { data: updated } = await admin
      .from("subscriptions")
      .update({ post_credits: next, ...extra })
      .eq("business_id", businessId)
      .eq("post_credits", sub.post_credits)
      .select("post_credits");
    if (updated?.length) return next;
  }
  throw new Error("post_credits: too many concurrent updates");
}

/** Adds one post credit; returns the new count */
export async function addPostCredit(businessId: string, paymentId: string) {
  return (await changeCredits(businessId, 1, { provider: "razorpay", provider_ref: paymentId })) ?? 0;
}

/** Spends one post credit if there is one */
export async function spendPostCredit(businessId: string) {
  return (await changeCredits(businessId, -1)) !== null;
}
