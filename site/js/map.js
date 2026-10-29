// Maps: MapLibre GL (vendored, BSD-3) with MapTiler satellite imagery and labels, tilted in 3D.
// Positions in the data file mark the area of a development, not its gate.
import { MAPTILER_KEY } from "./config.js";

export const STYLES = { satellite: "hybrid", map: "streets-v2-dark" };
const styleUrl = (name) => `https://api.maptiler.com/maps/${STYLES[name] ?? name}/style.json?key=${MAPTILER_KEY}`;
export const ACCRA = [-0.187, 5.6037];
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

let loading = null;
export function loadMapLibre() {
  if (!document.querySelector('link[href="/css/maplibre-gl.css"]')) {
    document.head.append(Object.assign(document.createElement("link"), { rel: "stylesheet", href: "/css/maplibre-gl.css" }));
  }
  loading ??= new Promise((ok, fail) => {
    document.head.append(Object.assign(document.createElement("script"), { src: "/js/vendor/maplibre-gl.js", onload: ok, onerror: fail }));
  });
  return loading;
}

export const hasPosition = (p) => typeof p.location?.lat === "number" && typeof p.location?.lng === "number";
export const lngLat = (p) => [p.location.lng, p.location.lat];

export function createMap(el, { center = ACCRA, zoom = 11, pitch = 0, bearing = 0, style = "satellite", cooperative = false, controls = "bottom-right" } = {}) {
  const gl = window.maplibregl;
  const map = new gl.Map({
    container: el,
    style: styleUrl(style),
    center,
    zoom,
    pitch,
    bearing,
    maxPitch: 75,
    attributionControl: { compact: true },
    cooperativeGestures: cooperative,
    fadeDuration: 200,
  });
  map._pqStyle = style;
  map.on("style.load", () => map._pqStyle === "map" && blackAndGold(map));
  map.addControl(new gl.NavigationControl({ visualizePitch: true }), controls);
  map.addControl(new gl.FullscreenControl(), controls);
  return map;
}

// Switches between satellite and street map; custom layers are added back by the caller's "style.load".
export function setStyle(map, name) {
  map._pqStyle = name;
  map.setStyle(styleUrl(name));
}

// Recolours the dark street map to the site's black and gold: black land, near-black water, dark
// buildings, quiet grey streets with the main roads in muted gold, warm grey labels, and no shop icons.
function blackAndGold(map) {
  const set = (id, prop, value) => {
    try {
      map.setPaintProperty(id, prop, value);
    } catch {
      /* a layer without that property */
    }
  };
  for (const { id, type } of map.getStyle().layers) {
    const n = id.toLowerCase();
    if (type === "background") set(id, "background-color", "#0a0a0a");
    else if (type === "fill") set(id, "fill-color", /water|ocean|sea|lake/.test(n) ? "#0d0f10" : /building/.test(n) ? "#1b1a17" : /park|grass|wood|forest|green/.test(n) ? "#101210" : "#111111");
    else if (type === "fill-extrusion") set(id, "fill-extrusion-color", "#1e1c18");
    else if (type === "line") {
      if (/water|river|stream|canal/.test(n)) set(id, "line-color", "#14171a");
      else if (/motorway|trunk|primary|highway|major/.test(n)) set(id, "line-color", "#6e5a2e");
      else if (/boundary|admin/.test(n)) set(id, "line-color", "#3a352c");
      else set(id, "line-color", "#2a2824");
    } else if (type === "symbol") {
      // Shop, bus-stop and similar icons are hidden; street and area names stay.
      if (/poi|transit|bus|station/.test(n)) {
        map.setLayoutProperty(id, "visibility", "none");
        continue;
      }
      set(id, "text-color", "#a39c8e");
      set(id, "text-halo-color", "#000000");
      set(id, "icon-opacity", 0.6);
    }
  }
}

// A slow orbit around the current centre, until someone touches the map.
export function orbit(map) {
  if (calm) return () => {};
  let on = true;
  const step = () => {
    if (!on) return;
    if (!map.isMoving()) map.setBearing(map.getBearing() + 0.06);
    requestAnimationFrame(step);
  };
  const stop = () => (on = false);
  ["mousedown", "touchstart", "wheel", "dragstart"].forEach((ev) => map.on(ev, stop));
  requestAnimationFrame(step);
  return stop;
}

export function flyToProperty(map, p, { zoom = 16.4 } = {}) {
  map.flyTo({ center: lngLat(p), zoom, pitch: 62, bearing: map.getBearing() - 25, duration: calm ? 0 : 3200, essential: true, curve: 1.6 });
}

// A soft circle (about 450 m) over the area, drawn as a GeoJSON polygon.
export function areaCircle([lng, lat], radiusM = 450, steps = 64) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    const dx = (radiusM * Math.cos(a)) / (111320 * Math.cos((lat * Math.PI) / 180));
    const dy = (radiusM * Math.sin(a)) / 110540;
    pts.push([lng + dx, lat + dy]);
  }
  return { type: "Feature", geometry: { type: "Polygon", coordinates: [pts] }, properties: {} };
}

export function addArea(map, center) {
  const add = () => {
    if (map.getSource("area")) return;
    map.addSource("area", { type: "geojson", data: areaCircle(center) });
    map.addLayer({ id: "area-fill", type: "fill", source: "area", paint: { "fill-color": "#c9a14a", "fill-opacity": 0.16 } });
    map.addLayer({ id: "area-line", type: "line", source: "area", paint: { "line-color": "#c9a14a", "line-width": 2, "line-dasharray": [2, 2] } });
  };
  if (map.isStyleLoaded()) add();
  map.on("style.load", add);
}
