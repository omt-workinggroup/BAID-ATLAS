// Review queue: listings waiting for a moderator, oldest first.
import { boot, html, params, render, sb, setTitle } from "../core.js";
import { PURPOSE_LABELS, formatLocation, formatPrice } from "../format.js";
import { opsHeader, requireStaff } from "../ops.js";

boot();
const { roles } = await requireStaff();
setTitle("Review queue");
const root = document.getElementById("root");

const { data, error } = await sb
  .from("listing_reviews")
  .select("listing_id, submitted_at, property_listings(title, purpose, asking_price, currency, price_period, organizations(name, verification_status), properties(city, locality))")
  .eq("status", "pending")
  .order("submitted_at", { ascending: true })
  .limit(50);
const rows = (data ?? []).filter((r) => r.property_listings);
const age = (iso) => {
  const hours = Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000);
  return hours < 1 ? "just now" : hours < 48 ? `${hours}h` : `${Math.round(hours / 24)}d`;
};

render(
  root,
  html`${opsHeader(roles, "/ops")}
    ${params().get("done") ? html`<div class="alert alert--success" role="status">Decision recorded.</div>` : ""}
    ${error ? html`<div class="alert alert--error">Couldn't load the queue.</div>` : ""}
    <div class="row-between"><h1 style="font-size: 1.75rem">Review queue</h1><span class="small muted">${rows.length} waiting · oldest first</span></div>
    ${rows.length
      ? html`<ul class="list">
          ${rows.map((r) => {
            const l = r.property_listings;
            const late = Date.now() - new Date(r.submitted_at).getTime() > 86_400_000;
            return html`<li><a class="card list-link" href="/ops/reviews/${r.listing_id}">
              <div class="row-between"><span class="bold truncate">${l.title}</span><span class="status ${late ? "status--rejected" : ""}">${age(r.submitted_at)}</span></div>
              <span class="small muted">${PURPOSE_LABELS[l.purpose]} · ${formatPrice(l.asking_price, l.currency, l.price_period)} · ${formatLocation(l.properties?.locality, l.properties?.city)}</span>
              <span class="tiny muted">${l.organizations?.name} · ${l.organizations?.verification_status === "verified" ? "verified" : "not verified"}</span>
            </a></li>`;
          })}
        </ul>`
      : html`<div class="empty"><h2>All caught up</h2><p>New submissions appear here the moment a provider sends them.</p></div>`}`,
);
root.removeAttribute("aria-busy");
