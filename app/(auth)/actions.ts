"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { safeRedirectPath } from "@/lib/auth/redirect";
import {
  fieldErrors,
  newPasswordSchema,
  resetRequestSchema,
  signInSchema,
  signUpSchema,
  type FieldErrors,
} from "@/lib/validation/schemas";

export type AuthState = { errors?: FieldErrors; message?: string; email?: string } | undefined;

async function siteUrl() {
  // Prefer the configured URL; fall back to the request origin for preview deploys.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return process.env.NEXT_PUBLIC_SITE_URL ? env.siteUrl : host ? `${proto}://${host}` : env.siteUrl;
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), email: String(formData.get("email") ?? "") };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${await siteUrl()}/auth/callback?next=/onboarding` },
  });
  if (error) {
    if (error.status === 429) return { message: "Too many attempts. Please wait a few minutes.", email: parsed.data.email };
    if (error.code === "weak_password") return { errors: { password: error.message }, email: parsed.data.email };
    // Don't reveal whether an account already exists.
    if (error.code !== "user_already_exists") {
      return { message: "We couldn't create your account. Please try again.", email: parsed.data.email };
    }
  }
  redirect(`/verify-email?email=${encodeURIComponent(parsed.data.email)}`);
}

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signInSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { errors: fieldErrors(parsed.error), email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") {
      redirect(`/verify-email?email=${encodeURIComponent(parsed.data.email)}&unconfirmed=1`);
    }
    if (error.status === 429) return { message: "Too many attempts. Please wait a few minutes.", email };
    return { message: "Email or password is incorrect.", email };
  }
  redirect(safeRedirectPath(String(formData.get("next") ?? "")));
}

export async function resendVerification(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = resetRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${await siteUrl()}/auth/callback?next=/onboarding` },
  });
  if (error?.status === 429) return { message: "Please wait a minute before requesting another email." };
  return { message: "If that address needs verifying, we've sent a new link." };
}

export async function requestPasswordReset(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = resetRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await siteUrl()}/auth/callback?next=/reset-password/update`,
  });
  // Same response whether or not the account exists.
  return { message: "If an account exists for that email, we've sent a reset link. It expires in 1 hour." };
}

export async function updatePassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = newPasswordSchema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { errors: { password: "Choose a different password from your current one." } };
    if (error.code === "weak_password") return { errors: { password: error.message } };
    return { message: "We couldn't update your password. Request a new reset link and try again." };
  }
  // Sign out other devices after a password change.
  await supabase.auth.signOut({ scope: "others" });
  redirect("/account?updated=password");
}

export async function signOut(formData: FormData) {
  const supabase = await createClient();
  const scope = formData.get("scope") === "global" ? "global" : "local";
  await supabase.auth.signOut({ scope });
  redirect("/sign-in?signed_out=1");
}

// Google sign-in through Supabase OAuth (PKCE). Supabase sends the user back to /auth/callback, which
// exchanges the code for a session. If Google isn't enabled in Supabase, the user gets a clear message.
export async function signInWithGoogle(formData: FormData) {
  const next = safeRedirectPath(String(formData.get("next") ?? ""));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`, skipBrowserRedirect: true },
  });
  if (error || !data.url) redirect(`/sign-in?error=google`);
  redirect(data.url);
}
