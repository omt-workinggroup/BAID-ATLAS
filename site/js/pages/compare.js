// Compare up to four properties side by side. Missing values say "Not provided"; nothing is estimated.
import { boot, html, render, sb, setTitle } from "../core.js";
import { COMPLETION_LABELS, FURNISHING_LABELS, PROPERTY_TYPE_LABELS, PURPOSE_LABELS, formatArea, formatLocation, formatPrice, isLand, isResidential } from "../format.js";
import { amenityLabel, loadCatalogue, subtypeLabel } from "../catalogue.js";
import { CARD_COLUMNS, noPhoto, withCoverUrls } from "../listings.js";
import { compareIds, removeFromCompare } from "../compare.js";
import { availabilityState } from "../trust.js";

boot();
setTitle("Compare properties");
const root = document.getElementById("root");

const NP = html`<span class="muted">Not provided</span>`;
const NA = html`<span class="muted">Doesn't apply</span>`;

async function draw() {
  const ids = compareIds();
  if (!ids.length) {
    render(root, html`<div class="page-head"><h1>Compare properties</h1></div>
      <div class="empty"><h2>Nothing to compare yet</h2><p>Tap "Compare" on up to four properties in Explore or Saved, then come back here.</p><a class="btn" href="/explore">Explore property</a></div>`);
    root.removeAttribute("aria-busy");
    return;
  }
  const [catalogue, { data: rows }, { data: links }] = await Promise.all([
    loadCatalogue(),
    sb.from("listing_cards").select(CARD_COLUMNS).in("id", ids).eq("status", "published"),
    sb.from("property_listings").select("id, property_id").in("id", ids),
  ]);
  const byId = new Map((rows ?? []).map((r) => [r.id, r]));
  // Listings that are no longer live drop out of the comparison.
  ids.filter((id) => !byId.has(id)).forEach(removeFromCompare);
  const list = await withCoverUrls(ids.filter((id) => byId.has(id)).map((id) => byId.get(id)));
  const propertyOf = new Map((links ?? []).map((r) => [r.id, r.property_id]));
  const { data: amen } = await sb.from("property_amenities").select("property_id, amenity_code").in("property_id", [...propertyOf.values()]);
  const amenitiesOf = (l) => (amen ?? []).filter((a) => a.property_id === propertyOf.get(l.id)).map((a) => amenityLabel(catalogue, a.amenity_code));

  const avail = (l) => {
    const a = availabilityState(l.availability_confirmed_at);
    return a.state === "none" ? NP : a.state === "fresh" ? html`<span class="avail avail--fresh">Confirmed ${a.days <= 0 ? "today" : `${a.days} days ago`}</span>` : html`<span class="avail avail--stale">Needs reconfirming</span>`;
  };
  const rowsDef = [
    ["Price", (l) => formatPrice(l.asking_price, l.currency, l.price_period) + (l.negotiable ? " · negotiable" : "")],
    ["Offer", (l) => PURPOSE_LABELS[l.purpose]],
    ["Type", (l) => subtypeLabel(catalogue, l.property_type, l.subtype) ?? PROPERTY_TYPE_LABELS[l.property_type]],
    ["Location", (l) => formatLocation(l.locality, l.city, l.region)],
    ["Bedrooms", (l) => (isResidential(l.property_type) ? (l.bedrooms ?? NP) : NA)],
    ["Bathrooms", (l) => (isResidential(l.property_type) ? (l.bathrooms ?? NP) : NA)],
    ["Floor area", (l) => (isLand(l.property_type) ? NA : formatArea(l.floor_area, l.floor_area_unit) || NP)],
    ["Land area", (l) => formatArea(l.land_area, l.land_area_unit) || NP],
    ["Furnishing", (l) => (isLand(l.property_type) ? NA : FURNISHING_LABELS[l.furnishing] ?? NP)],
    ["Construction", (l) => (isLand(l.property_type) ? NA : COMPLETION_LABELS[l.completion_status] ?? NP)],
    ["Amenities", (l) => { const a = amenitiesOf(l); return a.length ? a.join(", ") : NP; }],
    ["Availability", avail],
    ["Advertiser identity", (l) => (l.organization_verification_status === "verified" ? html`<span class="avail avail--fresh">Checked</span>` : html`<span class="muted">Not checked</span>`)],
    ["Photos", (l) => (l.image_count ? `${l.image_count} from the advertiser` : NP)],
    ["Reference", (l) => l.reference ?? NP],
  ];

  render(
    root,
    html`<div class="page-head"><h1>Compare properties</h1><p>Side by side, exactly as the advertisers listed them. Nothing is estimated or converted.</p></div>
      <div class="compare-wrap" role="region" aria-label="Comparison table" tabindex="0">
        <table class="compare-table">
          <thead><tr><th scope="col"><span class="sr-only">Detail</span></th>
            ${list.map((l) => html`<th scope="col">
              <div class="compare-photo">${l.cover_url ? html`<img src="${l.cover_url}" alt="" loading="lazy" />` : noPhoto()}</div>
              <a class="bold" href="/properties/${l.slug}">${l.title}</a>
              <button type="button" class="link small" data-remove="${l.id}">Remove</button>
            </th>`)}
          </tr></thead>
          <tbody>${rowsDef.map(([label, fn]) => html`<tr><th scope="row">${label}</th>${list.map((l) => html`<td>${fn(l)}</td>`)}</tr>`)}</tbody>
        </table>
      </div>
      <p class="tiny muted">Prices are shown in each listing's own currency. Check every detail with the advertiser and in person before you pay anything.</p>`,
  );
  root.removeAttribute("aria-busy");
}

root.addEventListener("click", (e) => {
  const b = e.target.closest("[data-remove]");
  if (!b) return;
  removeFromCompare(b.dataset.remove);
  draw();
});
await draw();
