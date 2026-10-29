// Homepage: every property, filtered by category (?cat=). Nothing else.
import { boot, html, params, raw, render } from "../core.js";
import { loadPortfolio } from "../data.js";
import { card } from "../cards.js";

boot();
const commercial = ["commercial", "office", "retail", "warehouse", "mixed_use"];
const CATS = [
  ["all", "All", () => true],
  ["sale", "For sale", (p) => p.purpose === "sale"],
  ["rent", "For rent", (p) => p.purpose === "rent"],
  ["townhouses", "Townhouses", (p) => p.type === "townhouse" || p.type === "house"],
  ["apartments", "Apartments", (p) => p.type === "apartment"],
  ["commercial", "Offices & stores", (p) => commercial.includes(p.type)],
  ["soon", "Coming soon", (p) => p.coming_soon],
];

let all = [];
try {
  all = (await loadPortfolio()).properties ?? [];
} catch {
  render("#results", html`<p class="empty">The properties couldn't be loaded. Please refresh the page.</p>`);
}
const shown = CATS.filter(([key, , test]) => key === "all" || all.some(test));
const current = shown.find(([key]) => key === params().get("cat")) ?? shown[0];

render(
  "#cats",
  shown.map(([key, label, test]) => {
    const n = all.filter(test).length;
    return html`<a class="cat" href="${key === "all" ? "/" : `/?cat=${key}`}" ${raw(key === current[0] ? 'aria-current="page"' : "")}>${label}<span>${n}</span></a>`;
  }),
);

// Listed properties first (featured, then newest), coming-soon ones after.
const rank = (p) => (p.coming_soon ? 2 : p.featured ? 0 : 1);
const rows = all.filter(current[2]).sort((a, b) => rank(a) - rank(b) || String(b.listed ?? "").localeCompare(String(a.listed ?? "")));
document.getElementById("count").textContent = String(rows.length);
const results = document.getElementById("results");
results.removeAttribute("aria-busy");
render(
  results,
  rows.length
    ? rows.map((p, i) => card(p, { eager: i < 3 }))
    : all.length
      ? html`<p class="empty">Nothing in this category yet. <a class="text-link" href="/">See all properties</a></p>`
      : html`<p class="empty">New properties are being prepared. <a class="text-link" href="/contact">Ask us what's coming</a></p>`,
);
