import "server-only";
import Razorpay from "razorpay";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionStatus } from "@/lib/types";
import { MIN_AMOUNT_PAISE, isValidSignature, nextPeriodEnd, periodDays } from "./checkout";
import { addPostCredit } from "./credits";
import type { BillingProvider } from "./types";

export class BillingError extends Error {
  constructor(
    readonly code: "not_configured" | "no_plan" | "amount_too_low" | "bad_signature" | "order_mismatch" | "gateway_auth" | "gateway",
    readonly status: number,
  ) {
    super(code);
  }
}

function keys() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new BillingError("not_configured", 500);
  return { keyId, keySecret };
}

export function isRazorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function client() {
  const { keyId, keySecret } = keys();
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

/** The SDK rejects with { statusCode, error } rather than an Error */
function gatewayError(e: unknown): BillingError {
  const status = (e as { statusCode?: number })?.statusCode;
  console.error("razorpay request failed", e);
  return status === 401 ? new BillingError("gateway_auth", 401) : new BillingError("gateway", 500);
}

async function upsertSubscription(row: {
  businessId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  providerRef?: string | null;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("subscriptions").upsert(
    {
      business_id: row.businessId,
      plan_id: row.planId,
      status: row.status,
      current_period_end: row.currentPeriodEnd,
      provider: "razorpay",
      provider_ref: row.providerRef ?? null,
    },
    { onConflict: "business_id" },
  );
  if (error) throw error;
}

/**
 * Plan payments through Razorpay Standard Checkout: the server creates an order for the plan
 * the client picked, the browser opens the Razorpay modal, and the server verifies the
 * returned signature before marking the plan active for 30 days (monthly) or 365 (yearly),
 * or adding one paid-for post (per post).
 */
export const razorpayBillingProvider: BillingProvider & {
  createOrder(businessId: string, planId?: string | null): Promise<{ orderId: string; amount: number; currency: string; planName: string; keyId: string }>;
  verifyPayment(input: {
    businessId: string;
    orderId: string;
    paymentId: string;
    signature: string;
  }): Promise<{ kind: "plan"; currentPeriodEnd: string } | { kind: "post"; postCredits: number }>;
} = {
  name: "razorpay",

  async createSubscription({ businessId, planId, status = "trial", currentPeriodEnd = null }) {
    await upsertSubscription({ businessId, planId, status, currentPeriodEnd });
    return { providerRef: null };
  },

  async cancel(businessId) {
    const admin = createAdminClient();
    const { error } = await admin.from("subscriptions").update({ status: "expired" }).eq("business_id", businessId);
    if (error) throw error;
  },

  async handleWebhook() {
    return { handled: false };
  },

  /**
   * Pays for the plan the client picked, or their current plan. The amount always comes from
   * the plan in the database, never from the browser.
   */
  async createOrder(businessId, planId) {
    const admin = createAdminClient();
    if (!planId) {
      const { data: sub } = await admin.from("subscriptions").select("plan_id").eq("business_id", businessId).maybeSingle();
      planId = sub?.plan_id ?? null;
    }
    if (!planId) throw new BillingError("no_plan", 400);
    const { data: plan } = await admin
      .from("plans")
      .select("id, name, price_inr")
      .eq("id", planId)
      .eq("active", true)
      .maybeSingle();
    if (!plan) throw new BillingError("no_plan", 400);
    const amount = Math.round(Number(plan.price_inr) * 100);
    if (!(amount >= MIN_AMOUNT_PAISE)) throw new BillingError("amount_too_low", 400);

    try {
      const order = await client().orders.create({
        amount,
        currency: "INR",
        // Receipts are capped at 40 characters
        receipt: `sg_${businessId.slice(0, 8)}_${Date.now()}`,
        notes: { business_id: businessId, plan_id: plan.id },
      });
      // The checkout must open with the same key ID that created the order
      return { orderId: order.id, amount: Number(order.amount), currency: order.currency, planName: plan.name, keyId: keys().keyId };
    } catch (e) {
      throw gatewayError(e);
    }
  },

  async verifyPayment({ businessId, orderId, paymentId, signature }) {
    if (!isValidSignature(orderId, paymentId, signature, keys().keySecret)) {
      throw new BillingError("bad_signature", 400);
    }

    // The signature proves Razorpay took the payment; the order notes prove it was for this business
    let notes: Record<string, string | number>;
    try {
      const order = await client().orders.fetch(orderId);
      notes = (order.notes ?? {}) as Record<string, string | number>;
    } catch (e) {
      throw gatewayError(e);
    }
    const planId = String(notes.plan_id ?? "");
    if (notes.business_id !== businessId || !planId) throw new BillingError("order_mismatch", 400);

    const admin = createAdminClient();
    const [{ data: sub }, { data: plan }] = await Promise.all([
      admin
        .from("subscriptions")
        .select("status, plan_id, current_period_end, provider_ref")
        .eq("business_id", businessId)
        .maybeSingle(),
      admin.from("plans").select("limits").eq("id", planId).maybeSingle(),
    ]);
    const billing = (plan?.limits as { billing?: string } | null)?.billing;

    // Already applied (e.g. the browser sent it twice): don't add another period or post
    if (sub?.provider_ref === paymentId) {
      return billing === "post"
        ? { kind: "post", postCredits: 0 }
        : { kind: "plan", currentPeriodEnd: sub.current_period_end ?? new Date().toISOString() };
    }

    if (billing === "post") {
      return { kind: "post", postCredits: await addPostCredit(businessId, paymentId) };
    }

    // Renewing the same plan early adds to the time left; switching plans starts today
    const keepTimeLeft = sub?.status === "active" && sub.plan_id === planId;
    const currentPeriodEnd = nextPeriodEnd(keepTimeLeft ? sub.current_period_end : null, periodDays(billing));
    await upsertSubscription({ businessId, planId, status: "active", currentPeriodEnd, providerRef: paymentId });
    return { kind: "plan", currentPeriodEnd };
  },
};
