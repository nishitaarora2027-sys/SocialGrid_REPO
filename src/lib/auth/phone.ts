import { CLIENT_EMAIL_DOMAIN } from "@/lib/config";

/** Normalises an Indian mobile number to 91XXXXXXXXXX. Returns null if it can't. */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return null;
}

export function phoneToEmail(phone: string) {
  return `${phone}@${CLIENT_EMAIL_DOMAIN}`;
}

/** 919876543210 → +91 98765 43210 */
export function formatPhone(phone: string | null | undefined) {
  if (!phone) return "";
  const p = phone.replace(/\D/g, "");
  if (p.length === 12 && p.startsWith("91")) return `+91 ${p.slice(2, 7)} ${p.slice(7)}`;
  return phone;
}
