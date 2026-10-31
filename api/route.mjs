// GET /api/route?from=lng,lat&to=lng,lat&mode=drive|walk
// Directions from the visitor to a property, for the map page. Runs on Vercel (not in the browser), so the
// routing key never reaches visitors.
//   - With ORS_API_KEY set in Vercel (a free OpenRouteService key), routes come from OpenRouteService.
//   - Without it, from the free OpenStreetMap routing servers (routing.openstreetmap.de, fair use).
// The answer is the same shape either way: { distance (m), duration (s), geometry (GeoJSON line), steps }.

const ORS = { drive: "driving-car", walk: "foot-walking" };
const OSM = { drive: "routed-car/route/v1/driving", walk: "routed-foot/route/v1/foot" };

function point(v) {
  const [lng, lat] = String(v ?? "").split(",").map(Number);
  return Number.isFinite(lng) && Number.isFinite(lat) && Math.abs(lng) <= 180 && Math.abs(lat) <= 90 ? [lng, lat] : null;
}
const json = (body, status = 200, cache = "public, max-age=600") =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": cache } });

// OSRM gives maneuvers rather than sentences; this writes them out.
function sentence(s) {
  // Unnamed roads are common in Accra; the sentence then just gives the turn.
  const onto = s.name ? ` onto ${s.name}` : "";
  const way = s.maneuver.modifier ? s.maneuver.modifier.replace("slight ", "slightly ").replace("sharp ", "sharp ") : "";
  switch (s.maneuver.type) {
    case "depart":
      return s.name ? `Head out on ${s.name}` : "Head out";
    case "arrive":
      return "Arrive at the property area";
    case "roundabout":
    case "rotary":
      return `At the roundabout, take ${s.maneuver.exit ? `exit ${s.maneuver.exit}` : "the exit"}${onto}`;
    case "continue":
    case "new name":
      return s.name ? `Continue onto ${s.name}` : "Continue straight";
    case "merge":
      return `Merge${onto}`;
    case "fork":
      return `Keep ${way}${onto}`;
    default:
      return way === "straight" ? `Go straight${onto}` : `Turn ${way}${onto}`;
  }
}

async function fromOsm(from, to, mode) {
  const url = `https://routing.openstreetmap.de/${OSM[mode]}/${from.join(",")};${to.join(",")}?overview=full&geometries=geojson&steps=true`;
  const res = await fetch(url, { headers: { "user-agent": "Propertiq (propertiq-gh.vercel.app)" } });
  if (!res.ok) throw new Error(`osm ${res.status}`);
  const r = (await res.json()).routes?.[0];
  if (!r) return null;
  const steps = r.legs.flatMap((l) => l.steps).filter((s) => s.distance > 0 || s.maneuver.type === "arrive");
  return { distance: r.distance, duration: r.duration, geometry: r.geometry, steps: steps.map((s) => ({ text: sentence(s), distance: s.distance })) };
}

async function fromOrs(from, to, mode, key) {
  const res = await fetch(`https://api.openrouteservice.org/v2/directions/${ORS[mode]}/geojson`, {
    method: "POST",
    headers: { authorization: key, "content-type": "application/json" },
    body: JSON.stringify({ coordinates: [from, to], instructions: true }),
  });
  if (!res.ok) throw new Error(`ors ${res.status}`);
  const f = (await res.json()).features?.[0];
  if (!f) return null;
  const sum = f.properties.summary;
  const steps = f.properties.segments.flatMap((s) => s.steps);
  return { distance: sum.distance, duration: sum.duration, geometry: f.geometry, steps: steps.map((s) => ({ text: s.instruction, distance: s.distance })) };
}

export async function GET(request) {
  const q = new URL(request.url).searchParams;
  const from = point(q.get("from"));
  const to = point(q.get("to"));
  const mode = q.get("mode") === "walk" ? "walk" : "drive";
  if (!from || !to) return json({ error: "from and to must be lng,lat" }, 400, "no-store");
  const key = process.env.ORS_API_KEY;
  try {
    const route = (key ? await fromOrs(from, to, mode, key).catch(() => null) : null) ?? (await fromOsm(from, to, mode));
    return route ? json({ mode, ...route }) : json({ error: "No route found" }, 404, "no-store");
  } catch {
    return json({ error: "Directions are unavailable right now" }, 502, "no-store");
  }
}
