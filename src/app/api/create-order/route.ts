import { NextResponse } from "next/server";
import { BillingError, razorpayBillingProvider } from "@/lib/billing/razorpay";
import { clientBusinessId } from "@/lib/billing/route-auth";

/** Creates a Razorpay order for the signed-in client's monthly plan */
export async function POST() {
  const businessId = await clientBusinessId();
  if (!businessId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const order = await razorpayBillingProvider.createOrder(businessId);
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
