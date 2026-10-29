// Saved properties: the hearts tapped on this device (no account, nothing sent anywhere).
import { boot, html, icon, render, savedSlugs, wireSaveButtons } from "../core.js";
import { loadPortfolio } from "../data.js";
import { propertyCard } from "../cards.js";

boot();
const grid = document.getElementById("results");
const all = (await loadPortfolio().catch(() => ({ properties: [] }))).properties ?? [];
const saved = savedSlugs();
const rows = all.filter((p) => saved.includes(p.slug));
grid.removeAttribute("aria-busy");
if (rows.length) {
  render(grid, rows.map((p) => propertyCard(p)));
  wireSaveButtons(grid);
} else {
  render(grid, html`<div class="empty" style="grid-column: 1 / -1">${icon("heart", 36, 1.3)}<h2>Nothing saved yet</h2><p>Tap the heart on a property to keep it here.</p><a class="btn" href="/properties">See all properties</a></div>`);
}
