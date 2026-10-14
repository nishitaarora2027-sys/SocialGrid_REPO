import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentType, SubscriptionStatus } from "@/lib/types";
import { manualBillingProvider } from "./manual";
import type { BillingProvider } from "./types";

export function getBillingProvider(): BillingProvider {
  return manualBillingProvider;
}

export type RequestAccess = "ok" | "inactive" | "limit_reached" | "type_not_allowed";

/**
 * The single server-side check for "may this business create a new request?".
 * The logic lives in the `request_access` SQL function so it can be tuned in one place.
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
  return data as RequestAccess;
}

export function canCreateRequests(status: SubscriptionStatus | null | undefined) {
  return status !== "paused" && status !== "expired";
}
