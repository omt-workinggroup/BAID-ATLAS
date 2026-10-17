// Home page: everything is static HTML except the "Latest listings" rail.
import { boot, getUser, render } from "../core.js";
import { latestListings, listingCard, savedIds, skeletonCards, wireSaveButtons } from "../listings.js";

boot();

const rail = document.getElementById("latest-rail");
render(rail, skeletonCards(3));

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
}
