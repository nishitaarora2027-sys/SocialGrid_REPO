import { createHmac, timingSafeEqual } from "node:crypto";

/** One payment buys this many days of an active plan. */
export const PERIOD_DAYS = { month: 30, year: 365 } as const;

export function periodDays(billing: string | null | undefined) {
  return billing === "year" ? PERIOD_DAYS.year : PERIOD_DAYS.month;
}
/** Razorpay's minimum order amount: ₹1 */
export const MIN_AMOUNT_PAISE = 100;

/** HMAC-SHA256(order_id + "|" + payment_id, key secret), compared in constant time */
export function isValidSignature(orderId: string, paymentId: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Paid days start from today, or from the end of the current paid period if renewing early */
export function nextPeriodEnd(currentEnd: string | null, days: number = PERIOD_DAYS.month, now = new Date()) {
  const start = currentEnd && new Date(currentEnd) > now ? new Date(currentEnd) : now;
  return new Date(start.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}
