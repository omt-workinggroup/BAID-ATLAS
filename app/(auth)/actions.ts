"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { PENDING, PENDING_MAX_AGE, readPending } from "@/lib/auth/pending";
import { fieldErrors, otpSchema, phoneSignInSchema, type FieldErrors } from "@/lib/validation/schemas";

export type AuthState = { errors?: FieldErrors; message?: string; phone?: string; sent?: boolean } | undefined;

async function sendSms(phone: string): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: true, channel: "sms" } });
  if (!error) return null;
  if (error.status === 429 || error.code === "over_sms_send_rate_limit") return "Please wait a minute before asking for another code.";
  // Only a rejected number is the user's to fix; delivery failures (gateway down, out of credit) are ours.
  if ((error.status === 400 || error.status === 422) && error.code !== "phone_provider_disabled") {
    if (error.code === "validation_failed" || error.code === "phone_invalid" || /phone/i.test(error.message)) {
      return "We couldn't send a code to that number. Check it and try again.";
    }
  }
  return "We couldn't send a text message right now. Please try again in a few minutes.";
}

// Step 1: send a one-time code. The same flow signs people up and signs them in.
export async function sendCode(_: AuthState, formData: FormData): Promise<AuthState> {
  const input = String(formData.get("phone") ?? "");
  const parsed = phoneSignInSchema.safeParse({ phone: input });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), phone: input };

  const failure = await sendSms(parsed.data.phone);
  if (failure) return { message: failure, phone: input };

  const next = safeRedirectPath(String(formData.get("next") ?? ""));
  (await cookies()).set(PENDING, JSON.stringify({ phone: parsed.data.phone, next }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PENDING_MAX_AGE,
  });
  redirect("/verify-phone");
}

// Step 2: check the code. Supabase creates the session cookies on success.
export async function verifyCode(_: AuthState, formData: FormData): Promise<AuthState> {
  const pending = await readPending();
  if (!pending) redirect("/sign-in?error=expired");

  const parsed = otpSchema.safeParse({ token: formData.get("token") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ phone: pending.phone, token: parsed.data.token, type: "sms" });
  if (error) {
    if (error.status === 429) return { message: "Too many attempts. Please wait a few minutes." };
    return { errors: { token: "That code is wrong or has expired. Check it, or send a new one." } };
  }
  (await cookies()).delete(PENDING);
  redirect(pending.next);
}

export async function resendCode(): Promise<AuthState> {
  const pending = await readPending();
  if (!pending) redirect("/sign-in?error=expired");
  const failure = await sendSms(pending.phone);
  return failure ? { message: failure } : { sent: true };
}

export async function signOut(formData: FormData) {
  const supabase = await createClient();
  const scope = formData.get("scope") === "global" ? "global" : "local";
  await supabase.auth.signOut({ scope });
  redirect("/sign-in?signed_out=1");
}
