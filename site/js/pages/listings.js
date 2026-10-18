// An organisation's listings with their status.
import { boot, html, render, sb, setTitle, signedUrls } from "../core.js";
import { LISTING_STATUS_LABELS, formatLocation, formatPrice, timeAgo } from "../format.js";
import { availabilityLine, noPhoto } from "../listings.js";
import { canEditListings, orgHeader, requireMembership } from "../portal.js";

boot();
const { org, role } = await requireMembership();
setTitle(`Listings · ${org.name}`);
const root = document.getElementById("root");
const { data } = await sb
  .from("property_listings")
  .select("id, title, reference, status, asking_price, currency, price_period, updated_at, availability_confirmed_at, properties(city, locality), property_media(storage_path, sort_order, hidden_at)")
  .eq("organization_id", org.id)
  .order("updated_at", { ascending: false });
const rows = (data ?? []).map((r) => ({ ...r, cover: (r.property_media ?? []).filter((m) => !m.hidden_at).sort((a, b) => a.sort_order - b.sort_order)[0]?.storage_path ?? null }));
const urls = await signedUrls(rows.map((r) => r.cover));
const count = (s) => rows.filter((r) => s.includes(r.status)).length;

render(
  root,
  html`${orgHeader(org, role, "/listings")}
    <div class="row-between"><h2 style="font-size: 1.6rem">Listings</h2>${canEditListings(role) ? html`<a class="btn btn--small" href="/portal/${org.slug}/listings/new">+ New listing</a>` : ""}</div>
    <div class="tile-row">
      <div class="tile"><b>${count(["published"])}</b><span>Live</span></div>
      <div class="tile"><b>${count(["submitted"])}</b><span>In review</span></div>
      <div class="tile"><b>${count(["draft", "changes_requested"])}</b><span>Drafts</span></div>
      <div class="tile"><b>${rows.length}</b><span>All listings</span></div>
    </div>
    ${rows.length
      ? html`<div class="table-card only-wide">
          <table class="data-table">
            <thead><tr><th><span class="sr-only">Photo</span></th><th>Listing</th><th>Price</th><th>Status</th><th>Availability</th><th>Updated</th><th><span class="sr-only">Actions</span></th></tr></thead>
            <tbody>${rows.map(
              (r) => html`<tr>
                <td><div class="thumb">${r.cover && urls.get(r.cover) ? html`<img src="${urls.get(r.cover)}" alt="" loading="lazy" />` : ""}</div></td>
                <td><a class="bold" href="/portal/${org.slug}/listings/${r.id}">${r.title}</a><br /><span class="tiny muted">${r.reference ?? ""} · ${formatLocation(r.properties?.locality, r.properties?.city)}</span></td>
                <td>${formatPrice(r.asking_price, r.currency, r.price_period)}</td>
                <td><span class="status status--${r.status}">${LISTING_STATUS_LABELS[r.status] ?? r.status}</span></td>
                <td>${["published", "paused", "approved"].includes(r.status) ? availabilityLine(r.availability_confirmed_at) || html`<span class="tiny muted">Not confirmed</span>` : html`<span class="tiny muted">—</span>`}</td>
                <td class="tiny muted">${timeAgo(r.updated_at)}</td>
                <td><a class="link small" href="/portal/${org.slug}/listings/${r.id}">${canEditListings(role) ? "Manage" : "View"}</a></td>
              </tr>`,
            )}</tbody>
          </table>
        </div>
        <ul class="stack-sm only-narrow">${rows.map(
          (r) => html`<li><a class="row-card" href="/portal/${org.slug}/listings/${r.id}">
            <span class="row-card__img">${r.cover && urls.get(r.cover) ? html`<img src="${urls.get(r.cover)}" alt="" loading="lazy" />` : noPhoto(true)}</span>
            <span class="row-card__body"><span class="bold truncate">${r.title}</span><span class="small muted truncate">${r.reference ?? ""} · ${formatLocation(r.properties?.locality, r.properties?.city)}</span><span class="small">${formatPrice(r.asking_price, r.currency, r.price_period)}</span></span>
            <span class="status status--${r.status}">${LISTING_STATUS_LABELS[r.status] ?? r.status}</span>
          </a></li>`,
        )}</ul>`
      : html`<div class="empty"><h2>No listings yet</h2><p>Create your first listing: details first, then photos, then submit it for review.</p></div>`}`,
);
root.removeAttribute("aria-busy");
