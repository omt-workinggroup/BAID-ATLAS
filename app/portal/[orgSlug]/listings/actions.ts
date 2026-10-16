"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMembership } from "@/lib/auth/session";
import { fieldErrors, type FieldErrors } from "@/lib/validation/schemas";
import { listingSchema, toPayload } from "@/lib/validation/listing";

export type ListingFormState = { errors?: FieldErrors; message?: string; ok?: boolean } | undefined;

const EDIT_ROLES = ["owner", "admin", "listing_manager"];

function dbMessage(error: { code?: string; message?: string } | null) {
  switch (error?.code) {
    case "42501":
      return error.message?.includes("verified")
        ? "Your organisation must be verified before listings go live. We'll let you know once verification is complete."
        : "You don't have permission to do that.";
    case "55000":
      return "This listing can't be changed right now — it may be in review.";
    case "23514":
      return error.message?.replace(/^./, (c) => c.toUpperCase()) ?? "Some details are missing.";
    case "54000":
      return "You've hit a limit. Please try again later.";
    default:
      return "Something went wrong. Please try again.";
  }
}

function readForm(formData: FormData) {
  const raw: Record<string, FormDataEntryValue> = Object.fromEntries(
    [
      "title", "description", "purpose", "property_type", "region", "city", "locality", "address_private",
      "bedrooms", "bathrooms", "floor_area", "floor_area_unit", "land_area", "land_area_unit",
      "asking_price", "currency", "price_period",
    ].map((k) => [k, formData.get(k) ?? ""]),
  );
  // A unit on its own means "no area given".
  for (const k of ["floor_area", "land_area"]) if (!String(raw[k] ?? "").trim()) raw[`${k}_unit`] = "";
  return raw;
}

export async function createListing(slug: string, _: ListingFormState, formData: FormData): Promise<ListingFormState> {
  const { organization, role } = await requireMembership(slug, `/portal/${slug}/listings/new`);
  if (!EDIT_ROLES.includes(role)) return { message: "Only owners, admins and listing managers can create listings." };
  const parsed = listingSchema.safeParse(readForm(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_listing", { p_org: organization.id, p: toPayload(parsed.data) });
  if (error || !data) return { message: dbMessage(error) };
  redirect(`/portal/${slug}/listings/${data}?created=1`);
}

export async function updateListing(slug: string, listingId: string, _: ListingFormState, formData: FormData): Promise<ListingFormState> {
  await requireMembership(slug, `/portal/${slug}/listings/${listingId}`);
  const parsed = listingSchema.safeParse(readForm(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_listing", { p_listing: listingId, p: toPayload(parsed.data) });
  if (error) return { message: dbMessage(error) };
  revalidatePath(`/portal/${slug}/listings/${listingId}`);
  return { ok: true };
}

export async function addMedia(
  slug: string,
  listingId: string,
  input: { path: string; alt: string; isRender: boolean; isStaged: boolean; width: number; height: number },
): Promise<{ ok: boolean; message?: string }> {
  await requireMembership(slug, `/portal/${slug}/listings/${listingId}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_listing_media", {
    p_listing: listingId,
    p_path: input.path,
    p_alt: input.alt.slice(0, 200),
    p_is_render: input.isRender,
    p_is_staged: input.isStaged,
    p_width: Math.round(input.width),
    p_height: Math.round(input.height),
  });
  revalidatePath(`/portal/${slug}/listings/${listingId}`);
  return error ? { ok: false, message: dbMessage(error) } : { ok: true };
}

export async function hideMedia(slug: string, listingId: string, formData: FormData) {
  await requireMembership(slug, `/portal/${slug}/listings/${listingId}`);
  const supabase = await createClient();
  await supabase.rpc("hide_listing_media", { p_media: String(formData.get("media_id")) });
  revalidatePath(`/portal/${slug}/listings/${listingId}`);
}

export async function makeCover(slug: string, listingId: string, formData: FormData) {
  await requireMembership(slug, `/portal/${slug}/listings/${listingId}`);
  const supabase = await createClient();
  await supabase.rpc("set_listing_cover", { p_media: String(formData.get("media_id")) });
  revalidatePath(`/portal/${slug}/listings/${listingId}`);
}

async function transition(slug: string, listingId: string, rpc: string, args: Record<string, unknown>, success: string) {
  await requireMembership(slug, `/portal/${slug}/listings/${listingId}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc(rpc, args);
  revalidatePath(`/portal/${slug}/listings`);
  const q = error ? `error=${encodeURIComponent(dbMessage(error))}` : `done=${success}`;
  redirect(`/portal/${slug}/listings/${listingId}?${q}`);
}

export async function submitListing(slug: string, listingId: string) {
  await transition(slug, listingId, "submit_listing", { p_listing: listingId }, "submitted");
}

export async function publishListing(slug: string, listingId: string) {
  await transition(slug, listingId, "publish_listing", { p_listing: listingId }, "published");
}

export async function changeStatus(slug: string, listingId: string, formData: FormData) {
  const status = String(formData.get("status"));
  if (!["paused", "sold", "rented", "archived"].includes(status)) redirect(`/portal/${slug}/listings/${listingId}`);
  await transition(slug, listingId, "set_listing_status", { p_listing: listingId, p_status: status }, status);
}
