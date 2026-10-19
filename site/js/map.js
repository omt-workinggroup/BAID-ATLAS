// Maps (Leaflet + MapTiler tiles). Only approximate public positions are ever shown: the database exposes
// coordinates rounded to about 1 km, never the exact address.
import { html, markup } from "./core.js";
import { MAPTILER_KEY, MAP_STYLE } from "./config.js";
import { formatPrice } from "./format.js";

export const GHANA_CENTRE = [7.95, -1.03];
const ATTRIBUTION =
  '<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener">© MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a>';

// 512 px tiles (one zoom level down) keep labels large and sharp; high-density screens get the @2x set.
export function createMap(el, { center = GHANA_CENTRE, zoom = 7, scrollWheelZoom = true, style = MAP_STYLE, zoomControl = true } = {}) {
  const L = window.L;
  const map = L.map(el, { center, zoom, scrollWheelZoom, zoomControl, attributionControl: true, minZoom: 5, maxZoom: 17 });
  map.attributionControl.setPrefix(false);
  L.tileLayer(`https://api.maptiler.com/maps/${style}/{z}/{x}/{y}{r}.png?key=${MAPTILER_KEY}`, {
    attribution: ATTRIBUTION,
    tileSize: 512,
    zoomOffset: -1,
    crossOrigin: true,
  }).addTo(map);
  return map;
}

// "GHS 1.25M", "USD 85k", "GHS 6.5k/mo": short enough for a marker.
export function shortPrice(amount, currency, period) {
  const n = Number(amount);
  const v = n >= 1e6 ? `${+(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)}k` : String(n);
  const per = { per_month: "/mo", per_year: "/yr", per_week: "/wk", per_night: "/night" }[period] ?? "";
  return `${currency} ${v}${per}`;
}

export const hasPosition = (l) => l.public_latitude !== null && l.public_latitude !== undefined && l.public_longitude !== null;

// Price markers grouped into clusters when they overlap, each with a soft circle over its approximate area.
// With onSelect, a click picks the listing (the page shows its own preview); without it, a small popup opens.
export function addListingMarkers(map, listings, { onSelect } = {}) {
  const L = window.L;
  const group = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 48,
    iconCreateFunction: (c) => L.divIcon({ html: `<span>${c.getChildCount()}</span>`, className: "map-cluster", iconSize: [40, 40] }),
  });
  const areas = L.layerGroup();
  const byId = new Map();
  const priceIcon = (l, selected) =>
    L.divIcon({ html: markup(html`<span>${shortPrice(l.asking_price, l.currency, l.price_period)}</span>`), className: `map-price${selected ? " is-selected" : ""}`, iconSize: null });
  for (const l of listings.filter(hasPosition)) {
    const at = [Number(l.public_latitude), Number(l.public_longitude)];
    L.circle(at, { radius: 700, stroke: false, fillColor: "#ffffff", fillOpacity: 0.12, interactive: false }).addTo(areas);
    const marker = L.marker(at, { icon: priceIcon(l, false), title: l.title, keyboard: true });
    if (onSelect) {
      marker.on("click", () => onSelect(l));
      marker.on("keypress", (e) => e.originalEvent.key === "Enter" && onSelect(l));
    } else {
      marker.bindPopup(
        markup(html`<a class="map-popup" href="/properties/${l.slug}">
          ${l.cover_url ? html`<img src="${l.cover_url}" alt="" />` : ""}
          <span class="bold">${formatPrice(l.asking_price, l.currency, l.price_period)}</span>
          <span>${l.title}</span>
          <span class="tiny muted">Approximate area · ${l.locality ? `${l.locality}, ` : ""}${l.city}</span>
        </a>`),
        { closeButton: false, minWidth: 220, maxWidth: 260 },
      );
    }
    group.addLayer(marker);
    byId.set(l.id, { marker, listing: l });
  }
  map.addLayer(areas);
  map.addLayer(group);
  let current = null;
  // Highlights one price pill (or none) and keeps it above its neighbours.
  const select = (id) => {
    if (current && byId.has(current)) byId.get(current).marker.setIcon(priceIcon(byId.get(current).listing, false)).setZIndexOffset(0);
    current = id;
    if (id && byId.has(id)) byId.get(id).marker.setIcon(priceIcon(byId.get(id).listing, true)).setZIndexOffset(1000);
  };
  return { group, areas, byId, select };
}

// padding keeps pins clear of anything drawn over the map (e.g. { paddingTopLeft: [x, y] }).
export function fitToListings(map, group, padding = {}) {
  map.invalidateSize();
  const b = group.getBounds();
  if (b.isValid()) map.fitBounds(b.pad(0.2), { maxZoom: 14, ...padding });
}

// Lazily loads Leaflet (and the cluster plug-in) the first time a page needs a map.
let loading = null;
export function loadLeaflet({ clusters = false } = {}) {
  const script = (src) => new Promise((ok, fail) => document.head.append(Object.assign(document.createElement("script"), { src, onload: ok, onerror: fail })));
  const css = (href) => document.querySelector(`link[href="${href}"]`) || document.head.append(Object.assign(document.createElement("link"), { rel: "stylesheet", href }));
  css("/css/leaflet.css");
  loading ??= script("/js/vendor/leaflet.js");
  return loading.then(() => {
    if (!clusters || window.L.markerClusterGroup) return;
    css("/css/markercluster.css");
    return script("/js/vendor/leaflet.markercluster.js");
  });
}

// Place search for the listing form (MapTiler geocoding, limited to Ghana). Returns [lat, lng] or null.
export async function findPlace(query) {
  const q = String(query ?? "").trim();
  if (q.length < 2) return null;
  const res = await fetch(`https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?key=${MAPTILER_KEY}&country=gh&limit=1`);
  if (!res.ok) return null;
  const f = (await res.json()).features?.[0];
  return f ? [f.center[1], f.center[0]] : null;
}

// Black pin for the advertiser's own pin picker (matches the brand; Leaflet's default is blue).
export const pinIcon = () =>
  window.L.divIcon({ className: "map-pin", html: "<span></span>", iconSize: [26, 26], iconAnchor: [13, 26] });

// Property page: a shaded circle over the approximate area. There is deliberately no pin.
export function areaMap(el, lat, lng) {
  const map = createMap(el, { center: [lat, lng], zoom: 14, scrollWheelZoom: false });
  window.L.circle([lat, lng], { radius: 900, color: "#0b0b0b", weight: 1.5, fillColor: "#0b0b0b", fillOpacity: 0.12 }).addTo(map);
  return map;
}
