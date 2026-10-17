"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveProfile } from "@/lib/auth/session";
import { fieldErrors, profileSchema, type FieldErrors } from "@/lib/validation/schemas";

export type ProfileState = { errors?: FieldErrors; message?: string; ok?: boolean } | undefined;

export async function updateProfile(_: ProfileState, formData: FormData): Promise<ProfileState> {
  const profile = await requireActiveProfile("/account");
  const parsed = profileSchema.safeParse({
    display_name: formData.get("display_name"),
    preferred_currency: formData.get("preferred_currency"),
    preferred_locale: formData.get("preferred_locale"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  // Only allow-listed columns are writable (enforced by column grants and RLS too).
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", profile.id);
  if (error) return { message: "We couldn't save your changes. Please try again." };
  revalidatePath("/account");
  return { ok: true };
}
