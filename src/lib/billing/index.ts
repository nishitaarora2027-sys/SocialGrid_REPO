import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentType, SubscriptionStatus } from "@/lib/types";
import { spendPostCredit } from "./credits";
import { manualBillingProvider } from "./manual";
import { isRazorpayConfigured, razorpayBillingProvider } from "./razorpay";
import type { BillingProvider } from "./types";

export function getBillingProvider(): BillingProvider {
  return isRazorpayConfigured() ? razorpayBillingProvider : manualBillingProvider;
}

export type RequestAccess = "ok" | "inactive" | "limit_reached" | "type_not_allowed";

/**
 * The single server-side check for "may this business create a new request?".
 * The plan logic lives in the `request_access` SQL function so it can be tuned in one place.
 * Without an active plan, a paid-for post (see credits.ts) lets one request through and is used up.
 */
export async function checkRequestAccess(
  supabase: SupabaseClient,
  businessId: string,
  contentType?: ContentType | null,
): Promise<RequestAccess> {
  const { data, error } = await supabase.rpc("request_access", {
    bid: businessId,
    ctype: contentType ?? null,
  });
  if (error) throw error;
  if (data === "inactive" && (await spendPostCredit(businessId))) return "ok";
  return data as RequestAccess;
}

export function canCreateRequests(status: SubscriptionStatus | null | undefined) {
  return status !== "paused" && status !== "expired";
}
