// Amenity icons and the directions function.
import { describe, expect, it, vi } from "vitest";
import { amenitiesOf } from "../../site/js/amenities.js";
import { formatKm } from "../../site/js/data.js";
import { GET } from "../../api/route.mjs";

describe("amenities", () => {
  it("shows an icon only for what a property lists, and keeps the rest as text", () => {
    const a = amenitiesOf({ features: ["Swimming pool", "Borehole", "Boys' quarters", "Fitted kitchen", "CCTV"] });
    expect(a.found.map(([, label]) => label)).toEqual(["Fully Fitted Kitchen", "Backup Water Supply", "Swimming Pool", "24/7 Security & CCTV"]);
    expect(a.other).toEqual(["Boys' quarters"]);
    expect(amenitiesOf({}).found).toEqual([]);
  });
});

describe("distances", () => {
  it("never shows 1000 m", () => {
    expect(formatKm(0.999)).toBe("1.0 km");
    expect(formatKm(0.95)).toBe("950 m");
  });
});

describe("/api/route", () => {
  it("rejects bad points without calling anyone", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const res = await GET(new Request("http://x/api/route?from=abc&to=1,2"));
    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("turns an OpenStreetMap route into time, distance and plain-English turns", async () => {
    const osrm = {
      routes: [
        {
          distance: 2930,
          duration: 443,
          geometry: { type: "LineString", coordinates: [[-0.17, 5.55], [-0.19, 5.57]] },
          legs: [
            {
              steps: [
                { name: "Odwira Road", distance: 179, maneuver: { type: "depart" } },
                { name: "", distance: 50, maneuver: { type: "turn", modifier: "left" } },
                { name: "Oxford Street", distance: 300, maneuver: { type: "roundabout", exit: 2 } },
                { name: "", distance: 0, maneuver: { type: "arrive" } },
              ],
            },
          ],
        },
      ],
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(osrm)));
    const res = await GET(new Request("http://x/api/route?from=-0.17,5.55&to=-0.19,5.57&mode=walk"));
    const body = await res.json();
    expect(fetchSpy.mock.calls[0][0]).toContain("routed-foot");
    expect(body.mode).toBe("walk");
    expect(body.steps.map((s) => s.text)).toEqual(["Head out on Odwira Road", "Turn left", "At the roundabout, take exit 2 onto Oxford Street", "Arrive at the property area"]);
    fetchSpy.mockRestore();
  });
});
