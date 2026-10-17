// Provider portal: the organisations you belong to.
import { boot, html, params, render, requireProfile, sb } from "../core.js";
import { ORGANIZATION_TYPE_LABELS, ORG_ROLE_LABELS } from "../format.js";

boot();
const profile = await requireProfile();
const root = document.getElementById("root");
const { data, error } = await sb.from("organization_members").select("role, organizations(name, slug, type)").eq("user_id", profile.id).order("created_at");
const rows = (data ?? []).filter((r) => r.organizations);

render(
  root,
  html`<div class="page-head"><h1>Provider portal</h1><p>Your organisations, their listings, leads and teams.</p></div>
    ${params().get("error") === "not-found" ? html`<div class="alert alert--error">That organisation doesn't exist or you're not a member.</div>` : ""}
    ${error ? html`<div class="alert alert--error">We couldn't load your organisations. Please refresh.</div>` : ""}
    ${rows.length === 0 && !error
      ? html`<div class="empty"><h2>No organisations yet</h2><p>Create one for your agency, development company or rental business, or ask an owner to invite you.</p><a class="btn" href="/portal/new">Create an organisation</a></div>`
      : html`<ul class="stack-sm">${rows.map(
          (r) => html`<li><a class="row-card" href="/portal/${r.organizations.slug}" style="padding: 1rem"><span class="row-card__body"><span class="bold">${r.organizations.name}</span><span class="small muted">${ORGANIZATION_TYPE_LABELS[r.organizations.type]}</span></span><span class="status">${ORG_ROLE_LABELS[r.role]}</span></a></li>`,
        )}</ul>
        <a class="btn btn--secondary btn--full" href="/portal/new">Create another organisation</a>`}`,
);
root.removeAttribute("aria-busy");
