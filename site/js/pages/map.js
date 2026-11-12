// Map page: every property on a map of Accra, opening on satellite with road names (Hybrid); Satellite and
// the street map are a tap away. Nearby properties group into numbered clusters that split as you zoom in;
// the rest show their price. Filters (sale or rent, type, price, bedrooms, bathrooms) update the map and the
// list together. Picking a property opens a card whose main action is Get directions (road route from the
// visitor, see directions.js). Desktop: the list on the left. Phones: the map, or the list, with a toggle.
// /map?p=slug opens on one property; add &directions=1 to start directions.
import { boot, html, icon, raw, render, toast } from "../core.js";
import { PURPOSE_LABELS, TYPE_LABELS, contactFor, cover, distanceKm, formatKm, formatPrice, keyFacts, loadPortfolio, place, shortPrice, small } from "../data.js";
import * as m from "../map.js";
import { locate, quietly } from "../here.js";
import { openRoute, routeOpen } from "../directions.js";

const library = m.loadMapLibre();
boot();
const portfolio = await loadPortfolio().catch(() => ({ properties: [] }));
const owner = portfolio.owner ?? {};
const placed = (portfolio.properties ?? []).filter((p) => !p.coming_soon && typeof p.location?.lat === "number" && typeof p.location?.lng === "number");
const bySlug = Object.fromEntries(placed.map((p) => [p.slug, p]));

// ---- Filters --------------------------------------------------------------------------------------------
const commercial = ["commercial", "office", "retail", "warehouse", "mixed_use"];
const KINDS = [
  ["all", "All", () => true],
  ["sale", "For sale", (p) => p.purpose === "sale"],
  ["rent", "For rent", (p) => p.purpose === "rent"],
  ["houses", "Houses", (p) => p.type === "house" || p.type === "townhouse"],
  ["apartments", "Apartments", (p) => p.type === "apartment"],
  ["commercial", "Commercial", (p) => commercial.includes(p.type)],
  ["land", "Land", (p) => p.type === "land"],
].filter(([k, , test]) => k === "all" || placed.some(test));
const most = (v) => (typeof v === "number" ? v : Math.max(0, ...(String(v ?? "").match(/\d+/g) ?? ["0"]).map(Number)));
const f = { kind: "all", q: "", currency: "USD", min: 0, max: 0, beds: 0, baths: 0 };
const filtersOn = () => Boolean(f.min || f.max || f.beds || f.baths);
function matches(p) {
  if (!KINDS.find(([k]) => k === f.kind)[2](p)) return false;
  if (f.q && ![p.title, place(p)].some((v) => v.toLowerCase().includes(f.q))) return false;
  if (f.beds && most(p.bedrooms) < f.beds) return false;
  if (f.baths && most(p.bathrooms) < f.baths) return false;
  // A price limit applies in the chosen currency; prices in another currency or on request are left out.
  if (f.min || f.max) {
    const a = p.price?.amount;
    if (a == null || p.price.on_request || (p.price.currency ?? "GHS") !== f.currency) return false;
    if (f.min && a < f.min) return false;
    if (f.max && a > f.max) return false;
  }
  return true;
}

// ---- The visitor's position (only after they tap "Show where I am", or if they allowed it before) -------
let me = null;
const at = (p) => [p.location.lng, p.location.lat];
const away = (p) => distanceKm(me, at(p));
const visible = () => {
  const rows = placed.filter(matches);
  return me ? rows.sort((a, b) => away(a) - away(b)) : rows;
};

// ---- Lists ------------------------------------------------------------------------------------------------
const facts = (p) => keyFacts(p).slice(0, 2);
let selected = null;
const rowCard = (p) => html`<li>
  <button type="button" class="mrow" data-slug="${p.slug}" aria-pressed="false">
    <span class="mrow__img">${cover(p) ? html`<img src="${small(cover(p))}" alt="" loading="lazy" />` : ""}</span>
    <span class="mrow__text">
      <strong>${p.title}</strong>
      <span class="mrow__place">${place(p)} · ${TYPE_LABELS[p.type] ?? ""}</span>
      <span class="mrow__facts">${facts(p).map(([ic, t]) => html`<span>${icon(ic, 14)}${t}</span>`)}</span>
      ${me ? html`<span class="mrow__away">${icon("route", 14)}${formatKm(away(p))} from you</span>` : ""}
      <span class="mrow__foot"><span>${PURPOSE_LABELS[p.purpose] ?? ""}</span><b>${formatPrice(p.price)}</b></span>
    </span>
  </button>
</li>`;
const previewCard = (p) => html`<article class="mpreview">
  <a href="/properties/${p.slug}" class="mpreview__img">${cover(p) ? html`<img src="${small(cover(p))}" alt="" />` : ""}</a>
  <button type="button" class="mpreview__close" data-close aria-label="Close">${icon("close", 16, 2)}</button>
  <div class="mpreview__text">
    <p class="mpreview__price">${formatPrice(p.price)}<span class="chip-s">${PURPOSE_LABELS[p.purpose] ?? ""}</span></p>
    <a href="/properties/${p.slug}"><strong>${p.title}</strong></a>
    <span class="mrow__place">${place(p)} · ${TYPE_LABELS[p.type] ?? ""}</span>
    <span class="mrow__facts">${facts(p).map(([ic, t]) => html`<span>${icon(ic, 14)}${t}</span>`)}${me ? html`<span>${icon("route", 14)}${formatKm(away(p))} away</span>` : ""}</span>
    <div class="mpreview__actions">
      <button type="button" class="btn btn--dark" data-directions="${p.slug}">${icon("route", 17)}Get directions</button>
      <a class="btn btn--line-dark" href="/properties/${p.slug}">Details</a>
    </div>
  </div>
</article>`;

function drawLists() {
  const rows = visible();
  document.getElementById("count").textContent = `${rows.length} ${rows.length === 1 ? "property" : "properties"}${filtersOn() || f.kind !== "all" || f.q ? " match" : " on the map"}`;
  render("#list", rows.length ? rows.map(rowCard) : html`<li class="mapx__empty">No properties match. <button type="button" class="text-link" data-reset>Clear filters</button></li>`);
  document.querySelectorAll("[data-filter-dot]").forEach((d) => (d.hidden = !filtersOn()));
  document.getElementById("nomatch").hidden = rows.length > 0;
  markSelected();
}
function markSelected() {
  document.querySelectorAll("#list [data-slug]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.slug === selected)));
}
drawLists();

// ---- The map ----------------------------------------------------------------------------------------------
await library;
const gl = window.maplibregl;
const wide = () => matchMedia("(min-width: 900px)").matches;
const PADDING = () => (wide() ? { top: 140, bottom: 120, left: 120, right: 160 } : { top: 170, bottom: 200, left: 50, right: 90 });
let look = "hybrid";
try {
  const saved = localStorage.getItem("pq-map-look");
  if (m.STYLES.includes(saved)) look = saved;
} catch {
  /* storage unavailable */
}
function framing(rows = visible()) {
  const b = new gl.LngLatBounds();
  rows.forEach((p) => b.extend(at(p)));
  return b.isEmpty() ? null : b;
}
const start = new URLSearchParams(location.search).get("p");
const wantsDirections = Boolean(new URLSearchParams(location.search).get("directions"));
const startAt = bySlug[start];
let map;
try {
  map = await m.createMap(document.getElementById("map"), {
    ...(startAt ? { center: at(startAt), zoom: 16.2 } : { bounds: framing() ?? undefined, padding: PADDING(), maxZoom: 14 }),
    style: look,
    controls: "top-right",
    onImageryFail: () => {
      look = "map";
      drawLooks();
      toast("Satellite imagery isn't loading right now, so here's the street map.");
    },
  });
} catch {
  document.getElementById("loading").textContent = "The map couldn't load. Check your connection and refresh. The list still works.";
  throw new Error("map failed");
}
map.once("load", () => {
  document.getElementById("loading").hidden = true;
});

// Properties as a clustered GeoJSON source: numbered circles where they crowd, price tags elsewhere.
const geojson = () => ({ type: "FeatureCollection", features: visible().map((p) => ({ type: "Feature", properties: { slug: p.slug }, geometry: { type: "Point", coordinates: at(p) } })) });
function addProperties() {
  if (map.getSource("props")) return;
  map.addSource("props", { type: "geojson", data: geojson(), cluster: true, clusterRadius: 52, clusterMaxZoom: 14 });
  map.addLayer({ id: "clusters", type: "circle", source: "props", filter: ["has", "point_count"], paint: { "circle-color": "#111111", "circle-radius": ["step", ["get", "point_count"], 19, 5, 24, 15, 30], "circle-stroke-width": 3, "circle-stroke-color": "#ffffff" } });
  map.addLayer({ id: "cluster-count", type: "symbol", source: "props", filter: ["has", "point_count"], layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Bold"], "text-size": 14, "text-allow-overlap": true }, paint: { "text-color": "#ffffff" } });
}
map.on("style.load", () => {
  addProperties();
  drawPins();
});
map.on("click", "clusters", async (e) => {
  const feature = e.features[0];
  const zoom = await map.getSource("props").getClusterExpansionZoom(feature.properties.cluster_id);
  map.jumpTo({ center: feature.geometry.coordinates, zoom: Math.min(zoom + 0.3, 18) });
});
map.on("mouseenter", "clusters", () => (map.getCanvas().style.cursor = "pointer"));
map.on("mouseleave", "clusters", () => (map.getCanvas().style.cursor = ""));

// Price tags are DOM markers for the properties not in a cluster; each is made once and reused.
const tags = new Map();
function tagFor(p) {
  if (tags.has(p.slug)) return tags.get(p.slug);
  const el = document.createElement("button");
  el.type = "button";
  el.className = "tagpin";
  el.innerHTML = '<span class="tagpin__label"></span><span class="tagpin__tip"></span>';
  el.querySelector(".tagpin__label").textContent = shortPrice(p.price);
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    select(p.slug, { scroll: true, move: false });
  });
  const mk = new gl.Marker({ element: el, anchor: "bottom" }).setLngLat(at(p));
  // MapLibre labels every marker "Map marker"; give it the property's name and price back.
  el.setAttribute("aria-label", `${p.title}, ${formatPrice(p.price)}`);
  tags.set(p.slug, mk);
  return mk;
}
function drawPins() {
  if (!map.getSource("props") || !map.isSourceLoaded("props")) return;
  const show = new Set(map.querySourceFeatures("props", { filter: ["!", ["has", "point_count"]] }).map((x) => x.properties.slug));
  if (selected && visible().some((p) => p.slug === selected)) show.add(selected);
  for (const [slug, mk] of tags) if (!show.has(slug)) mk.remove();
  for (const slug of show) {
    const mk = tagFor(bySlug[slug]);
    if (!mk._map) mk.addTo(map);
    mk.getElement().classList.toggle("is-active", slug === selected);
  }
}
map.on("moveend", drawPins);
map.on("sourcedata", (e) => e.sourceId === "props" && e.isSourceLoaded && drawPins());

// The office, and "You" once the visitor has shared their location.
if (typeof owner.office?.lat === "number") {
  const el = document.createElement("div");
  el.className = "landmark landmark--office";
  el.innerHTML = '<span class="landmark__dot"></span><span class="landmark__label">Our office</span>';
  new gl.Marker({ element: el, anchor: "left", offset: [-7, 0] }).setLngLat([owner.office.lng, owner.office.lat]).addTo(map);
}
const meEl = Object.assign(document.createElement("div"), { className: "landmark landmark--me", innerHTML: '<span class="landmark__dot"></span><span class="landmark__label">You</span>' });
const meMark = new gl.Marker({ element: meEl, anchor: "left", offset: [-7, 0] });
function setMe(pos) {
  me = pos;
  meMark.setLngLat(me).addTo(map);
  drawLists();
  if (selected) render(preview, previewCard(bySlug[selected]));
}

// ---- Selecting a property ---------------------------------------------------------------------------------
const preview = document.getElementById("preview");
function select(slug, { scroll = false, move = true } = {}) {
  const p = bySlug[slug];
  if (!p) return;
  selected = slug;
  markSelected();
  render(preview, previewCard(p));
  preview.classList.add("is-open");
  history.replaceState(null, "", `/map?p=${encodeURIComponent(slug)}`);
  if (scroll) document.querySelector(`#list [data-slug="${slug}"]`)?.scrollIntoView({ block: "nearest" });
  if (move && !routeOpen()) m.showProperty(map, p, { zoom: 16.2 });
  drawPins();
}
function deselect() {
  preview.classList.remove("is-open");
  selected = null;
  markSelected();
  history.replaceState(null, "", "/map");
  drawPins();
}
function fitAll() {
  const b = framing();
  if (b) map.fitBounds(b, { padding: PADDING(), maxZoom: 14, pitch: 0, bearing: 0, animate: false });
}
function refilter({ fit = true } = {}) {
  drawLists();
  map.getSource("props")?.setData(geojson());
  if (selected && !visible().some((p) => p.slug === selected)) deselect();
  if (fit) fitAll();
}

// ---- Directions --------------------------------------------------------------------------------------------
function startRoute(slug) {
  const p = bySlug[slug];
  if (!p) return;
  if (selected !== slug) select(slug, { move: false });
  setView("map");
  openRoute({ map, gl, p, owner: contactFor(p, portfolio), here: () => me, setHere: setMe, padding: PADDING() });
}
if (startAt) select(startAt.slug, { scroll: true, move: false });
if (startAt && wantsDirections) startRoute(startAt.slug);
// If the visitor allowed location on an earlier visit, use it quietly; never ask on page load.
quietly().then((pos) => pos && setMe(pos));

// ---- Map looks (Hybrid, Satellite, Map) -------------------------------------------------------------------
function drawLooks() {
  render(
    "#looks",
    m.STYLES.map((k) => html`<button type="button" class="look look--${k}" data-look="${k}" aria-pressed="${k === look ? "true" : "false"}"><span class="look__img" aria-hidden="true"></span>${m.STYLE_NAMES[k]}</button>`),
  );
}
drawLooks();

// The style picker opens from the layers button and closes after a choice or a tap elsewhere.
function toggleLooks(open = document.getElementById("looks").hidden) {
  document.getElementById("looks").hidden = !open;
  document.querySelector("[data-tool=layers]").setAttribute("aria-expanded", String(open));
}

// "Get directions" with nothing picked: choose the property first.
const picker = document.getElementById("mpick");
function openPicker() {
  const rows = visible();
  render(
    picker,
    html`<div class="sheet__panel">
      <div class="sheet__grip" aria-hidden="true"></div>
      <header class="sheet__head"><div><h2 id="mp-h">Directions to…</h2><p>Pick a property. The route starts from where you are.</p></div><button type="button" class="round round--soft" data-close-sheet aria-label="Close">${icon("close", 18, 2)}</button></header>
      <ul class="picklist">${rows.map((p) => html`<li><button type="button" data-pick="${p.slug}">${cover(p) ? html`<img src="${small(cover(p))}" alt="" loading="lazy" />` : html`<span class="suggest__mono">${p.title[0]}</span>`}<span><strong>${p.title}</strong><small>${place(p)}${me ? ` · ${formatKm(away(p))}` : ""}</small></span>${icon("next", 18)}</button></li>`)}</ul>
    </div>`,
  );
  picker.showModal();
}
picker.addEventListener("click", (e) => (e.target === picker || e.target.closest("[data-close-sheet]")) && picker.close());

// ---- Filters sheet -----------------------------------------------------------------------------------------
const sheet = document.getElementById("mfilters");
const seg = (name, value, options) => html`<div class="seg">${options.map(([v, l]) => html`<label class="slot"><input type="radio" name="${name}" value="${v}" ${v === value ? raw("checked") : ""} /><span><b>${l}</b></span></label>`)}</div>`;
const COUNTS = [[0, "Any"], [1, "1+"], [2, "2+"], [3, "3+"], [4, "4+"], [5, "5+"]];
function openFilters() {
  render(
    sheet,
    html`<form class="sheet__panel" id="mf-form">
      <div class="sheet__grip" aria-hidden="true"></div>
      <header class="sheet__head"><div><h2 id="mf-h">Filters</h2><p>${visible().length} of ${placed.length} properties</p></div><button type="button" class="round round--soft" data-close-sheet aria-label="Close">${icon("close", 18, 2)}</button></header>
      <fieldset class="pick"><legend>Show</legend><div class="seg seg--wrap">${KINDS.map(([k, l]) => html`<label class="slot"><input type="radio" name="kind" value="${k}" ${k === f.kind ? raw("checked") : ""} /><span><b>${l}</b></span></label>`)}</div></fieldset>
      <fieldset class="pick"><legend>Price</legend>
        <div class="mf-price">
          <select name="currency" aria-label="Currency">${["USD", "GHS"].map((c) => html`<option value="${c}" ${c === f.currency ? raw("selected") : ""}>${c}</option>`)}</select>
          <input name="min" type="number" inputmode="numeric" min="0" placeholder="Min" aria-label="Minimum price" value="${f.min || ""}" />
          <input name="max" type="number" inputmode="numeric" min="0" placeholder="Max" aria-label="Maximum price" value="${f.max || ""}" />
        </div>
        <p class="fineprint">With a price set, only properties priced in that currency are shown.</p>
      </fieldset>
      <fieldset class="pick"><legend>Bedrooms</legend>${seg("beds", f.beds, COUNTS)}</fieldset>
      <fieldset class="pick"><legend>Bathrooms</legend>${seg("baths", f.baths, COUNTS)}</fieldset>
      <div class="sheet__actions"><button type="button" class="btn btn--line-dark" data-reset>Clear</button><button type="submit" class="btn btn--dark">Show results</button></div>
    </form>`,
  );
  sheet.showModal();
}
sheet.addEventListener("submit", (e) => {
  e.preventDefault();
  const d = new FormData(e.target);
  Object.assign(f, { kind: String(d.get("kind")), currency: String(d.get("currency")), min: Number(d.get("min")) || 0, max: Number(d.get("max")) || 0, beds: Number(d.get("beds")) || 0, baths: Number(d.get("baths")) || 0 });
  sheet.close();
  refilter();
});
sheet.addEventListener("click", (e) => (e.target === sheet || e.target.closest("[data-close-sheet]")) && sheet.close());

// ---- Phones: Map or List ----------------------------------------------------------------------------------
function setView(v) {
  document.querySelector(".mapx").dataset.view = v;
  document.querySelectorAll("button[data-view]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === v)));
  if (v === "map") map.resize();
}

// ---- Clicks -------------------------------------------------------------------------------------------------
document.addEventListener("click", async (e) => {
  const t = (s) => e.target.closest(s);
  if (t("[data-open-filters]")) return openFilters();
  if (t("[data-reset]")) {
    Object.assign(f, { kind: "all", q: "", min: 0, max: 0, beds: 0, baths: 0 });
    document.getElementById("map-q").value = "";
    if (sheet.open) sheet.close();
    return refilter();
  }
  const k = t("[data-kind]");
  if (k) {
    f.kind = k.dataset.kind;
    return refilter();
  }
  const lk = t("[data-look]");
  if (lk && lk.dataset.look !== look) {
    look = lk.dataset.look;
    try {
      localStorage.setItem("pq-map-look", look);
    } catch {
      /* storage unavailable */
    }
    drawLooks();
    toggleLooks(false);
    return m.setStyle(map, look);
  }
  const tool = t("[data-tool]")?.dataset.tool;
  if (tool === "layers") return toggleLooks();
  if (!t("#looks")) toggleLooks(false);
  if (t("#go")) return selected ? startRoute(selected) : openPicker();
  const pick = t("[data-pick]");
  if (pick) {
    picker.close();
    return startRoute(pick.dataset.pick);
  }
  if (tool === "fit") return fitAll();
  if (tool === "locate") {
    try {
      setMe(await locate());
      map.jumpTo({ center: me, zoom: Math.max(map.getZoom(), 13) });
    } catch (err) {
      toast(err.message);
    }
    return;
  }
  const v = t("button[data-view]");
  if (v) return setView(v.dataset.view);
  const row = t("#list [data-slug]");
  if (row) {
    setView("map");
    return select(row.dataset.slug);
  }
  const dir = t("[data-directions]");
  if (dir) return startRoute(dir.dataset.directions);
  if (t("[data-close]")) deselect();
});
let typing;
document.getElementById("map-q").addEventListener("input", (e) => {
  clearTimeout(typing);
  typing = setTimeout(() => {
    f.q = e.target.value.trim().toLowerCase();
    refilter({ fit: false });
  }, 200);
});
