import "server-only";
import { cookies } from "next/headers";
import { safeRedirectPath } from "@/lib/auth/redirect";

// The number waiting for a one-time code is kept in a short-lived, HTTP-only cookie rather than the URL.
export const PENDING = "otp_pending";
export const PENDING_MAX_AGE = 15 * 60;

export type Pending = { phone: string; next: string };

export async function readPending(): Promise<Pending | null> {
  const raw = (await cookies()).get(PENDING)?.value;
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Pending;
    return typeof v.phone === "string" && typeof v.next === "string" ? { phone: v.phone, next: safeRedirectPath(v.next) } : null;
  } catch {
    return null;
  }
}

// "+233241234567" -> "+233 24 *** 4567": enough to recognise, not enough to copy.
export function maskPhone(phone: string): string {
  const m = /^(\+233)(\d{2})\d{3}(\d{4})$/.exec(phone);
  if (m) return `${m[1]} ${m[2]} *** ${m[3]}`;
  return phone.length > 6 ? `${phone.slice(0, 4)} *** ${phone.slice(-4)}` : phone;
}
