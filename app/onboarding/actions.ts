"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireActiveProfile } from "@/lib/auth/session";
import { fieldErrors, onboardingSchema, type FieldErrors } from "@/lib/validation/schemas";
import { friendlyDbError } from "@/lib/labels";

export type OnboardingState = { errors?: FieldErrors; message?: string } | undefined;

export async function completeOnboarding(_: OnboardingState, formData: FormData): Promise<OnboardingState> {
  await requireActiveProfile("/onboarding", { allowNotOnboarded: true });
  const parsed = onboardingSchema.safeParse({
    display_name: formData.get("display_name"),
    intent: formData.get("intent"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_onboarding", { p_display_name: parsed.data.display_name });
  if (error) return { message: friendlyDbError(error) };

  redirect(parsed.data.intent === "provide" ? "/portal/new" : "/account?welcome=1");
}
