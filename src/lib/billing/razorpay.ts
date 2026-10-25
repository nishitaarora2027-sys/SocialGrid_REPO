import "server-only";
import Razorpay from "razorpay";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionStatus } from "@/lib/types";
import { MIN_AMOUNT_PAISE, isValidSignature, nextPeriodEnd } from "./checkout";
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
 * Monthly plan payments through Razorpay Standard Checkout: the server creates an order for
 * the business's plan, the browser opens the Razorpay modal, and the server verifies the
 * returned signature before marking the plan active for 30 days.
 */
export const razorpayBillingProvider: BillingProvider & {
  createOrder(businessId: string): Promise<{ orderId: string; amount: number; currency: string; planName: string }>;
  verifyPayment(input: {
    businessId: string;
    orderId: string;
    paymentId: string;
    signature: string;
  }): Promise<{ currentPeriodEnd: string }>;
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

  /** The amount always comes from the business's plan in the database, never from the browser */
  async createOrder(businessId) {
    const admin = createAdminClient();
    const { data: sub } = await admin.from("subscriptions").select("plan_id").eq("business_id", businessId).maybeSingle();
    if (!sub?.plan_id) throw new BillingError("no_plan", 400);
    const { data: plan } = await admin.from("plans").select("id, name, price_inr").eq("id", sub.plan_id).maybeSingle();
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
      return { orderId: order.id, amount: Number(order.amount), currency: order.currency, planName: plan.name };
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
    const { data: sub } = await admin
      .from("subscriptions")
      .select("status, current_period_end, provider_ref")
      .eq("business_id", businessId)
      .maybeSingle();

    // Already applied (e.g. the browser sent it twice): don't add another 30 days
    if (sub?.provider_ref === paymentId && sub.current_period_end) {
      return { currentPeriodEnd: sub.current_period_end };
    }

    const currentPeriodEnd = nextPeriodEnd(sub?.status === "active" ? sub.current_period_end : null);
    await upsertSubscription({ businessId, planId, status: "active", currentPeriodEnd, providerRef: paymentId });
    return { currentPeriodEnd };
  },
};
