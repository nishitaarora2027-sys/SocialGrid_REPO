"use client";

import { useLocale, useTranslations } from "next-intl";
import { CheckIcon } from "lucide-react";
import { PayButton } from "@/components/client/pay-button";
import { formatDate, formatPrice } from "@/lib/format";
import type { Locale, Plan, SubscriptionStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const period = (p: Plan) => p.limits.billing ?? "month";
const PER = { month: "perMonth", year: "perYear", post: "perPost" } as const;

/** The client's current plan and a card per paid plan, each with its own Pay button */
export function PlanPicker({
  plans,
  currentPlanId,
  status,
  periodEnd,
  postCredits = 0,
  businessName,
  onPaid,
  onOpenCheckout,
  className,
}: {
  plans: Plan[];
  currentPlanId: string | null;
  status: SubscriptionStatus | null;
  periodEnd: string | null;
  postCredits?: number;
  businessName?: string;
  onPaid?: () => void;
  onOpenCheckout?: () => void;
  className?: string;
}) {
  const t = useTranslations("subscription");
  const tStatus = useTranslations("subscriptionStatus");
  const locale = useLocale() as Locale;
  const cheapestMonthly = plans.find((p) => period(p) === "month");
  const active = status === "active" && periodEnd;

  if (!plans.length) return <p className="text-[17px] text-ink-muted">{t("noPaidPlan")}</p>;

  return (
    <div className={cn("space-y-3", className)}>
      {status && (
        <p className="text-[17px] text-ink-muted">
          {active ? t("activeTill", { date: formatDate(periodEnd, locale) }) : tStatus(status)}
        </p>
      )}
      {postCredits > 0 && <p className="text-[17px] font-semibold">{t("postsPaid", { count: postCredits })}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {plans.map((p) => {
          const current = p.id === currentPlanId && period(p) !== "post";
          const saving = period(p) === "year" && cheapestMonthly ? cheapestMonthly.price_inr * 12 - p.price_inr : 0;
          return (
            <div
              key={p.id}
              className={cn(
                "flex flex-col gap-3 rounded-[18px] border bg-surface p-4",
                current ? "border-primary ring-1 ring-primary" : "border-line",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-[19px] font-bold">{p.name}</h3>
                {current ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-[13px] font-semibold text-primary">
                    <CheckIcon className="size-3.5" /> {t("yourPlanBadge")}
                  </span>
                ) : saving > 0 ? (
                  <span className="rounded-full bg-sun-soft px-2.5 py-1 text-[13px] font-semibold text-sun">
                    {t("save", { amount: formatPrice(saving) })}
                  </span>
                ) : null}
              </div>
              <p>
                <span className="text-[28px] font-bold">{formatPrice(p.price_inr)}</span>
                <span className="text-[16px] text-ink-muted"> / {t(PER[period(p)])}</span>
              </p>
              {period(p) === "post" && <p className="text-[15px] text-ink-muted">{t("perPostHint")}</p>}
              <PayButton
                planId={p.id}
                price={p.price_inr}
                label={current && active ? t("renew") : t("payAmountShort", { amount: formatPrice(p.price_inr) })}
                variant={current ? "default" : "outline"}
                size="default"
                businessName={businessName}
                onPaid={onPaid}
                onOpenCheckout={onOpenCheckout}
                className="mt-auto w-full"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
