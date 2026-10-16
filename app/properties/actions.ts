"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";

export async function toggleSaved(listingId: string, save: boolean): Promise<{ ok: boolean }> {
  if (!/^[0-9a-f-]{36}$/.test(listingId)) return { ok: false };
  const profile = await getCurrentProfile();
  if (!profile || profile.account_status !== "active") return { ok: false };

  const supabase = await createClient();
  const { error } = save
    ? await supabase.from("saved_listings").upsert({ user_id: profile.id, listing_id: listingId }, { ignoreDuplicates: true })
    : await supabase.from("saved_listings").delete().eq("user_id", profile.id).eq("listing_id", listingId);
  revalidatePath("/account/saved");
  return { ok: !error };
}
