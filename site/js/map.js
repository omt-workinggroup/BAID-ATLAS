// Maps: MapLibre GL (vendored, BSD-3). Street map: OpenFreeMap (free, no key) recoloured in black and white.
// Satellite: aerial imagery from the provider in config.js (Esri World Imagery by default) as a raster layer
// under OpenFreeMap's labels ("hybrid"), or on its own ("satellite"). Positions in the data file mark the
// area of a development, not its gate.
import { IMAGERY, STREET_STYLE } from "./config.js";

export const STYLES = ["hybrid", "satellite", "map"];
export const STYLE_NAMES = { map: "Map", satellite: "Satellite", hybrid: "Hybrid" };
export const ACCRA = [-0.187, 5.6037];

// The street style is fetched once and turned into the three looks locally, so switching costs no request.
let base = null;
const streets = () => (base ??= fetch(STREET_STYLE).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`style ${r.status}`)))));
export async function styleFor(name) {
  const s = structuredClone(await streets());
  const layers = [];
  for (const l of s.layers) {
    const n = l.id;
    // Shop and bus-stop icons and one-way arrows add clutter in every look.
    if (/^poi|one_way|shield/.test(n) || n === "airport") continue;
    if (name === "map") {
      layers.push(greyscale(l));
      continue;
    }
    if (l.type !== "symbol") continue;
    if (name === "satellite") continue;
    // Hybrid: names in white with a dark outline, readable over photos.
    layers.push({ ...l, paint: { ...l.paint, "text-color": "#ffffff", "text-halo-color": "rgba(0,0,0,0.85)", "text-halo-width": 1.4 } });
  }
  if (name !== "map") {
    s.sources.imagery = { type: "raster", tiles: IMAGERY.tiles, tileSize: 256, maxzoom: IMAGERY.maxzoom, attribution: IMAGERY.attribution };
    layers.unshift({ id: "background", type: "background", paint: { "background-color": "#1d2219" } }, { id: "imagery", type: "raster", source: "imagery", paint: { "raster-fade-duration": 0 } });
  }
  s.layers = layers;
  return s;
}

// Black and white: light grey land, grey water and parks, pale buildings, white streets with darker main
// roads, and dark labels.
function greyscale(l) {
  const n = l.id;
  const paint = { ...l.paint };
  if (l.type === "background") paint["background-color"] = "#f2f2f2";
  else if (l.type === "fill") paint["fill-color"] = /water/.test(n) ? "#d6d6d6" : /building/.test(n) ? "#e2e2e2" : /park|wood|grass|wetland|pitch|cemetery/.test(n) ? "#e9e9e9" : "#eeeeee";
  else if (l.type === "fill-extrusion") paint["fill-extrusion-color"] = "#dcdcdc";
  else if (l.type === "line") paint["line-color"] = /water/.test(n) ? "#cfcfcf" : /motorway|trunk|primary/.test(n) && !/casing/.test(n) ? "#bdbdbd" : /boundary/.test(n) ? "#c4c4c4" : /casing/.test(n) ? "#dddddd" : /rail/.test(n) ? "#cccccc" : "#ffffff";
  else if (l.type === "symbol") Object.assign(paint, { "text-color": "#444444", "text-halo-color": "#ffffff" });
  else if (l.type === "raster") return { ...l, layout: { ...l.layout, visibility: "none" } };
  return { ...l, paint };
}

let loading = null;
export function loadMapLibre() {
  if (!document.querySelector('link[rel="stylesheet"][href="/css/maplibre-gl.css"]')) {
    document.head.append(Object.assign(document.createElement("link"), { rel: "stylesheet", href: "/css/maplibre-gl.css" }));
  }
  loading ??= new Promise((ok, fail) => {
    document.head.append(Object.assign(document.createElement("script"), { src: "/js/vendor/maplibre-gl.js", onload: ok, onerror: fail }));
  });
  return loading;
}

export const hasPosition = (p) => typeof p.location?.lat === "number" && typeof p.location?.lng === "number";
export const lngLat = (p) => [p.location.lng, p.location.lat];

// Opens straight on its final view (a centre and zoom, or bounds to fit), so only the tiles for that view
// are fetched. No fading or flying anywhere. If the aerial imagery fails to load, the map falls back to the
// street map and calls onImageryFail.
export async function createMap(el, { center = ACCRA, zoom = 11, pitch = 0, bearing = 0, bounds, padding, maxZoom, style = "hybrid", cooperative = false, controls = "bottom-right", onImageryFail } = {}) {
  const gl = window.maplibregl;
  const map = new gl.Map({
    container: el,
    style: await styleFor(style),
    center,
    zoom,
    pitch,
    bearing,
    ...(bounds ? { bounds, fitBoundsOptions: { padding, maxZoom } } : {}),
    maxZoom: 19,
    maxPitch: 75,
    attributionControl: { compact: true },
    cooperativeGestures: cooperative,
    fadeDuration: 0,
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    refreshExpiredTiles: false,
  });
  map._pqStyle = style;
  // The map credit starts folded into its small "i" button, so it doesn't cover the picture.
  map.once("load", () => el.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show"));
  map.addControl(new gl.NavigationControl({ visualizePitch: true }), controls);
  map.addControl(new gl.FullscreenControl(), controls);
  // Imagery that keeps failing (provider down, blocked) gives way to the street map once.
  let failed = 0;
  let loaded = false;
  map.on("sourcedata", (e) => e.sourceId === "imagery" && e.tile && (loaded = true));
  map.on("error", (e) => {
    if (e.sourceId !== "imagery" || loaded || map._pqStyle === "map") return;
    if (++failed === 6) {
      setStyle(map, "map");
      onImageryFail?.();
    }
  });
  return map;
}

// Switches look; the camera stays where it is. Custom layers are added back by the caller's "style.load".
export async function setStyle(map, name) {
  map._pqStyle = name;
  // diff: false so "style.load" fires and pages can add their own layers back.
  map.setStyle(await styleFor(name), { diff: false });
}

// Moves straight to a property, tilted a little to show the buildings.
export function showProperty(map, p, { zoom = 15.6 } = {}) {
  map.jumpTo({ center: lngLat(p), zoom, pitch: 45 });
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
    map.addLayer({ id: "area-fill", type: "fill", source: "area", paint: { "fill-color": "#111111", "fill-opacity": 0.1 } });
    map.addLayer({ id: "area-line", type: "line", source: "area", paint: { "line-color": "#ffffff", "line-width": 2.5, "line-dasharray": [2, 2] } });
  };
  if (map.isStyleLoaded()) add();
  map.on("style.load", add);
}
