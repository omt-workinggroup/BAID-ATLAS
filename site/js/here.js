// The visitor's location, used only to show how far they are from the properties and the office. The
// browser asks the visitor first. The position stays in this browser tab (for 10 minutes) and is never
// sent to us or anyone else; distances are worked out on the page.
import { distanceKm, formatKm } from "./data.js";

const KEY = "pq-here";
const FRESH = 10 * 60 * 1000;

// A position found earlier in this tab, if it is still fresh.
export function remembered() {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY));
    if (v && Date.now() - v.t < FRESH) return [v.lng, v.lat];
  } catch {
    /* storage unavailable */
  }
  return null;
}

async function allowed() {
  try {
    return (await navigator.permissions?.query({ name: "geolocation" }))?.state === "granted";
  } catch {
    return false;
  }
}

// Asks the browser (which shows its permission prompt the first time). Resolves to [lng, lat].
export function locate() {
  return new Promise((ok, fail) => {
    if (!navigator.geolocation) return fail(new Error("This browser can't share its location."));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const at = [pos.coords.longitude, pos.coords.latitude];
        try {
          sessionStorage.setItem(KEY, JSON.stringify({ lng: at[0], lat: at[1], t: Date.now() }));
        } catch {
          /* storage unavailable */
        }
        ok(at);
      },
      () => fail(new Error("Location wasn't shared.")),
      { timeout: 10000, maximumAge: 300000 },
    );
  });
}

// Without a prompt: the remembered position, or a fresh one if the visitor has already allowed it.
export async function quietly() {
  return remembered() ?? ((await allowed()) ? locate().catch(() => null) : null);
}

export const awayFrom = (here, [lng, lat]) => formatKm(distanceKm(here, [lng, lat]));
