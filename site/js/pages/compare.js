// Compare: up to three properties side by side (picked with the compare button on cards and property pages).
// Rows: price, purpose, type, rooms, size, area, stage, distance from the visitor, and every amenity any of
// them lists. "Not listed" means the property's details don't mention it, not that it is missing.
import { boot, html, icon, render } from "../core.js";
import { PURPOSE_LABELS, STAGE_LABELS, TYPE_LABELS, formatArea, formatPrice, loadPortfolio, place, small } from "../data.js";
import { artwork } from "../cards.js";
import { wireCollect } from "../collect.js";
import { amenitiesOf } from "../amenities.js";
import { clearCompare, compared, toggleCompare } from "../store.js";
import { awayFrom, remembered } from "../here.js";

boot();
wireCollect();
const portfolio = await loadPortfolio().catch(() => ({ properties: [] }));
const bySlug = Object.fromEntries((portfolio.properties ?? []).map((p) => [p.slug, p]));

function draw() {
  const list = compared().map((s) => bySlug[s]).filter(Boolean);
  if (!list.length) {
    render("#cmp", html`<p class="empty">Nothing to compare yet. Tap the compare button ${icon("compare", 16)} on up to three properties. <a class="text-link" href="/">Browse properties</a></p>`);
    return;
  }
  const here = remembered();
  const am = list.map(amenitiesOf);
  const labels = [...new Map(am.flatMap((a) => a.found.map(([ic, label]) => [label, ic]))).entries()];
  const dash = html`<span class="cmp__no">Not listed</span>`;
  const rows = [
    ["Price", (p) => (p.coming_soon ? "Coming soon" : formatPrice(p.price))],
    ["For", (p) => PURPOSE_LABELS[p.purpose] ?? dash],
    ["Type", (p) => TYPE_LABELS[p.type] ?? dash],
    ["Bedrooms", (p) => p.bedrooms ?? dash],
    ["Bathrooms", (p) => p.bathrooms ?? dash],
    ["Size", (p) => formatArea(p.size) ?? dash],
    ["Area", (p) => place(p) || dash],
    ["Stage", (p) => STAGE_LABELS[p.stage] ?? dash],
    ...(here ? [["From you", (p) => (typeof p.location?.lat === "number" ? `${awayFrom(here, [p.location.lng, p.location.lat])} straight line` : dash)]] : []),
  ];
  render(
    "#cmp",
    html`<div class="cmp__scroll"><table class="cmp__table" style="--n:${list.length}">
        <thead><tr><th scope="col"><span class="sr-only">Property</span>${list.length < 3 ? html`<a class="cmp__add" href="/">${icon("compare", 16)}Add ${3 - list.length} more</a>` : ""}</th>
          ${list.map((p) => html`<th scope="col"><div class="cmp__prop">
            <a class="cmp__img" href="/properties/${p.slug}">${p.photos?.[0] ? html`<img src="${small(p.photos[0])}" alt="" />` : artwork(p)}</a>
            <a class="cmp__name" href="/properties/${p.slug}">${p.title}</a>
            <button type="button" class="text-link cmp__rm" data-rm="${p.slug}">Remove</button>
          </div></th>`)}</tr></thead>
        <tbody>
          ${rows.map(([label, get]) => html`<tr><th scope="row">${label}</th>${list.map((p) => html`<td>${get(p)}</td>`)}</tr>`)}
          ${labels.length ? html`<tr class="cmp__group"><th scope="row" colspan="${list.length + 1}">Amenities</th></tr>` : ""}
          ${labels.map(([label, ic]) => html`<tr><th scope="row"><span class="cmp__am">${icon(ic, 18, 1.5)}${label}</span></th>${am.map((a) => html`<td>${a.found.some((f) => f[1] === label) ? html`<span class="cmp__yes">${icon("check", 16, 2.4)}<span class="sr-only">Yes</span></span>` : dash}</td>`)}</tr>`)}
        </tbody>
      </table></div>
      <p class="fineprint">“Not listed” means the property's details don't mention it yet. Ask us to be sure.</p>
      <button type="button" class="btn btn--line-dark" data-clear>Clear the list</button>`,
  );
}
document.getElementById("cmp").addEventListener("click", (e) => {
  const rm = e.target.closest("[data-rm]");
  if (rm) toggleCompare(rm.dataset.rm);
  if (e.target.closest("[data-clear]")) clearCompare();
});
addEventListener("pq:store", draw);
draw();
