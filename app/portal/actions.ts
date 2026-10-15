"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { canManageTeam, requireActiveProfile, requireMembership } from "@/lib/auth/session";
import { friendlyDbError } from "@/lib/labels";
import {
  createOrganizationSchema,
  fieldErrors,
  inviteSchema,
  roleSchema,
  updateOrganizationSchema,
  type FieldErrors,
} from "@/lib/validation/schemas";

export type FormState = { errors?: FieldErrors; message?: string; ok?: boolean; inviteLink?: string } | undefined;

export async function createOrganization(_: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireActiveProfile("/portal/new");
  if (!profile.email_verified_at) return { message: "Please verify your email address first." };

  const parsed = createOrganizationSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    type: formData.get("type"),
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_organization", {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
    p_type: parsed.data.type,
    p_description: parsed.data.description,
  });
  if (error) {
    if (error.code === "23505") return { errors: { slug: "That web address is already taken." } };
    return { message: friendlyDbError(error) };
  }
  redirect(`/portal/${parsed.data.slug}?created=1`);
}

export async function updateOrganization(slug: string, _: FormState, formData: FormData): Promise<FormState> {
  const { organization, role } = await requireMembership(slug, `/portal/${slug}/organisation`);
  if (!canManageTeam(role)) return { message: "Only owners and admins can edit the organisation profile." };

  const parsed = updateOrganizationSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    website: formData.get("website") ?? "",
    public_email: formData.get("public_email") ?? "",
    public_phone: formData.get("public_phone") ?? "",
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .update(parsed.data)
    .eq("id", organization.id)
    .select("id");
  if (error || !data?.length) return { message: friendlyDbError(error) };
  revalidatePath(`/portal/${slug}`, "layout");
  return { ok: true };
}

export async function inviteMember(slug: string, _: FormState, formData: FormData): Promise<FormState> {
  const { organization, role } = await requireMembership(slug, `/portal/${slug}/team`);
  if (!canManageTeam(role)) return { message: "Only owners and admins can invite people." };

  const parsed = inviteSchema.safeParse({ email: formData.get("email"), role: formData.get("role") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data: token, error } = await supabase.rpc("invite_member", {
    p_org: organization.id,
    p_email: parsed.data.email,
    p_role: parsed.data.role,
  });
  if (error || !token) {
    if (error?.code === "23505" && !error.message.includes("already a member")) {
      return { errors: { email: "There's already an open invitation for this email." } };
    }
    return { message: friendlyDbError(error) };
  }
  revalidatePath(`/portal/${slug}/team`);
  // The token is shown once to the inviter; only its hash is stored.
  return { ok: true, inviteLink: `${env.siteUrl}/invitations/accept?token=${token}` };
}

export async function revokeInvitation(slug: string, formData: FormData) {
  await requireMembership(slug, `/portal/${slug}/team`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_invitation", { p_invitation: String(formData.get("invitation_id")) });
  revalidatePath(`/portal/${slug}/team`);
  if (error) redirect(`/portal/${slug}/team?error=${encodeURIComponent(friendlyDbError(error))}`);
}

export async function changeRole(slug: string, formData: FormData) {
  const { organization } = await requireMembership(slug, `/portal/${slug}/team`);
  const parsed = roleSchema.safeParse(formData.get("role"));
  const userId = String(formData.get("user_id"));
  if (!parsed.success) redirect(`/portal/${slug}/team?error=${encodeURIComponent("Choose a valid role.")}`);

  const supabase = await createClient();
  const { error } = await supabase.rpc("change_member_role", {
    p_org: organization.id,
    p_user: userId,
    p_role: parsed.data,
  });
  revalidatePath(`/portal/${slug}/team`);
  redirect(`/portal/${slug}/team?${error ? `error=${encodeURIComponent(friendlyDbError(error))}` : "updated=1"}`);
}

export async function removeMember(slug: string, formData: FormData) {
  const { organization, profileId } = await requireMembership(slug, `/portal/${slug}/team`);
  const userId = String(formData.get("user_id"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_member", { p_org: organization.id, p_user: userId });
  if (error) {
    redirect(`/portal/${slug}/team?error=${encodeURIComponent(friendlyDbError(error))}`);
  }
  if (userId === profileId) redirect("/portal");
  revalidatePath(`/portal/${slug}/team`);
  redirect(`/portal/${slug}/team?removed=1`);
}

export async function acceptInvitation(_: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  await requireActiveProfile(`/invitations/accept?token=${encodeURIComponent(token)}`);
  if (!/^[a-f0-9]{48}$/.test(token)) return { message: "This invitation link is not valid." };

  const supabase = await createClient();
  const { data: orgId, error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error || !orgId) return { message: friendlyDbError(error) };

  const { data: org } = await supabase.from("organizations").select("slug").eq("id", orgId).single();
  redirect(org ? `/portal/${org.slug}?joined=1` : "/portal");
}
