"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import { REVIEW_REASONS } from "@/lib/validation/listing";

const reviewSchema = z.object({
  decision: z.enum(["approved", "changes_requested", "rejected"]),
  reason_code: z.union([z.enum(Object.keys(REVIEW_REASONS) as [string, ...string[]]), z.literal("")]),
  provider_message: z.string().trim().max(1000),
  internal_notes: z.string().trim().max(2000),
});

export async function reviewListing(listingId: string, formData: FormData) {
  await requireStaff(`/ops/reviews/${listingId}`);
  const parsed = reviewSchema.safeParse({
    decision: formData.get("decision"),
    reason_code: formData.get("reason_code") ?? "",
    provider_message: formData.get("provider_message") ?? "",
    internal_notes: formData.get("internal_notes") ?? "",
  });
  if (!parsed.success) redirect(`/ops/reviews/${listingId}?error=${encodeURIComponent("Check the decision form.")}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_listing", {
    p_listing: listingId,
    p_decision: parsed.data.decision,
    p_reason_code: parsed.data.reason_code,
    p_provider_message: parsed.data.provider_message,
    p_internal_notes: parsed.data.internal_notes,
  });
  if (error) {
    const msg =
      error.message.includes("own organisation") ? "You can't review your own organisation's listing."
      : error.message.includes("tell the provider") ? "Add a message telling the provider what to change."
      : error.code === "55000" ? "This listing is no longer waiting for review."
      : "Couldn't record the decision.";
    redirect(`/ops/reviews/${listingId}?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/ops");
  redirect("/ops?done=1");
}

const verifySchema = z.object({
  status: z.enum(["verified", "rejected", "expired", "in_review"]),
  scope: z.string().trim().max(200),
  months: z.coerce.number().int().min(1).max(36),
});

export async function setVerification(orgId: string, formData: FormData) {
  await requireStaff("/ops/organisations", ["platform_admin"]);
  const parsed = verifySchema.safeParse({
    status: formData.get("status"),
    scope: formData.get("scope") ?? "",
    months: formData.get("months") ?? 12,
  });
  if (!parsed.success) redirect(`/ops/organisations?error=${encodeURIComponent("Check the verification form.")}`);
  const expires = new Date();
  expires.setMonth(expires.getMonth() + parsed.data.months);
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_organization_verification", {
    p_org: orgId,
    p_status: parsed.data.status,
    p_scope: parsed.data.scope,
    p_expires_at: parsed.data.status === "verified" ? expires.toISOString() : null,
  });
  revalidatePath("/ops/organisations");
  redirect(`/ops/organisations?${error ? `error=${encodeURIComponent(error.message.includes("describe") ? "Describe exactly what was verified." : "Couldn't save verification.")}` : "done=1"}`);
}
