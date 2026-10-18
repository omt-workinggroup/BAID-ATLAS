// Home page: everything is static HTML except the "Recently added" grid (real published listings only).
import { boot, getUser, render } from "../core.js";
import { latestListings, listingCard, savedIds, skeletonCards, toQueryString, wireSaveButtons } from "../listings.js";
import { wireCompareButtons } from "../compare.js";

boot();
// Send only the fields that were filled in, so links stay clean and shareable.
document.querySelector(".home-search")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const d = new FormData(e.currentTarget);
  location.href = `/explore${toQueryString({ q: String(d.get("q") ?? "").trim() || undefined, purpose: d.get("purpose") || undefined, type: d.get("type") || undefined })}`;
});

const rail = document.getElementById("latest-rail");
render(rail, skeletonCards(4));

const user = await getUser();
if (!user) document.querySelectorAll("[data-provider-link]").forEach((a) => (a.href = "/sign-up"));

const rows = await latestListings(8).catch(() => []);
if (rows.length === 0) {
  document.getElementById("latest").hidden = true;
  document.getElementById("latest-empty").hidden = false;
} else {
  const saved = await savedIds(rows.map((r) => r.id));
  render(rail, rows.map((l, i) => listingCard(l, { saved: saved.has(l.id), eager: i < 2 })));
  rail.removeAttribute("aria-busy");
  wireSaveButtons(rail);
  wireCompareButtons(rail);
}
