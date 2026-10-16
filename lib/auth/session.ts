import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  display_name: string | null;
  email: string;
  phone: string | null;
  preferred_locale: string;
  preferred_currency: string;
  account_status: "active" | "suspended" | "closed";
  email_verified_at: string | null;
  onboarded_at: string | null;
};

// Cached per request so layouts and pages share one auth round trip.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, display_name, email, phone, preferred_locale, preferred_currency, account_status, email_verified_at, onboarded_at",
    )
    .eq("id", user.id)
    .single();
  return (data as Profile | null) ?? null;
});

export async function requireUser(next: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return user;
}

// Signed in, active (not suspended/closed) and onboarded.
export async function requireActiveProfile(next: string, { allowNotOnboarded = false } = {}) {
  await requireUser(next);
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  if (profile.account_status !== "active") redirect("/account/suspended");
  if (!allowNotOnboarded && !profile.onboarded_at) redirect("/onboarding");
  return profile;
}

export type Membership = {
  organization: {
    id: string;
    name: string;
    slug: string;
    type: string;
    description: string | null;
    website: string | null;
    public_email: string | null;
    public_phone: string | null;
    verification_status: string;
  };
  role: string;
};

// Resolves an organisation by slug and the caller's role in it; non-members are sent back to the portal.
export async function requireMembership(slug: string, next: string): Promise<Membership & { profileId: string }> {
  const profile = await requireActiveProfile(next);
  const membership = await loadMembership(slug, profile.id);
  if (!membership) redirect("/portal?error=not-found");
  return { ...membership, profileId: profile.id };
}

const loadMembership = cache(async (slug: string, profileId: string): Promise<Membership | null> => {
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug, type, description, website, public_email, public_phone, verification_status")
    .eq("slug", slug)
    .maybeSingle();
  if (!org) return null;

  const { data: member } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", org.id)
    .eq("user_id", profileId)
    .maybeSingle();
  if (!member) return null;

  return { organization: org, role: member.role };
});

export function canManageTeam(role: string) {
  return role === "owner" || role === "admin";
}

export const getStaffRoles = cache(async (): Promise<string[]> => {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("staff_roles").select("role").eq("user_id", user.id);
  return (data ?? []).map((r) => r.role as string);
});

// Platform staff only; organisation roles never grant access here.
export async function requireStaff(next: string, roles: string[] = ["moderator", "platform_admin"]) {
  const profile = await requireActiveProfile(next);
  const staff = await getStaffRoles();
  if (!staff.some((r) => roles.includes(r))) redirect("/account?error=staff-only");
  return { profile, staff };
}
