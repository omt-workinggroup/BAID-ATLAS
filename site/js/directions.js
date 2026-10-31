// Directions on the map page: the road route from the visitor to a property, from /api/route (OpenRouteService
// or the OpenStreetMap routing servers), drawn on the map with time, distance and each turn. Google Maps
// takes over for turn-by-turn navigation while driving.
import { html, icon, render } from "./core.js";
import { locate } from "./here.js";

const panel = () => document.getElementById("route");
let state = null;

export const routeOpen = () => Boolean(state);
const mins = (s) => (s < 3600 ? `${Math.max(1, Math.round(s / 60))} min` : `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`);
const dist = (m) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`);
const google = (p, from, mode) =>
  `https://www.google.com/maps/dir/?api=1${from ? `&origin=${from[1]},${from[0]}` : ""}&destination=${p.location.lat},${p.location.lng}&travelmode=${mode === "walk" ? "walking" : "driving"}`;

function head(p, mode) {
  return html`<header class="route__head">
      <div class="route__ends">
        <span class="route__dot"></span><span>Your location</span>
        <span class="route__line" aria-hidden="true"></span><span></span>
        <span class="route__dot route__dot--to"></span><strong>${p.title}</strong>
      </div>
      <button type="button" class="round round--soft" data-route-close aria-label="Close directions">${icon("close", 18, 2)}</button>
    </header>
    <div class="route__modes" role="group" aria-label="Travel by">
      <button type="button" data-route-mode="drive" aria-pressed="${mode === "drive" ? "true" : "false"}">${icon("car", 16)}Drive</button>
      <button type="button" data-route-mode="walk" aria-pressed="${mode === "walk" ? "true" : "false"}">${icon("walk", 16)}Walk</button>
    </div>`;
}

function clearLine(map) {
  if (map.getLayer("route")) map.removeLayer("route");
  if (map.getLayer("route-casing")) map.removeLayer("route-casing");
  if (map.getSource("route")) map.removeSource("route");
}
function drawLine() {
  const { map, route } = state ?? {};
  if (!route) return;
  // Before the map has finished loading, draw once it has.
  if (!map.isStyleLoaded()) return void map.once("idle", drawLine);
  clearLine(map);
  map.addSource("route", { type: "geojson", data: { type: "Feature", geometry: route.geometry, properties: {} } });
  map.addLayer({ id: "route-casing", type: "line", source: "route", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ffffff", "line-width": 9 } });
  map.addLayer({ id: "route", type: "line", source: "route", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#111111", "line-width": 5, ...(state.mode === "walk" ? { "line-dasharray": [0.4, 1.6] } : {}) } });
}

export function closeRoute() {
  if (!state) return;
  clearLine(state.map);
  state.map.off("style.load", drawLine);
  state = null;
  panel().hidden = true;
  document.querySelector(".mapx")?.classList.remove("is-routing");
}

async function load() {
  const { p, mode, from, map, gl, padding, owner } = state;
  const box = panel();
  render(box, html`${head(p, mode)}<p class="route__status">Finding the best route…</p>`);
  let route;
  try {
    const res = await fetch(`/api/route?from=${from.join(",")}&to=${p.location.lng},${p.location.lat}&mode=${mode}`);
    if (!res.ok) throw new Error();
    route = await res.json();
  } catch {
    if (!state) return;
    render(
      box,
      html`${head(p, mode)}<p class="route__status">Directions couldn't load just now. Google Maps can take you there instead.</p>
        <div class="route__actions"><a class="btn btn--dark" href="${google(p, from, mode)}" target="_blank" rel="noopener">${icon("arrow", 16)}Open in Google Maps</a></div>`,
    );
    return;
  }
  if (!state || state.p !== p || state.mode !== mode) return;
  state.route = route;
  drawLine();
  const b = new gl.LngLatBounds();
  route.geometry.coordinates.forEach((c) => b.extend(c));
  const wide = matchMedia("(min-width: 900px)").matches;
  map.fitBounds(b, { padding: wide ? { top: 90, bottom: 60, left: 80, right: 440 } : { ...padding, top: 60, bottom: Math.round(innerHeight * 0.5) }, maxZoom: 16.5, pitch: 0, bearing: 0, animate: false });
  const tel = owner.phone ? `tel:${owner.phone.replace(/\s/g, "")}` : null;
  render(
    box,
    html`${head(p, mode)}
      <p class="route__eta"><strong>${mins(route.duration)}</strong><span>${dist(route.distance)} ${mode === "walk" ? "on foot" : "by road"}${mode === "drive" ? " · traffic not included" : ""}</span></p>
      <ol class="route__steps">${route.steps.map((s) => html`<li>${icon(s.text.startsWith("Arrive") ? "pin" : "turn", 16)}<span>${s.text}</span>${s.distance ? html`<b>${dist(s.distance)}</b>` : ""}</li>`)}</ol>
      <p class="fineprint">The route ends at the neighbourhood; the exact address is shared when you book a viewing.</p>
      <div class="route__actions">
        <a class="btn btn--line-dark" href="${google(p, from, mode)}" target="_blank" rel="noopener">${icon("arrow", 16)}Google Maps</a>
        ${tel ? html`<a class="btn btn--dark" href="${tel}">${icon("phone", 16)}Call on the way</a>` : ""}
      </div>`,
  );
}

// Opens the panel for property p. Asks for the visitor's location first if the page doesn't have it yet.
export async function openRoute({ map, gl, p, owner, here, setHere, mode, padding }) {
  const box = panel();
  state = { map, gl, p, owner, padding, setHere, mode: mode ?? state?.mode ?? "drive", from: here(), route: null };
  box.hidden = false;
  document.querySelector(".mapx")?.classList.add("is-routing");
  map.off("style.load", drawLine);
  map.on("style.load", drawLine);
  if (!state.from) {
    render(box, html`${head(p, state.mode)}<p class="route__status">Finding you…</p>`);
    try {
      state.from = await locate();
      setHere(state.from);
    } catch {
      if (!state) return;
      render(
        box,
        html`${head(p, state.mode)}<p class="route__status">Directions start from where you are. Allow location for this site and try again, or let Google Maps find you.</p>
          <div class="route__actions"><button type="button" class="btn btn--dark" data-route-retry>${icon("locate", 16)}Try again</button><a class="btn btn--line-dark" href="${google(p, null, state.mode)}" target="_blank" rel="noopener">Google Maps</a></div>`,
      );
      return;
    }
  }
  await load();
}

document.addEventListener("click", (e) => {
  if (!state) return;
  if (e.target.closest("[data-route-close]")) return closeRoute();
  const m = e.target.closest("[data-route-mode]");
  if (m && m.dataset.routeMode !== state.mode) {
    state.mode = m.dataset.routeMode;
    return load();
  }
  if (e.target.closest("[data-route-retry]")) {
    const { map, gl, p, owner, padding, mode, setHere } = state;
    state = null;
    openRoute({ map, gl, p, owner, padding, mode, setHere, here: () => null });
  }
});
