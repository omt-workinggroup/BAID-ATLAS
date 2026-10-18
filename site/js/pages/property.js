// Property page: photos, facts, provider, and the three actions (message, viewing, report).
import { boot, busy, friendlyDbError, getUser, html, icon, raw, render, sb, setTitle, showErrors, signedUrls, toast } from "../core.js";
import {
  COMPLETION_LABELS, CONDITION_LABELS, FURNISHING_LABELS, PROPERTY_TYPE_LABELS, PURPOSE_LABELS, REPORT_REASON_LABELS,
  formatArea, formatLocation, formatPrice, listedAgo,
} from "../format.js";
import { amenityLabel, loadCatalogue, subtypeLabel } from "../catalogue.js";
import { trustItems, trustPanel } from "../trust.js";
import { CARD_COLUMNS, noPhoto, savedIds, verifiedLabel, wireSaveButtons } from "../listings.js";

boot();
main();

async function main() {
const slug = decodeURIComponent(location.pathname.split("/").filter(Boolean).pop() ?? "");
const root = document.getElementById("property");

const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// ---- Load ------------------------------------------------------------------------------------------------
const { data: l } = await sb.from("listing_cards").select(`${CARD_COLUMNS}, organization_id`).eq("slug", slug).eq("status", "published").maybeSingle();
if (!l) {
  setTitle("This property isn't available");
  document.head.insertAdjacentHTML("beforeend", '<meta name="robots" content="noindex" />');
  render(
    root,
    html`<div class="empty"><h1>This property isn't available</h1><p>It may have been sold, rented or paused by the provider, or the link may be wrong.</p><a class="btn" href="/explore">Explore other properties</a></div>`,
  );
  root.removeAttribute("aria-busy");
  return;
}
setTitle(l.title);

const [{ data: listing }, { data: media }, user, { data: org }, catalogue] = await Promise.all([
  sb.from("property_listings").select("description, property_id").eq("id", l.id).maybeSingle(),
  sb.from("property_media").select("id, storage_path, alt_text, is_render, is_virtually_staged").eq("listing_id", l.id).is("hidden_at", null).eq("media_type", "image").order("sort_order").order("created_at"),
  getUser(),
  sb.from("organizations").select("verification_status, verification_scope, verified_at, verification_expires_at").eq("id", l.organization_id).maybeSingle(),
  loadCatalogue(),
]);
const [{ data: details }, { data: amenityRows }] = listing?.property_id
  ? await Promise.all([
      sb.from("properties").select("condition, parking_spaces").eq("id", listing.property_id).maybeSingle(),
      sb.from("property_amenities").select("amenity_code").eq("property_id", listing.property_id),
    ])
  : [{ data: null }, { data: [] }];
const urls = await signedUrls((media ?? []).map((m) => m.storage_path));
const photos = (media ?? []).map((m) => ({ ...m, url: urls.get(m.storage_path) ?? null })).filter((m) => m.url);
const saved = (await savedIds([l.id])).has(l.id);
const price = formatPrice(l.asking_price, l.currency, l.price_period);
const location_ = formatLocation(l.locality, l.city, l.region);

// ---- Render ----------------------------------------------------------------------------------------------
const facts = [
  ["Reference", l.reference],
  ["Type", subtypeLabel(catalogue, l.property_type, l.subtype) ?? PROPERTY_TYPE_LABELS[l.property_type]],
  l.bedrooms !== null && ["Bedrooms", l.bedrooms],
  l.bathrooms !== null && ["Bathrooms", l.bathrooms],
  formatArea(l.floor_area, l.floor_area_unit) && ["Floor area", formatArea(l.floor_area, l.floor_area_unit)],
  formatArea(l.land_area, l.land_area_unit) && ["Land area", formatArea(l.land_area, l.land_area_unit)],
  l.furnishing && ["Furnishing", FURNISHING_LABELS[l.furnishing]],
  details?.condition && ["Condition", CONDITION_LABELS[details.condition]],
  l.completion_status && ["Construction", COMPLETION_LABELS[l.completion_status]],
  details?.parking_spaces != null && ["Parking", `${details.parking_spaces} ${details.parking_spaces === 1 ? "space" : "spaces"}`],
  ["Price", l.negotiable ? "Negotiable" : "As listed"],
].filter((x) => x && x[1] !== null && x[1] !== undefined && x[1] !== "");
const amenities = (amenityRows ?? []).map((a) => amenityLabel(catalogue, a.amenity_code));
const trust = trustItems(l, org, photos);
const anyRender = photos.some((p) => p.is_render || p.is_virtually_staged);

const gallery = photos.length
  ? html`<section class="gallery" aria-roledescription="carousel" aria-label="Photos of ${l.title}">
      <div class="gallery__track" id="track" tabindex="0">
        ${photos.map((p, i) => html`<figure><img src="${p.url}" alt="${p.alt_text ?? `${l.title}, photo ${i + 1}`}" loading="${i === 0 ? "eager" : "lazy"}" /></figure>`)}
      </div>
      <div class="gallery__labels" id="photo-labels"></div>
      <span class="gallery__counter" id="counter" aria-live="polite">1 / ${photos.length}</span>
    </section>`
  : html`<div class="gallery__track">${noPhoto()}</div>`;

render(
  root,
  html`
    <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/explore">Explore</a><span aria-hidden="true">/</span><a href="/explore?purpose=${l.purpose}">${PURPOSE_LABELS[l.purpose]}</a></nav>
    ${gallery}
    <div class="property-layout">
      <div class="stack-lg">
        <header class="stack">
          <div class="row wrap">
            <span class="tag tag--dark">${PURPOSE_LABELS[l.purpose]}</span>
            ${l.is_sponsored ? html`<span class="tag tag--sponsored">Sponsored</span>` : ""}
            <span class="tiny muted">${listedAgo(l.published_at)}</span>
          </div>
          <h1>${l.title}</h1>
          <p class="row muted" style="gap: 0.375rem">${icon("pin", 16)}${location_}</p>
          <p class="price-big">${price}</p>
          <div class="row wrap">
            <button type="button" class="btn btn--secondary btn--small" data-save="${l.id}" data-slug="${l.slug}" data-label="text" aria-pressed="${saved}">${icon("heart", 18, 2)}<span> ${saved ? "Saved" : "Save"}</span></button>
            <button type="button" class="btn btn--secondary btn--small" id="share">${icon("share", 18)} Share</button>
          </div>
        </header>
        <section class="stack-sm" aria-labelledby="facts-h">
          <h2 id="facts-h" style="font-size: 1.5rem">Key facts</h2>
          <dl class="facts-table">${facts.map(([k, v]) => html`<div><dt>${k}</dt><dd>${v}</dd></div>`)}</dl>
        </section>
        ${trustPanel(trust, { sponsored: l.is_sponsored })}
        ${listing?.description ? html`<section class="stack-sm"><h2 style="font-size: 1.5rem">About this property</h2><p class="prose">${listing.description}</p></section>` : ""}
        ${amenities.length ? html`<section class="stack-sm"><h2 style="font-size: 1.5rem">Amenities</h2><ul class="amenity-list">${amenities.map((a) => html`<li>${icon("check", 16, 2)}${a}</li>`)}</ul><p class="tiny muted">As stated by the advertiser.</p></section>` : ""}
        ${l.completion_status && l.completion_status !== "completed" ? html`<p class="alert alert--warning">${l.completion_status === "off_plan" ? "Off-plan: this property has not been built yet." : "Under construction: this property is not finished yet."} Ask the advertiser for the building permit and the expected completion date.</p>` : ""}
        ${anyRender ? html`<p class="alert alert--warning">Some images are renders or virtually staged. They don't show the property's current condition, completion or exact dimensions.</p>` : ""}
        <section class="stack-sm">
          <h2 style="font-size: 1.5rem">Location</h2>
          <div class="location-card stack-sm"><p class="bold">${location_}</p><p class="small muted">Approximate area only. The provider shares the exact address once you're in touch.</p></div>
        </section>
        <p class="small"><button type="button" class="btn btn--ghost btn--small" data-open="report-sheet" style="padding: 0; color: var(--muted)">${icon("flag", 16)} Report this listing</button></p>
      </div>
      <aside class="stack">
        <section class="card card--lift stack">
          <p class="tiny muted">Listed by</p>
          <a href="/providers/${l.organization_slug}" class="row"><span class="monogram">${l.organization_name.slice(0, 1)}</span><span><span class="bold">${l.organization_name}</span><br /><span class="tiny muted">View provider profile</span></span></a>
          ${l.organization_verification_status === "verified" ? html`<div class="stack-sm">${verifiedLabel(l.organization_verification_scope, false)}<p class="tiny muted">Checked by Propertiq. This doesn't prove ownership of this property — always confirm title documents.</p></div>` : ""}
          <button type="button" class="btn btn--full" data-open="inquiry-sheet">${icon("chat", 18)} Message provider</button>
          <button type="button" class="btn btn--secondary btn--full" data-open="viewing-sheet">${icon("calendar", 18)} Request a viewing</button>
        </section>
        <section class="card stack-sm small">
          <h2 style="font-size: 1.2rem">Before you pay anything</h2>
          <ul class="stack-sm muted" style="list-style: disc; padding-left: 1.25rem">
            <li>Never pay a deposit before viewing in person.</li>
            <li>Ask for title documents and verify them at the Lands Commission.</li>
            <li>Propertiq never asks you to pay outside the platform.</li>
          </ul>
        </section>
      </aside>
    </div>
    <div class="action-bar"><div class="action-bar__inner">
      <div style="flex: 1; min-width: 0"><p class="bold truncate">${price}</p><p class="tiny muted truncate">${l.organization_name}</p></div>
      <button type="button" class="btn" data-open="inquiry-sheet">Message</button>
    </div></div>`,
);
root.removeAttribute("aria-busy");
root.style.paddingBottom = "5rem";
wireSaveButtons(root);

// JSON-LD for search engines
const ld = document.createElement("script");
ld.type = "application/ld+json";
ld.textContent = JSON.stringify({
  "@context": "https://schema.org", "@type": "RealEstateListing", name: l.title, datePosted: l.published_at,
  offers: { "@type": "Offer", price: String(l.asking_price), priceCurrency: l.currency },
  address: { "@type": "PostalAddress", addressLocality: l.city, addressRegion: l.region, addressCountry: "GH" },
});
document.head.append(ld);

// ---- Gallery counter and labels --------------------------------------------------------------------------
const track = document.getElementById("track");
if (track) {
  const update = () => {
    const i = Math.round(track.scrollLeft / track.clientWidth);
    document.getElementById("counter").textContent = `${i + 1} / ${photos.length}`;
    const p = photos[i];
    render("#photo-labels", [p?.is_render ? html`<span class="tag tag--warning">Render — not a photo</span>` : "", p?.is_virtually_staged ? html`<span class="tag tag--warning">Virtually staged</span>` : ""]);
  };
  track.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
  update();
}

// ---- Share -----------------------------------------------------------------------------------------------
document.getElementById("share").addEventListener("click", async () => {
  const url = location.href;
  if (navigator.share) {
    await navigator.share({ title: l.title, url }).catch(() => {});
  } else {
    await navigator.clipboard?.writeText(url);
    toast("Link copied");
  }
});

// ---- Sheets ----------------------------------------------------------------------------------------------
document.addEventListener("click", (e) => {
  const open = e.target.closest("[data-open]");
  if (open) {
    if (!user) {
      location.href = `/sign-in?next=${encodeURIComponent(location.pathname)}`;
      return;
    }
    document.getElementById(open.dataset.open).showModal();
  }
  if (e.target.closest("[data-close]")) e.target.closest("dialog").close();
  if (e.target.tagName === "DIALOG") e.target.close();
});
document.querySelector("[data-provider-line]").textContent = `To ${l.organization_name}, about “${l.title}”.`;

// A request key per open sheet, so a retried tap (e.g. on a weak connection) never sends twice.
let inquiryKey = crypto.randomUUID();
const inquiryForm = document.getElementById("inquiry-form");
inquiryForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = inquiryForm.message.value.trim();
  if (!showErrors(inquiryForm, message ? {} : { message: "Write a short message." })) return;
  await busy(inquiryForm, "Sending…", async () => {
    const { data, error } = await sb.rpc("send_inquiry", { p_listing: l.id, p_message: message, p_share_phone: inquiryForm.share_phone.checked, p_key: inquiryKey });
    if (error) return showErrors(inquiryForm, { message: error.code === "42501" && /own organisation/.test(error.message) ? "This is your organisation's listing." : friendlyDbError(error) });
    inquiryKey = crypto.randomUUID();
    location.href = `/inbox/${data}`;
  });
});

// Viewing: times in the visitor's own timezone (Africa/Accra for most people in Ghana).
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Accra";
const viewingForm = document.getElementById("viewing-form");
document.querySelector("[data-timezone]").textContent = `Times are in ${tz.replace("_", " ")}.`;
const pad = (n) => String(n).padStart(2, "0");
const today = new Date();
viewingForm.date.min = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
const max = new Date(Date.now() + 179 * 86400000);
viewingForm.date.max = `${max.getFullYear()}-${pad(max.getMonth() + 1)}-${pad(max.getDate())}`;
render(viewingForm.time, Array.from({ length: 21 }, (_, i) => 8 * 60 + i * 30).map((m) => html`<option value="${pad(Math.floor(m / 60))}:${pad(m % 60)}" ${raw(m === 600 ? "selected" : "")}>${pad(Math.floor(m / 60))}:${pad(m % 60)}</option>`));
let viewingKey = crypto.randomUUID();
viewingForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const d = viewingForm.date.value;
  if (!showErrors(viewingForm, d ? {} : { date: "Choose a date." })) return;
  const start = new Date(`${d}T${viewingForm.time.value}:00`);
  const end = new Date(start.getTime() + Number(viewingForm.length.value) * 60000);
  if (start.getTime() < Date.now() + 3600000) return showErrors(viewingForm, { date: "Choose a time at least an hour from now." });
  await busy(viewingForm, "Sending…", async () => {
    // A viewing belongs to a conversation, so make sure there is one first.
    const { data: inquiry, error: e1 } = await sb.rpc("send_inquiry", {
      p_listing: l.id, p_message: `I'd like to view this property. ${viewingForm.note.value.trim()}`.trim(), p_share_phone: false, p_key: viewingKey,
    });
    if (e1) return showErrors(viewingForm, { date: friendlyDbError(e1) });
    const { error } = await sb.rpc("request_viewing", { p_inquiry: inquiry, p_start: start.toISOString(), p_end: end.toISOString(), p_timezone: tz, p_note: viewingForm.note.value.trim() || null });
    if (error && error.code !== "23505") return showErrors(viewingForm, { date: error.code === "22023" ? capitalise(error.message) + "." : friendlyDbError(error) });
    viewingKey = crypto.randomUUID();
    location.href = `/inbox/${inquiry}${error ? "?viewing=exists" : ""}`;
  });
});

// Report
render("#report-reasons", Object.entries(REPORT_REASON_LABELS).map(([v, label], i) => html`<label class="choice"><input type="radio" name="reason" value="${v}" ${raw(i === 0 ? "checked" : "")} /><span class="small">${label}</span></label>`));
const reportForm = document.getElementById("report-form");
reportForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const reason = reportForm.reason.value;
  const details = reportForm.details.value.trim();
  if (!showErrors(reportForm, reason === "other" && details.length < 10 ? { details: "Please describe the problem in a sentence." } : {})) return;
  await busy(reportForm, "Sending…", async () => {
    const { error } = await sb.rpc("report_listing", { p_listing: l.id, p_reason: reason, p_details: details || null });
    if (error) return showErrors(reportForm, { details: friendlyDbError(error) });
    reportForm.closest("dialog").close();
    toast("Thanks. Our moderators will look into it.");
  });
});
}
