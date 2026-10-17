// Organisation overview: next steps, listings, leads and verification at a glance.
import { boot, html, params, render, sb, setTitle } from "../core.js";
import { canEditListings, canManageTeam, canReadLeads, orgHeader, requireMembership } from "../portal.js";

boot();
const { org, role } = await requireMembership();
setTitle(org.name);
const root = document.getElementById("root");
const [{ data: listings }, leads] = await Promise.all([
  sb.from("property_listings").select("status").eq("organization_id", org.id),
  canReadLeads(role) ? sb.rpc("get_inbox", { p_org: org.id }) : Promise.resolve({ data: [] }),
]);
const count = (s) => (listings ?? []).filter((l) => s.includes(l.status)).length;
const leadRows = leads.data ?? [];
const p = params();

render(
  root,
  html`${orgHeader(org, role, "")}
    ${p.get("created") ? html`<div class="alert alert--success">Organisation created. You're the owner.</div>` : ""}
    ${p.get("joined") ? html`<div class="alert alert--success">You've joined ${org.name}.</div>` : ""}
    <div class="stats">
      <a class="stat" href="/portal/${org.slug}/listings"><b>${count(["published"])}</b><span>Live listings</span></a>
      <a class="stat" href="/portal/${org.slug}/listings"><b>${count(["submitted"])}</b><span>In review</span></a>
      ${canReadLeads(role)
        ? html`<a class="stat" href="/portal/${org.slug}/leads"><b>${leadRows.filter((r) => r.status === "new").length}</b><span>New leads</span></a>
            <a class="stat" href="/portal/${org.slug}/leads"><b>${leadRows.filter((r) => r.has_active_viewing).length}</b><span>Viewings in progress</span></a>`
        : ""}
    </div>
    <section class="card stack">
      <div class="row-between"><h2>Listings</h2><a class="link small" href="/portal/${org.slug}/listings">Manage →</a></div>
      <p class="small muted">Create a listing, add photos and submit it for review. Approved listings go live once your organisation is verified.</p>
      ${canEditListings(role) ? html`<a class="btn btn--full" href="/portal/${org.slug}/listings/new">+ New listing</a>` : ""}
    </section>
    ${canManageTeam(role)
      ? html`<section class="card stack-sm"><h2>Next steps</h2>
          <a class="link" href="/portal/${org.slug}/settings">Complete your public profile →</a>
          <a class="link" href="/portal/${org.slug}/team">Invite your team →</a></section>`
      : ""}
    <section class="card stack-sm">
      <h2>Verification</h2>
      ${org.verification_status === "verified"
        ? html`<p class="small">Your organisation is verified. Approved listings can be published.</p>`
        : html`<p class="small muted">Not verified yet. Our team checks your business registration before your listings can go live. Verification states exactly what was checked — it never implies you own a particular property.</p>`}
    </section>`,
);
root.removeAttribute("aria-busy");
