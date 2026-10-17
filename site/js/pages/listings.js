// An organisation's listings with their status.
import { boot, html, render, sb, setTitle, signedUrls } from "../core.js";
import { LISTING_STATUS_LABELS, formatLocation, formatPrice } from "../format.js";
import { noPhoto } from "../listings.js";
import { canEditListings, orgHeader, requireMembership } from "../portal.js";

boot();
const { org, role } = await requireMembership();
setTitle(`Listings · ${org.name}`);
const root = document.getElementById("root");
const { data } = await sb
  .from("property_listings")
  .select("id, title, status, asking_price, currency, price_period, updated_at, properties(city, locality), property_media(storage_path, sort_order, hidden_at)")
  .eq("organization_id", org.id)
  .order("updated_at", { ascending: false });
const rows = (data ?? []).map((r) => ({ ...r, cover: (r.property_media ?? []).filter((m) => !m.hidden_at).sort((a, b) => a.sort_order - b.sort_order)[0]?.storage_path ?? null }));
const urls = await signedUrls(rows.map((r) => r.cover));
const count = (s) => rows.filter((r) => s.includes(r.status)).length;

render(
  root,
  html`${orgHeader(org, role, "/listings")}
    <div class="stats">
      <div class="stat"><b>${count(["published"])}</b><span>Live</span></div>
      <div class="stat"><b>${count(["submitted"])}</b><span>In review</span></div>
      <div class="stat"><b>${count(["draft", "changes_requested"])}</b><span>Drafts</span></div>
      <div class="stat"><b>${rows.length}</b><span>All</span></div>
    </div>
    ${canEditListings(role) ? html`<a class="btn btn--full" href="/portal/${org.slug}/listings/new">+ New listing</a>` : ""}
    ${rows.length
      ? html`<ul class="stack-sm">${rows.map(
          (r) => html`<li><a class="row-card" href="/portal/${org.slug}/listings/${r.id}">
            <span class="row-card__img">${r.cover && urls.get(r.cover) ? html`<img src="${urls.get(r.cover)}" alt="" loading="lazy" />` : noPhoto(true)}</span>
            <span class="row-card__body"><span class="bold truncate">${r.title}</span><span class="small muted truncate">${formatLocation(r.properties?.locality, r.properties?.city)}</span><span class="small">${formatPrice(r.asking_price, r.currency, r.price_period)}</span></span>
            <span class="status status--${r.status}">${LISTING_STATUS_LABELS[r.status] ?? r.status}</span>
          </a></li>`,
        )}</ul>`
      : html`<div class="empty"><h2>No listings yet</h2><p>Create your first listing: details first, then photos, then submit it for review.</p></div>`}`,
);
root.removeAttribute("aria-busy");
