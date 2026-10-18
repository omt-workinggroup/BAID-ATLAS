// Organisation overview: next steps, listings, leads and verification at a glance.
import { boot, html, params, render, sb, setTitle } from "../core.js";
import { timeAgo } from "../format.js";
import { availabilityState } from "../trust.js";
import { canEditListings, canManageTeam, canReadLeads, orgHeader, requireMembership } from "../portal.js";

boot();
const { org, role } = await requireMembership();
setTitle(org.name);
const root = document.getElementById("root");
const [{ data: listings }, leads] = await Promise.all([
  sb.from("property_listings").select("id, title, reference, status, availability_confirmed_at, updated_at").eq("organization_id", org.id).order("updated_at", { ascending: false }),
  canReadLeads(role) ? sb.rpc("get_inbox", { p_org: org.id }) : Promise.resolve({ data: [] }),
]);
const all = listings ?? [];
const count = (s) => all.filter((l) => s.includes(l.status)).length;
const leadRows = leads.data ?? [];
const p = params();
const base = `/portal/${org.slug}`;

// What needs the team's attention, most urgent first. Every item links to the place to fix it.
const attention = [
  ...all.filter((l) => l.status === "changes_requested").map((l) => [l, "Changes requested by a moderator", "status--changes_requested"]),
  ...all.filter((l) => ["published", "paused"].includes(l.status) && availabilityState(l.availability_confirmed_at).state !== "fresh").map((l) => [l, "Availability needs confirming", "status--changes_requested"]),
  ...all.filter((l) => l.status === "draft").map((l) => [l, "Draft — not submitted yet", ""]),
].slice(0, 6);

render(
  root,
  html`${orgHeader(org, role, "")}
    ${p.get("created") ? html`<div class="alert alert--success">Organisation created. You're the owner.</div>` : ""}
    ${p.get("joined") ? html`<div class="alert alert--success">You've joined ${org.name}.</div>` : ""}
    <div class="row-between"><h2 style="font-size: 1.6rem">Overview</h2>${canEditListings(role) ? html`<a class="btn btn--small" href="${base}/listings/new">+ New listing</a>` : ""}</div>
    <div class="tile-row">
      <a class="tile" href="${base}/listings"><b>${count(["published"])}</b><span>Live listings</span></a>
      <a class="tile" href="${base}/listings"><b>${count(["submitted"])}</b><span>In review</span></a>
      <a class="tile ${attention.length ? "tile--attention" : ""}" href="${base}/listings"><b>${attention.length}</b><span>Need attention</span></a>
      ${canReadLeads(role)
        ? html`<a class="tile" href="${base}/leads"><b>${leadRows.filter((r) => r.status === "new").length}</b><span>New enquiries</span></a>`
        : html`<a class="tile" href="${base}/listings"><b>${count(["draft"])}</b><span>Drafts</span></a>`}
    </div>
    <div class="dash-grid">
      <section class="card stack-sm">
        <div class="row-between"><h2 style="font-size: 1.2rem">Needs attention</h2><a class="link small" href="${base}/listings">All listings</a></div>
        ${attention.length
          ? html`<ul class="activity">${attention.map(([l, why, cls]) => html`<li>
              <span class="status ${cls}" style="padding: 0.1rem 0.5rem">!</span>
              <span class="stack-sm" style="gap: 0.1rem; min-width: 0"><a class="bold truncate" href="${base}/listings/${l.id}">${l.title}</a><span class="tiny muted">${why}${l.reference ? ` · ${l.reference}` : ""}</span></span>
              <a class="link small" href="${base}/listings/${l.id}">Open</a></li>`)}</ul>`
          : html`<p class="small muted">Nothing needs your attention right now.</p>`}
      </section>
      <div class="stack">
        ${canReadLeads(role)
          ? html`<section class="card stack-sm">
              <div class="row-between"><h2 style="font-size: 1.2rem">Recent enquiries</h2><a class="link small" href="${base}/leads">Leads</a></div>
              ${leadRows.length
                ? html`<ul class="activity">${leadRows.slice(0, 5).map((r) => html`<li>
                    <span class="monogram" style="width: 2rem; height: 2rem; font-size: 0.8rem">${(r.counterpart ?? "?").slice(0, 1)}</span>
                    <span class="stack-sm" style="gap: 0.1rem; min-width: 0"><a class="bold truncate" href="${base}/leads/${r.id}">${r.counterpart}</a><span class="tiny muted truncate">${r.listing_title}</span></span>
                    <span class="tiny muted">${timeAgo(r.last_message_at)}</span></li>`)}</ul>`
                : html`<p class="small muted">No enquiries yet. They appear here as soon as someone messages you about a listing.</p>`}
            </section>`
          : ""}
        <section class="card stack-sm">
          <h2 style="font-size: 1.2rem">Verification</h2>
          ${org.verification_status === "verified"
            ? html`<p class="small">Your organisation's identity is checked. Approved listings can be published.</p>`
            : html`<p class="small muted">Not verified yet. Our team checks your business registration before your listings can go live. Verification states exactly what was checked — it never implies you own a particular property.</p>`}
        </section>
        ${canManageTeam(role)
          ? html`<section class="card stack-sm"><h2 style="font-size: 1.2rem">Next steps</h2>
              <a class="link small" href="${base}/settings">Complete your public profile →</a>
              <a class="link small" href="${base}/team">Invite your team →</a></section>`
          : ""}
      </div>
    </div>`,
);
root.removeAttribute("aria-busy");
