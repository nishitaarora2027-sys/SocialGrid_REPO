import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isValidSignature, nextPeriodEnd, periodDays } from "./checkout";

const secret = "test_secret";
const sign = (orderId: string, paymentId: string) =>
  createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");

describe("isValidSignature", () => {
  it("accepts Razorpay's signature for the order and payment", () => {
    expect(isValidSignature("order_1", "pay_1", sign("order_1", "pay_1"), secret)).toBe(true);
  });

  it("rejects a signature for a different payment, a wrong secret or junk", () => {
    expect(isValidSignature("order_1", "pay_2", sign("order_1", "pay_1"), secret)).toBe(false);
    expect(isValidSignature("order_1", "pay_1", sign("order_1", "pay_1"), "other")).toBe(false);
    expect(isValidSignature("order_1", "pay_1", "abc", secret)).toBe(false);
  });
});

describe("nextPeriodEnd", () => {
  const now = new Date("2026-10-25T10:00:00Z");

  it("gives 30 days from today when there's no paid period left", () => {
    expect(nextPeriodEnd(null, 30, now)).toBe("2026-11-24T10:00:00.000Z");
    expect(nextPeriodEnd("2026-10-01T00:00:00Z", 30, now)).toBe("2026-11-24T10:00:00.000Z");
  });

  it("adds 30 days to the end of a period that hasn't run out", () => {
    expect(nextPeriodEnd("2026-11-01T00:00:00.000Z", 30, now)).toBe("2026-12-01T00:00:00.000Z");
  });

  it("gives a year for yearly plans", () => {
    expect(periodDays("year")).toBe(365);
    expect(periodDays(null)).toBe(30);
    expect(nextPeriodEnd(null, periodDays("year"), now)).toBe("2027-10-25T10:00:00.000Z");
  });
});
