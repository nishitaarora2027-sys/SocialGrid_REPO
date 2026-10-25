import type { SubscriptionStatus } from "@/lib/types";

export interface CreateSubscriptionInput {
  businessId: string;
  planId: string;
  status?: SubscriptionStatus;
  currentPeriodEnd?: string | null;
}

/** Payment gateways implement this. ManualBillingProvider, plus RazorpayBillingProvider when its keys are set. */
export interface BillingProvider {
  readonly name: string;
  createSubscription(input: CreateSubscriptionInput): Promise<{ providerRef: string | null }>;
  cancel(businessId: string): Promise<void>;
  /** Parse and apply a gateway webhook. Manual billing has none. */
  handleWebhook(request: Request): Promise<{ handled: boolean }>;
}
