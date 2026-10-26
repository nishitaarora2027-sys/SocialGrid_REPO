"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CreditCardIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PUBLIC_RAZORPAY_KEY_ID } from "@/lib/public-env";
import { formatDate, formatPrice } from "@/lib/format";
import type { Locale } from "@/lib/types";

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", handler: (r: { error?: { description?: string } }) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

let scriptPromise: Promise<boolean> | null = null;
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve(true);
  scriptPromise ??= new Promise<boolean>((resolve) => {
    const s = document.createElement("script");
    s.src = CHECKOUT_SRC;
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => {
      scriptPromise = null;
      resolve(false);
    };
    document.body.appendChild(s);
  });
  return scriptPromise;
}

async function postJson<T>(url: string, body?: unknown): Promise<{ ok: boolean; data: T | null }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => null)) as T | null;
  return { ok: res.ok, data };
}

/** Pays for a plan (the client's current one if no planId) with Razorpay Standard Checkout */
export function PayButton({
  planId,
  price,
  label,
  businessName,
  className,
  size = "lg",
  variant,
  onPaid,
  onOpenCheckout,
}: {
  planId?: string;
  price?: number | null;
  label?: string;
  businessName?: string;
  className?: string;
  size?: "default" | "lg";
  variant?: "default" | "outline";
  onPaid?: () => void;
  /** Called just before the Razorpay window opens, e.g. to close a sheet that would sit on top of it */
  onOpenCheckout?: () => void;
}) {
  const t = useTranslations("subscription");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function pay() {
    setBusy(true);
    try {
      const [loaded, order] = await Promise.all([
        loadCheckout(),
        postJson<{ order_id: string; amount: number; currency: string; plan_name: string; key_id?: string; error?: string }>("/api/create-order", planId ? { plan_id: planId } : undefined),
      ]);
      if (!loaded || !window.Razorpay) throw new Error("script");
      const key = order.data?.key_id || PUBLIC_RAZORPAY_KEY_ID;
      if (!order.ok || !order.data?.order_id || !key) {
        toast.error(order.data?.error === "no_plan" ? t("noPlan") : t("payError"));
        setBusy(false);
        return;
      }

      const rzp = new window.Razorpay({
        key,
        order_id: order.data.order_id,
        amount: order.data.amount,
        currency: order.data.currency,
        name: "SocialGrid",
        description: order.data.plan_name,
        notes: businessName ? { business: businessName } : undefined,
        theme: { color: "#17140f" },
        handler: async (response: RazorpaySuccess) => {
          const res = await postJson<{ kind?: "plan" | "post"; current_period_end?: string }>("/api/verify-payment", response).catch(
            () => null,
          );
          setBusy(false);
          if (res?.ok && res.data?.kind) {
            toast.success(
              res.data.kind === "post" || !res.data.current_period_end
                ? t("postPaid")
                : t("paid", { date: formatDate(res.data.current_period_end, locale) }),
            );
            onPaid?.();
            router.refresh();
          } else {
            toast.error(t("verifyFailed"));
          }
        },
        modal: {
          ondismiss: () => {
            setBusy(false);
            toast(t("payCancelled"));
          },
        },
      });
      rzp.on("payment.failed", (r) => {
        console.error("razorpay payment.failed", r.error);
        toast.error(t("payFailed", { reason: r.error?.description ?? "" }));
      });
      onOpenCheckout?.();
      rzp.open();
    } catch {
      setBusy(false);
      toast.error(t("payError"));
    }
  }

  return (
    <Button size={size} variant={variant} className={className} onClick={pay} disabled={busy}>
      {busy ? <Loader2Icon className="animate-spin" /> : <CreditCardIcon />}
      {label ?? (price ? t("payAmount", { amount: formatPrice(price) }) : t("pay"))}
    </Button>
  );
}
