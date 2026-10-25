import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { BillingError, razorpayBillingProvider } from "@/lib/billing/razorpay";
import { clientBusinessId } from "@/lib/billing/route-auth";

const schema = z.object({
  razorpay_order_id: z.string().min(1).max(64),
  razorpay_payment_id: z.string().min(1).max(64),
  razorpay_signature: z.string().min(1).max(256),
});

/** Checks the Razorpay signature and, only if it matches, marks the plan active for 30 days */
export async function POST(request: Request) {
  const businessId = await clientBusinessId();
  if (!businessId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  try {
    const { currentPeriodEnd } = await razorpayBillingProvider.verifyPayment({
      businessId,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, current_period_end: currentPeriodEnd });
  } catch (e) {
    if (e instanceof BillingError) return NextResponse.json({ error: e.code }, { status: e.status });
    console.error("verify-payment failed", e);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
