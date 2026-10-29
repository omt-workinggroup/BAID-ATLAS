// Map page: every development on a 3D map of Accra. Desktop: filters and a list on the left, the map on
// the right with price tags and a floating preview card. Phones: the map fills the screen, filters sit on
// top and the properties scroll along the bottom; the card in view is the one shown on the map.
// Extras: the office on the map, straight-line distances from the visitor (the page asks for their
// location when it opens), the airport or the office (nearest first, with a line to the property picked),
// and links that open the map on one property (/map?p=slug).
// Speed: the map library starts downloading at once (it is also preloaded in map.html), alongside the
// properties; the list shows as soon as the properties arrive, and the map opens directly on its final
// view, so only those tiles load. Nothing animates.
import { boot, html, icon, render } from "../core.js";
import { PURPOSE_LABELS, cover, distanceKm, formatKm, formatPrice, keyFacts, loadPortfolio, place, shortPrice, small } from "../data.js";
import * as m from "../map.js";
import { locate, quietly } from "../here.js";

const library = m.loadMapLibre();
boot();
const portfolio = await loadPortfolio().catch(() => ({ properties: [] }));
const owner = portfolio.owner ?? {};
const placed = (portfolio.properties ?? []).filter((p) => typeof p.location?.lat === "number" && typeof p.location?.lng === "number");

const commercial = ["commercial", "office", "retail", "warehouse", "mixed_use"];
const FILTERS = [
  ["All", () => true],
  ["Buy", (p) => p.purpose === "sale"],
  ["Rent", (p) => p.purpose === "rent"],
  ["Townhouses", (p) => p.type === "townhouse"],
  ["Apartments", (p) => p.type === "apartment"],
  ["Commercial", (p) => commercial.includes(p.type)],
].filter(([, test], i) => i === 0 || placed.some(test));

// Where distances are measured from. Kotoka International Airport's published coordinates; the office
// comes from the data file; "you" from the browser, only when the visitor asks.
const ORIGINS = {
  airport: { label: "the airport", name: "Airport", at: [-0.1683, 5.6053] },
  ...(typeof owner.office?.lat === "number" ? { office: { label: "our office", name: "Our office", at: [owner.office.lng, owner.office.lat] } } : {}),
  me: { label: "you", name: "Where I am", at: null },
};

let active = 0;
let query = "";
let selected = null;
let origin = "airport";

const lngLatOf = (p) => [p.location.lng, p.location.lat];
const away = (p) => (ORIGINS[origin]?.at ? distanceKm(ORIGINS[origin].at, lngLatOf(p)) : null);
const awayText = (p) => {
  const km = away(p);
  return km == null ? "" : `${formatKm(km)} from ${ORIGINS[origin].label}`;
};

const facts = (p) => keyFacts(p).slice(0, 2);
const rowCard = (p) => html`<li>
  <button type="button" class="mrow" data-slug="${p.slug}" aria-pressed="false">
    <span class="mrow__img">${cover(p) ? html`<img src="${small(cover(p))}" alt="" loading="lazy" />` : ""}</span>
    <span class="mrow__text">
      <strong>${p.title}</strong>
      <span class="mrow__place">${place(p)}</span>
      <span class="mrow__facts">${facts(p).map(([ic, t]) => html`<span>${icon(ic, 14)}${t}</span>`)}</span>
      ${awayText(p) ? html`<span class="mrow__away">${icon("route", 14)}${awayText(p)}</span>` : ""}
      <span class="mrow__foot"><span>${PURPOSE_LABELS[p.purpose] ?? ""}</span><b>${formatPrice(p.price)}</b></span>
    </span>
  </button>
</li>`;
const slideCard = (p) => html`<li>
  <button type="button" class="mslide" data-slug="${p.slug}">
    <span class="mslide__img">${cover(p) ? html`<img src="${small(cover(p))}" alt="" loading="lazy" />` : ""}<span class="mslide__tag">${PURPOSE_LABELS[p.purpose] ?? ""}</span>${away(p) != null ? html`<span class="mslide__away">${icon("route", 13)}${formatKm(away(p))}</span>` : ""}</span>
    <span class="mslide__text"><b>${shortPrice(p.price)}</b><span>${facts(p).map(([, t]) => t).join(", ")}</span><span class="mslide__place">${p.title} · ${place(p)}</span></span>
  </button>
</li>`;
const previewCard = (p) => html`<article class="mpreview">
  <a href="/properties/${p.slug}" class="mpreview__img">${cover(p) ? html`<img src="${small(cover(p))}" alt="" />` : ""}</a>
  <button type="button" class="mpreview__close" data-close aria-label="Close">${icon("close", 16, 2)}</button>
  <div class="mpreview__text">
    <a href="/properties/${p.slug}"><strong>${p.title}</strong></a>
    <span class="mrow__place">${place(p)}</span>
    ${awayText(p) ? html`<span class="mrow__away">${icon("route", 14)}${awayText(p)}, straight line</span>` : ""}
    <span class="mrow__foot"><span class="mrow__facts">${facts(p).map(([ic, t]) => html`<span>${icon(ic, 14)}${t}</span>`)}</span><b>${formatPrice(p.price)}</b></span>
    <div class="mpreview__actions">
      <a class="btn btn--dark" href="/properties/${p.slug}">View property</a>
      <a class="btn btn--outline-tan" href="https://www.google.com/maps/dir/?api=1&destination=${p.location.lat},${p.location.lng}" target="_blank" rel="noopener">Directions</a>
    </div>
  </div>
</article>`;

const visible = () => {
  const rows = placed.filter((p) => FILTERS[active][1](p) && (!query || [p.title, place(p)].some((v) => v.toLowerCase().includes(query))));
  return ORIGINS[origin]?.at ? rows.sort((a, b) => away(a) - away(b)) : rows;
};

function drawLists() {
  const rows = visible();
  document.getElementById("count").textContent = `${rows.length} ${rows.length === 1 ? "development" : "developments"} on the map`;
  render("#list", rows.length ? rows.map(rowCard) : html`<li class="mapx__empty">No developments match. Try another filter.</li>`);
  render("#carousel", rows.map(slideCard));
  const chips = FILTERS.map(([label], i) => html`<button type="button" class="chip" data-filter="${i}" aria-pressed="${i === active ? "true" : "false"}">${label}</button>`);
  render("#filters", chips);
  render("#chips", chips);
  markSelected();
}
function markSelected() {
  document.querySelectorAll("[data-slug]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.slug === selected)));
}
const fromSel = document.getElementById("from");
render(fromSel, Object.entries(ORIGINS).map(([k, o]) => html`<option value="${k}">${o.name}</option>`));
fromSel.value = origin;
drawLists();

// ---- The map -------------------------------------------------------------------------------------------
await library;
const gl = window.maplibregl;
const wide = matchMedia("(min-width: 900px)").matches;
const PADDING = wide ? { top: 140, bottom: 120, left: 140, right: 140 } : { top: 210, bottom: 330, left: 60, right: 80 };
function framing() {
  const b = new gl.LngLatBounds();
  visible().forEach((p) => b.extend(m.lngLat(p)));
  // The starting point is framed too, unless the visitor is far from Accra (then the map stays on Accra).
  const from = ORIGINS[origin]?.at;
  if (from && distanceKm(from, m.ACCRA) < 60) b.extend(from);
  if (ORIGINS.office) b.extend(ORIGINS.office.at);
  return b.isEmpty() ? null : b;
}
// /map?p=slug opens on that property; otherwise on all of them, the office and the starting point at once.
const start = new URLSearchParams(location.search).get("p");
const startAt = placed.find((p) => p.slug === start);
const map = m.createMap(
  document.getElementById("map"),
  startAt ? { center: m.lngLat(startAt), zoom: 15.6, pitch: 45, style: "map", controls: "top-left" } : { bounds: framing() ?? undefined, padding: PADDING, maxZoom: 13.8, style: "map", controls: "top-left" },
);
const markers = new Map();
for (const p of placed) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "tagpin";
  el.setAttribute("aria-label", `${p.title}, ${formatPrice(p.price)}`);
  el.innerHTML = '<span class="tagpin__label"></span><span class="tagpin__tip"></span>';
  el.querySelector(".tagpin__label").textContent = shortPrice(p.price);
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    select(p.slug, { scroll: true });
  });
  markers.set(p.slug, new gl.Marker({ element: el, anchor: "bottom" }).setLngLat(m.lngLat(p)).addTo(map));
  // MapLibre labels every marker "Map marker"; give it the property's name and price back.
  el.setAttribute("aria-label", `${p.title}, ${formatPrice(p.price)}`);
}

// Landmarks: the office always; the airport or "you" while distances are measured from them.
function landmark(cls, label, title) {
  const el = document.createElement("div");
  el.className = `landmark ${cls}`;
  el.title = title;
  el.innerHTML = '<span class="landmark__dot"></span><span class="landmark__label"></span>';
  el.querySelector(".landmark__label").textContent = label;
  return new gl.Marker({ element: el, anchor: "left", offset: [-7, 0] });
}
if (ORIGINS.office) landmark("landmark--office", "Our office", owner.location ?? "Our office").setLngLat(ORIGINS.office.at).addTo(map);
const airportMark = landmark("landmark--airport", "Airport", "Kotoka International Airport").setLngLat(ORIGINS.airport.at);
const meMark = landmark("landmark--me", "You", "Your location");

// A dashed line from the chosen starting point to the property picked.
function drawLine() {
  if (!map.isStyleLoaded()) return;
  const from = ORIGINS[origin]?.at;
  const p = placed.find((x) => x.slug === selected);
  const data = from && p ? { type: "Feature", geometry: { type: "LineString", coordinates: [from, lngLatOf(p)] }, properties: {} } : { type: "FeatureCollection", features: [] };
  if (map.getSource("away")) return map.getSource("away").setData(data);
  map.addSource("away", { type: "geojson", data });
  map.addLayer({ id: "away-line", type: "line", source: "away", layout: { "line-cap": "round" }, paint: { "line-color": "#111111", "line-width": 2.5, "line-dasharray": [1.5, 2] } });
}
map.on("style.load", drawLine);

const preview = document.getElementById("preview");
const carousel = document.getElementById("carousel");
function select(slug, { scroll = false, move = true } = {}) {
  const p = placed.find((x) => x.slug === slug);
  if (!p) return;
  selected = slug;
  markSelected();
  markers.forEach((mk, s) => mk.getElement().classList.toggle("is-active", s === slug));
  render(preview, previewCard(p));
  preview.classList.add("is-open");
  history.replaceState(null, "", `/map?p=${encodeURIComponent(slug)}`);
  drawLine();
  if (scroll) {
    carousel.querySelector(`[data-slug="${slug}"]`)?.scrollIntoView({ inline: "center", block: "nearest" });
    document.querySelector(`#list [data-slug="${slug}"]`)?.scrollIntoView({ block: "nearest" });
  }
  if (move) m.showProperty(map, p);
}
function deselect() {
  preview.classList.remove("is-open");
  selected = null;
  markSelected();
  markers.forEach((mk) => mk.getElement().classList.remove("is-active"));
  history.replaceState(null, "", "/map");
  drawLine();
}
function fitAll() {
  const b = framing();
  if (b) map.fitBounds(b, { padding: PADDING, maxZoom: 13.8, pitch: 0, bearing: 0, animate: false });
}

// ---- Distances ---------------------------------------------------------------------------------------
const note = document.getElementById("from-note");
function setOrigin(key) {
  origin = key;
  fromSel.value = key;
  if (key === "airport") airportMark.addTo(map);
  else airportMark.remove();
  if (key === "me") meMark.setLngLat(ORIGINS.me.at).addTo(map);
  else meMark.remove();
  drawLists();
  if (selected) {
    render(preview, previewCard(placed.find((x) => x.slug === selected)));
    drawLine();
  } else fitAll();
}
function fromMe() {
  note.textContent = "Finding you…";
  return locate().then(
    (at) => {
      ORIGINS.me.at = at;
      note.textContent = "";
      setOrigin("me");
    },
    (err) => {
      note.textContent = `${err.message} Distances are from ${ORIGINS[origin].label}; choose "Where I am" to try again.`;
      fromSel.value = origin;
    },
  );
}
fromSel.addEventListener("change", () => (fromSel.value === "me" ? fromMe() : setOrigin(fromSel.value)));
if (ORIGINS.airport) airportMark.addTo(map);
if (startAt) select(startAt.slug, { scroll: true, move: false });
// Distances from the visitor: straight away if they have already allowed it; otherwise the browser asks.
quietly().then((at) => {
  if (at) {
    ORIGINS.me.at = at;
    setOrigin("me");
  } else if (navigator.geolocation) fromMe();
});
map.once("load", () => {
  // The map credit starts folded into its small "i" button, so it doesn't cover the map on phones.
  document.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
});

document.addEventListener("click", (e) => {
  const f = e.target.closest("[data-filter]");
  if (f) {
    active = Number(f.dataset.filter);
    markers.forEach((mk, s) => (mk.getElement().hidden = !visible().some((p) => p.slug === s)));
    drawLists();
    fitAll();
    return;
  }
  const row = e.target.closest("#list [data-slug], #carousel [data-slug]");
  if (row) return select(row.dataset.slug);
  if (e.target.closest("[data-close]")) deselect();
});
document.getElementById("map-q").addEventListener("input", (e) => {
  query = e.target.value.trim().toLowerCase();
  markers.forEach((mk, s) => (mk.getElement().hidden = !visible().some((p) => p.slug === s)));
  drawLists();
});

// Phones: when a card settles in the middle of the carousel, the map goes to it.
let settle;
carousel.addEventListener("scroll", () => {
  clearTimeout(settle);
  settle = setTimeout(() => {
    const mid = carousel.getBoundingClientRect().left + carousel.clientWidth / 2;
    let best = null;
    carousel.querySelectorAll("[data-slug]").forEach((b) => {
      const r = b.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - mid);
      if (!best || d < best.d) best = { d, slug: b.dataset.slug };
    });
    if (best && best.slug !== selected) select(best.slug);
  }, 180);
});

document.querySelectorAll("[data-style]").forEach((b) =>
  b.addEventListener("click", () => {
    document.querySelectorAll("[data-style]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.style === b.dataset.style)));
    m.setStyle(map, b.dataset.style);
  }),
);
