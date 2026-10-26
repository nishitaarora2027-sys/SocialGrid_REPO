"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { PayButton } from "@/components/client/pay-button";
import { PlanPicker } from "@/components/client/plan-picker";
import { formatPrice } from "@/lib/format";
import type { Plan, Subscription } from "@/lib/types";

type Retry = () => void | Promise<void>;
const PayGateContext = createContext<((retry: Retry) => void) | null>(null);

/**
 * Asking for a post without an active plan comes back as "inactive". Callers hand the failed
 * action to {@link usePayGate}: this sheet offers to pay for that one post (or pick a plan)
 * and, once the payment is verified, runs the action again.
 */
export function PayGateProvider({
  plans,
  subscription,
  businessName,
  children,
}: {
  plans: Plan[];
  subscription: Pick<Subscription, "status" | "plan_id" | "current_period_end"> | null;
  businessName: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("subscription");
  const [open, setOpen] = useState(false);
  const retry = useRef<Retry | null>(null);
  const perPost = plans.find((p) => p.limits.billing === "post");
  const subscriptionPlans = plans.filter((p) => p.limits.billing !== "post");

  const requirePayment = useCallback((r: Retry) => {
    retry.current = r;
    setOpen(true);
  }, []);
  const close = () => setOpen(false);
  const paid = () => {
    const r = retry.current;
    retry.current = null;
    void r?.();
  };

  return (
    <PayGateContext.Provider value={requirePayment}>
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="max-h-[90dvh] space-y-1 overflow-y-auto">
          <SheetTitle className="text-[22px] font-bold">{t("payGateTitle")}</SheetTitle>
          <SheetDescription className="text-[17px] text-ink-muted">{t("payGateText")}</SheetDescription>
          {perPost && (
            <PayButton
              planId={perPost.id}
              label={t("payForPost", { amount: formatPrice(perPost.price_inr) })}
              businessName={businessName}
              onOpenCheckout={close}
              onPaid={paid}
              className="my-2 w-full"
            />
          )}
          {subscriptionPlans.length > 0 && (
            <>
              <p className="pt-3 text-[15px] font-semibold text-ink-muted">{t("orChoosePlan")}</p>
              <PlanPicker
                plans={subscriptionPlans}
                currentPlanId={subscription?.plan_id ?? null}
                status={null}
                periodEnd={null}
                businessName={businessName}
                onOpenCheckout={close}
                onPaid={paid}
              />
            </>
          )}
        </SheetContent>
      </Sheet>
    </PayGateContext.Provider>
  );
}

/**
 * Returns a handler for a failed "ask for a post" result: true when it was "inactive" and the
 * pay sheet opened (the action re-runs after payment), false for any other error.
 */
export function usePayGate() {
  const requirePayment = useContext(PayGateContext);
  return (error: string, retry: Retry) => {
    if (error !== "inactive" || !requirePayment) return false;
    requirePayment(retry);
    return true;
  };
}
