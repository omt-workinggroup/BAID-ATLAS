// Homepage: search, chips, the listings, brochures, what is coming soon, and about. The map has its own page.
import { boot, html, params, raw, render } from "../core.js";
import { filterProperties, loadPortfolio, parseFilters, toQuery, whatsappLink } from "../data.js";
import { booklet, card } from "../cards.js";

boot();
const f = parseFilters(params());
const link = (changes) => `/${toQuery({ ...f, ...changes })}#properties`;

let portfolio = { owner: {}, properties: [] };
try {
  portfolio = await loadPortfolio();
} catch {
  render("#results", html`<p class="empty">The properties couldn't be loaded. Please refresh the page.</p>`);
}
const all = portfolio.properties ?? [];
const owner = portfolio.owner ?? {};

// ---- Search, chips and listings ------------------------------------------------------------------------
const commercial = ["commercial", "office", "retail", "warehouse", "mixed_use"];
const CHIPS = [
  ["All", {}, () => true],
  ["For sale", { purpose: "sale" }, (p) => p.purpose === "sale"],
  ["For rent", { purpose: "rent" }, (p) => p.purpose === "rent"],
  ["Townhouses", { type: "townhouse" }, (p) => p.type === "townhouse"],
  ["Apartments", { type: "apartment" }, (p) => p.type === "apartment"],
  ["Commercial", { type: "commercial" }, (p) => commercial.includes(p.type)],
];
render(
  "#chips",
  CHIPS.filter(([, , test], i) => i === 0 || all.some(test)).map(([label, c]) => {
    const on = (c.purpose ?? undefined) === f.purpose && (c.type ?? undefined) === f.type;
    return html`<a class="chip" href="${link({ purpose: c.purpose, type: c.type, q: undefined })}" ${raw(on ? 'aria-current="true"' : "")}>${label}</a>`;
  }),
);

const form = document.getElementById("search-form");
form.q.value = f.q ?? "";
form.purpose.value = f.purpose ?? "";
form.type.value = f.type ?? "";
form.sort.value = f.sort;
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const d = new FormData(form);
  const v = (k) => String(d.get(k) ?? "").trim() || undefined;
  location.href = `/${toQuery({ q: v("q"), purpose: v("purpose"), type: v("type"), sort: v("sort") })}#properties`;
});
// Phones: the square button shows the other search fields.
const toggle = document.getElementById("filter-toggle");
toggle.addEventListener("click", () => {
  const open = toggle.getAttribute("aria-expanded") !== "true";
  toggle.setAttribute("aria-expanded", String(open));
  form.classList.toggle("is-open", open);
});

// "Commercial" covers offices, stores and warehouses too.
const rows = f.type === "commercial" ? filterProperties(all, { ...f, type: undefined }).filter((p) => commercial.includes(p.type)) : filterProperties(all, f);
const results = document.getElementById("results");
results.removeAttribute("aria-busy");
const filtered = Boolean(f.purpose || f.type || f.q);
if (filtered) document.getElementById("properties-h").textContent = `${rows.length} ${rows.length === 1 ? "property" : "properties"} found`;
if (rows.length) {
  render(results, rows.map((p, i) => card(p, { eager: i < 2 })));
} else if (all.length) {
  render(results, html`<p class="empty">Nothing matches that search. <a class="text-link" href="/#properties">Show all properties</a></p>`);
} else {
  render(results, html`<p class="empty">New properties are being prepared. <a class="text-link" href="/contact">Ask us what's coming</a></p>`);
}
// Unfiltered: a second row by purpose, like the reference's second section.
if (!filtered && all.length > 3) {
  const rent = all.filter((p) => p.purpose === "rent");
  if (rent.length) {
    document.getElementById("more").hidden = false;
    document.getElementById("more-h").textContent = "Homes for Rent";
    render("#more-results", rent.map((p) => card(p)));
  }
}
if (location.hash === "#properties" && filtered) document.getElementById("properties").scrollIntoView();

// ---- About and contact -------------------------------------------------------------------------------
if (owner.tagline) document.querySelector("[data-owner-tagline]").textContent = owner.tagline;
document.getElementById("about-text").textContent = owner.about ?? "";
render("#services", (owner.services ?? []).map((s) => html`<li>${s}</li>`));
const wa = whatsappLink(owner.whatsapp);
render(
  "#cta-links",
  html`${wa ? html`<a class="btn btn--dark" href="${wa}" target="_blank" rel="noopener">Message us on WhatsApp</a>` : ""}
    ${owner.phone ? html`<a class="text-link" href="tel:${owner.phone.replace(/\s/g, "")}">${owner.phone}</a>` : ""}
    ${owner.email ? html`<a class="text-link" href="mailto:${owner.email}">${owner.email}</a>` : ""}`,
);

// ---- Brochures (shown as open booklets) and coming soon ------------------------------------------------
const withBrochure = all.filter((p) => p.brochure?.src);
if (!filtered && withBrochure.length) {
  document.getElementById("brochures").hidden = false;
  render("#booklets", withBrochure.map((p) => booklet(p)));
}
const upcoming = portfolio.upcoming ?? [];
if (!filtered && upcoming.length) {
  document.getElementById("soon").hidden = false;
  render("#soon-list", upcoming.map((u, i) => html`<li class="soon__item" style="--n:${i}"><span class="soon__mark" aria-hidden="true">${u.name.charAt(0)}</span><span><strong>${u.name}</strong><span>${u.note ?? "Details to follow"}</span></span></li>`));
}
