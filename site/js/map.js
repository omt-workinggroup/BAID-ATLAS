// Maps: MapLibre GL (vendored, BSD-3) with MapTiler satellite imagery and labels, tilted in 3D.
// Positions in the data file mark the area of a development, not its gate.
import { MAPTILER_KEY } from "./config.js";

export const STYLES = { satellite: "hybrid", map: "streets-v2" };
const styleUrl = (name) => `https://api.maptiler.com/maps/${STYLES[name] ?? name}/style.json?key=${MAPTILER_KEY}`;
export const ACCRA = [-0.187, 5.6037];

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
// are fetched. No fading or flying anywhere.
export function createMap(el, { center = ACCRA, zoom = 11, pitch = 0, bearing = 0, bounds, padding, maxZoom, style = "satellite", cooperative = false, controls = "bottom-right" } = {}) {
  const gl = window.maplibregl;
  const map = new gl.Map({
    container: el,
    style: styleUrl(style),
    center,
    zoom,
    pitch,
    bearing,
    ...(bounds ? { bounds, fitBoundsOptions: { padding, maxZoom } } : {}),
    maxPitch: 75,
    attributionControl: { compact: true },
    cooperativeGestures: cooperative,
    fadeDuration: 0,
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    refreshExpiredTiles: false,
  });
  map._pqStyle = style;
  map.on("style.load", () => map._pqStyle === "map" && siteColours(map));
  map.addControl(new gl.NavigationControl({ visualizePitch: true }), controls);
  map.addControl(new gl.FullscreenControl(), controls);
  return map;
}

// Switches between satellite and street map; custom layers are added back by the caller's "style.load".
export function setStyle(map, name) {
  map._pqStyle = name;
  map.setStyle(styleUrl(name));
}

// Recolours the street map in black and white: light grey land, grey water and parks, pale buildings,
// white streets with darker main roads, dark labels in one font, and no shop icons.
function siteColours(map) {
  const set = (id, prop, value) => {
    try {
      map.setPaintProperty(id, prop, value);
    } catch {
      /* a layer without that property */
    }
  };
  for (const { id, type, "source-layer": source } of map.getStyle().layers) {
    const n = id.toLowerCase();
    if (type === "background") set(id, "background-color", "#f2f2f2");
    else if (type === "fill") set(id, "fill-color", /water|ocean|sea|lake/.test(n) ? "#d6d6d6" : /building/.test(n) ? "#e2e2e2" : /park|grass|wood|forest|green/.test(n) ? "#e9e9e9" : "#eeeeee");
    else if (type === "fill-extrusion") set(id, "fill-extrusion-color", "#dcdcdc");
    else if (type === "line") {
      if (/water|river|stream|canal/.test(n)) set(id, "line-color", "#cfcfcf");
      else if (/motorway|trunk|primary|highway|major/.test(n)) set(id, "line-color", "#bdbdbd");
      else if (/boundary|admin/.test(n)) set(id, "line-color", "#c4c4c4");
      else set(id, "line-color", "#ffffff");
    } else if (type === "symbol") {
      // Shop, bus-stop and similar icons are hidden; street and area names stay.
      if (/poi|transit|bus|station/.test(n) || /poi|transit|aerodrome/.test(source ?? "")) {
        map.setLayoutProperty(id, "visibility", "none");
        continue;
      }
      // Every label in one font, so the map fetches one set of letter shapes instead of five.
      if (map.getLayoutProperty(id, "text-field") != null) map.setLayoutProperty(id, "text-font", ["Roboto Regular", "Noto Sans Regular"]);
      set(id, "text-color", "#444444");
      set(id, "text-halo-color", "#ffffff");
      set(id, "icon-opacity", 0.6);
    }
  }
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
