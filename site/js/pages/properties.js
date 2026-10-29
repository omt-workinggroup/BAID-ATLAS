// Homepage: every property, with search, quick filters, sort, and a grid or a full-screen dark map.
// With no filters, the first (featured) property gets a large card.
import { boot, html, icon, params, raw, render, setTitle } from "../core.js";
import { PURPOSE_LABELS, TYPE_LABELS, filterProperties, loadPortfolio, parseFilters, toQuery } from "../data.js";
import { mapPreviewCard, propertyCard, skeletonCards } from "../cards.js";

boot();
const f = parseFilters(params());
const mapView = params().get("view") === "map";
if (mapView) document.body.classList.add("props--map");
const base = { ...f, view: mapView ? "map" : undefined };
const link = (changes) => `/${toQuery({ ...base, ...changes })}`;

const heading = f.purpose ? PURPOSE_LABELS[f.purpose] : f.type ? TYPE_LABELS[f.type] : null;
if (heading) {
  render("#heading", html`${heading}<em>.</em>`);
  setTitle(heading);
}

// Search keeps the other filters.
const form = document.getElementById("search-form");
form.q.value = f.q ?? "";
form.addEventListener("submit", (e) => {
  e.preventDefault();
  location.href = link({ q: form.q.value.trim() || undefined });
});

// Quick filters: one purpose or type at a time.
const CHIPS = [
  ["All", {}],
  ["For sale", { purpose: "sale" }],
  ["For rent", { purpose: "rent" }],
  ["Short stay", { purpose: "short_stay" }],
  ["Houses", { type: "house" }],
  ["Apartments", { type: "apartment" }],
  ["Land", { type: "land" }],
  ["Commercial", { type: "commercial" }],
];
const active = ([, c]) => (c.purpose ?? undefined) === f.purpose && (c.type ?? undefined) === f.type;
render(
  "#chips",
  CHIPS.map((chip) => html`<a class="chip" href="${link({ purpose: chip[1].purpose, type: chip[1].type })}" ${raw(active(chip) ? 'aria-current="page"' : "")}>${chip[0]}</a>`),
);

render(
  "#view-switch",
  html`<a href="${link({ view: undefined })}" ${raw(mapView ? "" : 'aria-current="page"')}>List</a><a href="${link({ view: "map" })}" ${raw(mapView ? 'aria-current="page"' : "")}>Map</a>`,
);
const sort = document.getElementById("sort-select");
sort.value = f.sort;
sort.addEventListener("change", () => (location.href = link({ sort: sort.value })));

const grid = document.getElementById("results");
render(grid, skeletonCards(6));

let all = [];
try {
  all = (await loadPortfolio()).properties ?? [];
} catch {
  render(grid, html`<p class="empty">We couldn't load the properties. Please refresh the page.</p>`);
}
const rows = filterProperties(all, f);
document.getElementById("count-line").textContent = `${all.length} ${all.length === 1 ? "development" : "developments"} · ${[...new Set(all.map((p) => p.location?.area).filter(Boolean))].join(" · ")}`;
document.getElementById("results-count").textContent = `Showing ${rows.length} ${rows.length === 1 ? "property" : "properties"}`;
grid.removeAttribute("aria-busy");

const unfiltered = !f.purpose && !f.type && !f.q && f.min === undefined && f.max === undefined && f.sort === "newest";
if (rows.length) {
  render(
    grid,
    rows.map((p, i) => {
      const feature = unfiltered && i === 0 && rows.length > 1;
      return html`<div class="rise${raw(feature ? " pgrid__feature" : "")}" style="animation-delay:${Math.min(i, 8) * 60}ms">${propertyCard(p, { eager: i < 2, feature })}</div>`;
    }),
  );
} else if (all.length) {
  render(grid, html`<div class="empty" style="grid-column: 1 / -1"><h2>Nothing matches that search</h2><p>Try another area or clear the filters.</p><a class="btn" href="/">Show all properties</a></div>`);
} else {
  // An empty portfolio: no filters to offer yet.
  for (const sel of ["#chips", ".results-bar", "#search-form", "#count-line"]) document.querySelector(sel).hidden = true;
  render(
    grid,
    html`<div class="empty" style="grid-column: 1 / -1">${icon("house", 36, 1.3)}<h2>New properties are on their way</h2><p>The portfolio is being photographed and written up. Get in touch if you'd like to hear about a property before it goes online.</p><a class="btn" href="/contact">Contact</a></div>`,
  );
}

// ---- Map view (dark map, price pins, preview card) -----------------------------------------------------
if (mapView) {
  const purposeLink = (p, label) => html`<a href="${link({ purpose: f.purpose === p ? undefined : p })}" ${raw(f.purpose === p ? 'aria-current="page"' : "")}>${label}</a>`;
  render(
    "#map-top",
    html`<div class="map-top__row">
        <h2 class="map-top__title">Explore Properties</h2>
        <a class="map-round" href="${link({ view: undefined })}" aria-label="Show as a list">${icon("grid", 20)}</a>
      </div>
      <div class="map-top__row">
        <nav class="map-seg" aria-label="Buy or rent">${purposeLink("sale", "Buy")}${purposeLink("rent", "Rent")}</nav>
        <label class="map-type"><span class="sr-only">Property type</span>
          <select id="map-type">
            <option value="">All types</option>
            ${Object.entries(TYPE_LABELS).map(([k, v]) => html`<option value="${k}" ${raw(f.type === k ? "selected" : "")}>${v}</option>`)}
          </select></label>
      </div>
      <p class="map-top__note">Pins mark the area, not the exact address.</p>`,
  );
  document.getElementById("map-type").addEventListener("change", (e) => (location.href = link({ type: e.target.value || undefined })));

  const preview = document.getElementById("map-preview");
  let layer = null;
  const show = (p) => {
    layer?.select(p?.slug ?? null);
    preview.classList.toggle("is-open", Boolean(p));
    render(preview, p ? mapPreviewCard(p) : "");
  };
  preview.addEventListener("click", (e) => e.target.closest("[data-close-preview]") && show(null));

  document.getElementById("map-panel").hidden = false;
  try {
    const [m, { MAP_STYLE_DARK }] = await Promise.all([import("../map.js"), import("../config.js")]);
    await m.loadLeaflet({ clusters: true });
    const map = m.createMap(document.getElementById("map"), { style: MAP_STYLE_DARK, zoomControl: false });
    window.L.control.zoom({ position: "bottomright" }).addTo(map);
    map.on("click", () => show(null));
    layer = m.addListingMarkers(map, rows, { onSelect: show });
    m.fitToListings(map, layer.group, { paddingTopLeft: [24, 150], paddingBottomRight: [24, 190] });
    const placed = rows.filter(m.hasPosition);
    if (placed.length) show(placed[0]);
    else {
      preview.classList.add("is-open");
      render(preview, html`<p class="mcard mcard--empty">${rows.length ? "These properties haven't been placed on the map yet." : "No properties match here yet."}</p>`);
    }
  } catch {
    render("#map-note", "The map couldn't load. The list still shows every property.");
  }
}
