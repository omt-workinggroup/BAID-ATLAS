// Map page: every development on a 3D map of Accra. Desktop: filters and a list on the left, the map on
// the right with price tags and a floating preview card. Phones: the map fills the screen, filters sit on
// top and the properties scroll along the bottom; the card in view is the one shown on the map.
import { boot, html, icon, render } from "../core.js";
import { PURPOSE_LABELS, cover, formatPrice, keyFacts, loadPortfolio, place, shortPrice } from "../data.js";

boot();
const portfolio = await loadPortfolio().catch(() => ({ properties: [] }));
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
let active = 0;
let query = "";
let selected = null;

const facts = (p) => keyFacts(p).slice(0, 2);
const rowCard = (p) => html`<li>
  <button type="button" class="mrow" data-slug="${p.slug}" aria-pressed="false">
    <span class="mrow__img">${cover(p) ? html`<img src="${cover(p).src}" alt="" loading="lazy" />` : ""}</span>
    <span class="mrow__text">
      <strong>${p.title}</strong>
      <span class="mrow__place">${place(p)}</span>
      <span class="mrow__facts">${facts(p).map(([ic, t]) => html`<span>${icon(ic, 14)}${t}</span>`)}</span>
      <span class="mrow__foot"><span>${PURPOSE_LABELS[p.purpose] ?? ""}</span><b>${formatPrice(p.price)}</b></span>
    </span>
  </button>
</li>`;
const slideCard = (p) => html`<li>
  <button type="button" class="mslide" data-slug="${p.slug}">
    <span class="mslide__img">${cover(p) ? html`<img src="${cover(p).src}" alt="" loading="lazy" />` : ""}<span class="mslide__tag">${PURPOSE_LABELS[p.purpose] ?? ""}</span></span>
    <span class="mslide__text"><b>${shortPrice(p.price)}</b><span>${facts(p).map(([, t]) => t).join(", ")}</span><span class="mslide__place">${p.title} · ${place(p)}</span></span>
  </button>
</li>`;
const previewCard = (p) => html`<article class="mpreview">
  <a href="/properties/${p.slug}" class="mpreview__img">${cover(p) ? html`<img src="${cover(p).src}" alt="" />` : ""}</a>
  <button type="button" class="mpreview__close" data-close aria-label="Close">${icon("close", 16, 2)}</button>
  <div class="mpreview__text">
    <a href="/properties/${p.slug}"><strong>${p.title}</strong></a>
    <span class="mrow__place">${place(p)}</span>
    <span class="mrow__foot"><span class="mrow__facts">${facts(p).map(([ic, t]) => html`<span>${icon(ic, 14)}${t}</span>`)}</span><b>${formatPrice(p.price)}</b></span>
    <a class="btn btn--dark" href="/properties/${p.slug}">View property</a>
  </div>
</article>`;

const visible = () => placed.filter((p) => FILTERS[active][1](p) && (!query || [p.title, place(p)].some((v) => v.toLowerCase().includes(query))));

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
drawLists();

// ---- The map -------------------------------------------------------------------------------------------
const m = await import("../map.js");
await m.loadMapLibre();
const gl = window.maplibregl;
const map = m.createMap(document.getElementById("map"), { center: m.ACCRA, zoom: 11.3, pitch: 0, style: "map" });
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
}

const preview = document.getElementById("preview");
const carousel = document.getElementById("carousel");
let stopOrbit = () => {};
function select(slug, { scroll = false, fly = true } = {}) {
  const p = placed.find((x) => x.slug === slug);
  if (!p) return;
  selected = slug;
  markSelected();
  markers.forEach((mk, s) => mk.getElement().classList.toggle("is-active", s === slug));
  render(preview, previewCard(p));
  preview.classList.add("is-open");
  if (scroll) {
    carousel.querySelector(`[data-slug="${slug}"]`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    document.querySelector(`#list [data-slug="${slug}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  if (fly) {
    stopOrbit();
    m.flyToProperty(map, p, { zoom: 15.6 });
    map.once("moveend", () => (stopOrbit = m.orbit(map)));
  }
}
function fitAll() {
  const rows = visible();
  if (!rows.length) return;
  const b = new gl.LngLatBounds();
  rows.forEach((p) => b.extend(m.lngLat(p)));
  const wide = matchMedia("(min-width: 900px)").matches;
  map.fitBounds(b, { padding: wide ? { top: 140, bottom: 120, left: 140, right: 140 } : { top: 210, bottom: 250, left: 60, right: 60 }, maxZoom: 13.8, pitch: 48, bearing: -15, duration: 2600 });
}
map.once("load", fitAll);

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
  if (e.target.closest("[data-close]")) {
    preview.classList.remove("is-open");
    selected = null;
    markSelected();
    markers.forEach((mk) => mk.getElement().classList.remove("is-active"));
  }
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
