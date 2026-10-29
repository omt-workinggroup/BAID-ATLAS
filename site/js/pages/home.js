// Homepage: introduction, the listings (filter, search, sort), the satellite map, about and contact.
import { boot, html, markup, params, raw, render } from "../core.js";
import { PURPOSE_LABELS, filterProperties, loadPortfolio, parseFilters, place, toQuery, whatsappLink } from "../data.js";
import { featureListing, listing, mapCard } from "../cards.js";

boot();
const f = parseFilters(params());
const link = (changes) => `/${toQuery({ ...f, ...changes })}#properties`;

let portfolio = { owner: {}, properties: [] };
try {
  portfolio = await loadPortfolio();
} catch {
  render("#results", html`<p class="empty">The properties couldn't be loaded. Please refresh the page.</p>`);
}
const all = portfolio.properties ?? [];
const owner = portfolio.owner ?? {};

// ---- Listings ----------------------------------------------------------------------------------------
document.getElementById("count").textContent = all.length ? `(${all.length})` : "";
const commercial = ["commercial", "office", "retail", "warehouse", "mixed_use"];
const TABS = [
  ["All", {}, () => true],
  ["For sale", { purpose: "sale" }, (p) => p.purpose === "sale"],
  ["For rent", { purpose: "rent" }, (p) => p.purpose === "rent"],
  ["Commercial", { type: "commercial" }, (p) => commercial.includes(p.type)],
];
render(
  "#filters",
  TABS.filter(([, , test], i) => i === 0 || all.some(test)).map(([label, c]) => {
    const on = (c.purpose ?? undefined) === f.purpose && (c.type ?? undefined) === f.type;
    return html`<a href="${link({ purpose: c.purpose, type: c.type })}" ${raw(on ? 'aria-current="true"' : "")}>${label}</a>`;
  }),
);
const form = document.getElementById("search-form");
form.q.value = f.q ?? "";
form.addEventListener("submit", (e) => {
  e.preventDefault();
  location.href = link({ q: form.q.value.trim() || undefined });
});
const sort = document.getElementById("sort-select");
sort.value = f.sort;
sort.addEventListener("change", () => (location.href = link({ sort: sort.value })));

// "Commercial" covers offices, stores and warehouses too.
const rows = f.type === "commercial" ? filterProperties(all, { ...f, type: undefined }).filter((p) => commercial.includes(p.type)) : filterProperties(all, f);
const results = document.getElementById("results");
results.removeAttribute("aria-busy");
const plain = !f.purpose && !f.type && !f.q && f.sort === "newest";
if (rows.length) {
  const [first, ...rest] = plain ? rows : [null, ...rows];
  render(
    results,
    html`${first ? featureListing(first) : ""}${rest.length ? html`<div class="listing-grid">${rest.map((p, i) => listing(p, { eager: i < 2 }))}</div>` : ""}`,
  );
} else if (all.length) {
  render(results, html`<p class="empty">Nothing matches that search. <a class="text-link" href="/#properties">Show all properties</a></p>`);
} else {
  render(results, html`<p class="empty">New properties are being prepared. <a class="text-link" href="/contact">Ask us what's coming</a></p>`);
}
if (location.hash === "#properties" && (f.purpose || f.type || f.q)) document.getElementById("properties").scrollIntoView();

// ---- About and contact -------------------------------------------------------------------------------
if (owner.tagline) document.querySelector("[data-owner-tagline]").textContent = owner.tagline;
document.getElementById("about-text").textContent = owner.about ?? "";
render("#services", (owner.services ?? []).map((s) => html`<li>${s}</li>`));
const wa = whatsappLink(owner.whatsapp);
render(
  "#cta-links",
  html`${wa ? html`<a class="button" href="${wa}" target="_blank" rel="noopener">Message us on WhatsApp</a>` : ""}
    ${owner.phone ? html`<a class="text-link" href="tel:${owner.phone.replace(/\s/g, "")}">${owner.phone}</a>` : ""}
    ${owner.email ? html`<a class="text-link" href="mailto:${owner.email}">${owner.email}</a>` : ""}`,
);

// ---- Satellite map: loads when it is about to scroll into view ----------------------------------------
const placed = all.filter((p) => typeof p.location?.lat === "number");
render(
  "#places",
  placed.map((p, i) => html`<li><button type="button" data-place="${p.slug}"><span class="places__n">${String(i + 1).padStart(2, "0")}</span><span><strong>${p.title}</strong><span>${place(p)} · ${PURPOSE_LABELS[p.purpose] ?? ""}</span></span></button></li>`),
);
const mapEl = document.getElementById("map");
new IntersectionObserver(
  (entries, obs) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    obs.disconnect();
    startMap().catch(() => render(mapEl, html`<p class="empty">The map couldn't load.</p>`));
  },
  { rootMargin: "400px" },
).observe(mapEl);

async function startMap() {
  const m = await import("../map.js");
  await m.loadMapLibre();
  const gl = window.maplibregl;
  const map = m.createMap(mapEl, { center: m.ACCRA, zoom: 11.2, pitch: 0, cooperative: true });
  const markers = new Map();
  let card = null;
  let stopOrbit = () => {};

  const select = (slug) => {
    const p = placed.find((x) => x.slug === slug);
    if (!p) return;
    stopOrbit();
    markers.forEach((mk, s) => mk.getElement().classList.toggle("is-active", s === slug));
    document.querySelectorAll("[data-place]").forEach((b) => b.setAttribute("aria-current", String(b.dataset.place === slug)));
    m.flyToProperty(map, p);
    card?.remove();
    card = new gl.Popup({ closeButton: false, offset: 28, maxWidth: "320px", className: "map-popup" }).setLngLat(m.lngLat(p)).setHTML(markup(mapCard(p))).addTo(map);
    map.once("moveend", () => (stopOrbit = m.orbit(map)));
  };

  for (const p of placed) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "pin";
    el.setAttribute("aria-label", p.title);
    el.innerHTML = '<span class="pin__dot"></span><span class="pin__label"></span>';
    el.querySelector(".pin__label").textContent = p.title;
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      select(p.slug);
    });
    markers.set(p.slug, new gl.Marker({ element: el, anchor: "bottom" }).setLngLat(m.lngLat(p)).addTo(map));
  }
  document.getElementById("places").addEventListener("click", (e) => {
    const b = e.target.closest("[data-place]");
    if (b) select(b.dataset.place);
  });

  // Opening move: from the city down to the developments, tilted.
  map.once("load", () => {
    if (!placed.length) return;
    const b = new gl.LngLatBounds();
    placed.forEach((p) => b.extend(m.lngLat(p)));
    map.fitBounds(b, { padding: { top: 180, bottom: 160, left: 200, right: 200 }, maxZoom: 14, pitch: 55, bearing: -18, duration: 3500 });
    map.once("moveend", () => (stopOrbit = m.orbit(map)));
  });

  document.querySelectorAll("[data-style]").forEach((b) =>
    b.addEventListener("click", () => {
      document.querySelectorAll("[data-style]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      m.setStyle(map, b.dataset.style);
    }),
  );
}
