import { NextResponse } from "next/server";
import { z } from "zod";
import { BillingError, razorpayBillingProvider } from "@/lib/billing/razorpay";
import { clientBusinessId } from "@/lib/billing/route-auth";

const schema = z.object({ plan_id: z.string().uuid().nullish() });

/** Creates a Razorpay order for the plan the signed-in client picked (or their current plan) */
export async function POST(request: Request) {
  const businessId = await clientBusinessId();
  if (!businessId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = schema.safeParse((await request.json().catch(() => null)) ?? {});
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  try {
    const order = await razorpayBillingProvider.createOrder(businessId, parsed.data.plan_id);
    return NextResponse.json({
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      plan_name: order.planName,
      key_id: order.keyId,
    });
  } catch (e) {
    if (e instanceof BillingError) return NextResponse.json({ error: e.code }, { status: e.status });
    console.error("create-order failed", e);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
