// Shared by the provider portal pages: which organisation, your role in it, and the header with tabs.
import { html, raw, requireProfile, sb } from "./core.js";
import { ORGANIZATION_TYPE_LABELS, ORG_ROLE_LABELS, VERIFICATION_LABELS } from "./format.js";

export const canManageTeam = (role) => role === "owner" || role === "admin";
export const canEditListings = (role) => ["owner", "admin", "listing_manager"].includes(role);
export const canReadLeads = (role) => ["owner", "admin", "lead_manager", "listing_manager", "viewer"].includes(role);
export const canManageLeads = (role) => ["owner", "admin", "lead_manager"].includes(role);

// /portal/<org>/... -> "<org>"
export const orgSlug = () => decodeURIComponent(location.pathname.split("/")[2] ?? "");

// Loads the organisation and the signed-in member's role; non-members go back to the portal list.
export async function requireMembership() {
  const profile = await requireProfile();
  const slug = orgSlug();
  const { data: org } = await sb
    .from("organizations")
    .select("id, name, slug, type, description, website, public_email, public_phone, verification_status")
    .eq("slug", slug)
    .maybeSingle();
  const { data: member } = org
    ? await sb.from("organization_members").select("role").eq("organization_id", org.id).eq("user_id", profile.id).maybeSingle()
    : { data: null };
  if (!org || !member) {
    location.replace("/portal?error=not-found");
    return new Promise(() => {});
  }
  return { profile, org, role: member.role };
}

const TABS = [
  ["", "Overview"],
  ["/leads", "Leads"],
  ["/listings", "Listings"],
  ["/team", "Team"],
  ["/settings", "Profile"],
];

export function orgHeader(org, role, active) {
  return html`<div class="stack-sm">
      <a class="back-link" href="/portal">← All organisations</a>
      <h1 style="font-size: 2rem">${org.name}</h1>
      <div class="row wrap">
        <span class="status">${ORGANIZATION_TYPE_LABELS[org.type]}</span>
        <span class="status">You: ${ORG_ROLE_LABELS[role]}</span>
        <span class="status ${org.verification_status === "verified" ? "status--approved" : ""}">${VERIFICATION_LABELS[org.verification_status]}</span>
      </div>
    </div>
    <nav class="tabs" aria-label="Organisation">
      ${TABS.filter(([p]) => p !== "/leads" || canReadLeads(role)).map(
        ([p, label]) => html`<a href="/portal/${org.slug}${p}" ${raw(p === active ? 'aria-current="page"' : "")}>${label}${p === "/leads" ? raw('<span class="badge-count" data-org-unread hidden></span>') : ""}</a>`,
      )}
    </nav>`;
}
