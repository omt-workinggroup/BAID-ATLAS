// Homepage: every property, with a search bar (suggests areas and properties as you type), filters (price,
// bedrooms, sort) and categories (?cat=). The address bar keeps the search, so a result can be shared:
// /?q=ridge&cat=sale&beds=3&max=1000000&sort=price-asc
import { boot, html, icon, params, raw, render, toast } from "../core.js";
import { contactFor, formatPrice, loadPortfolio, place, small } from "../data.js";
import { card } from "../cards.js";
import { wireCollect } from "../collect.js";
import { awayFrom, locate, quietly } from "../here.js";
import { saved } from "../store.js";

boot();
wireCollect();
const commercial = ["commercial", "office", "retail", "warehouse", "mixed_use"];
const CATS = [
  ["all", "All", () => true],
  ["saved", "Saved", (p) => saved().includes(p.slug)],
  ["sale", "For sale", (p) => p.purpose === "sale"],
  ["rent", "For rent", (p) => p.purpose === "rent"],
  ["townhouses", "Townhouses", (p) => p.type === "townhouse" || p.type === "house"],
  ["apartments", "Apartments", (p) => p.type === "apartment"],
  ["commercial", "Offices & stores", (p) => commercial.includes(p.type)],
  ["soon", "Coming soon", (p) => p.coming_soon],
];
const SORTS = [
  ["", "Recommended"],
  ["price-asc", "Price: low to high"],
  ["price-desc", "Price: high to low"],
  ["near", "Nearest to me"],
];

let portfolio = { properties: [] };
try {
  portfolio = await loadPortfolio();
} catch {
  render("#results", html`<p class="empty">The properties couldn't be loaded. Please refresh the page.</p>`);
}
const all = portfolio.properties ?? [];
const owner = portfolio.owner ?? {};
const placed = (p) => typeof p.location?.lat === "number" && typeof p.location?.lng === "number";
// "Studio–2" counts as 2 bedrooms; a number counts as itself.
const bedsOf = (p) => (typeof p.bedrooms === "number" ? p.bedrooms : Math.max(0, ...String(p.bedrooms ?? "").match(/\d+/g)?.map(Number) ?? [0]));
const words = (p) => [p.title, place(p), p.location?.region, p.summary].filter(Boolean).join(" ").toLowerCase();

const state = {
  q: params().get("q") ?? "",
  cat: params().get("cat") ?? "all",
  beds: Number(params().get("beds")) || 0,
  max: Number(params().get("max")) || 0,
  sort: params().get("sort") ?? "",
  by: params().get("by") ?? "",
};
let here = null;

function matches(p) {
  if (state.by && (p.listed_by ?? owner.name) !== state.by) return false;
  if (state.q && !state.q.toLowerCase().split(/\s+/).every((w) => words(p).includes(w))) return false;
  if (state.beds && bedsOf(p) < state.beds) return false;
  // A price on request can't be compared, so it stays in when a maximum is set.
  if (state.max && p.price?.amount != null && Number(p.price.amount) > state.max) return false;
  return true;
}
const rank = (p) => (p.coming_soon ? 2 : p.featured ? 0 : 1);
// Coming-soon properties always come last, whatever the sort.
function sorted(rows) {
  const soon = rows.filter((p) => p.coming_soon);
  return [...sortedNow(rows.filter((p) => !p.coming_soon)), ...soon];
}
function sortedNow(rows) {
  const price = (p) => (p.price?.amount != null ? Number(p.price.amount) : null);
  const by = {
    "price-asc": (a, b) => (price(a) ?? Infinity) - (price(b) ?? Infinity),
    "price-desc": (a, b) => (price(b) ?? -Infinity) - (price(a) ?? -Infinity),
    near: (a, b) => (placed(a) && here ? km(a) : Infinity) - (placed(b) && here ? km(b) : Infinity),
  }[state.sort];
  return rows.sort(by ?? ((a, b) => rank(a) - rank(b) || String(b.listed ?? "").localeCompare(String(a.listed ?? ""))));
}
const km = (p) => {
  const [lng, lat] = here;
  const r = (d) => (d * Math.PI) / 180;
  const h = Math.sin(r(p.location.lat - lat) / 2) ** 2 + Math.cos(r(lat)) * Math.cos(r(p.location.lat)) * Math.sin(r(p.location.lng - lng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

function toUrl() {
  const q = new URLSearchParams();
  if (state.q) q.set("q", state.q);
  if (state.cat !== "all") q.set("cat", state.cat);
  if (state.beds) q.set("beds", state.beds);
  if (state.max) q.set("max", state.max);
  if (state.sort) q.set("sort", state.sort);
  if (state.by) q.set("by", state.by);
  history.replaceState(null, "", q.size ? `/?${q}` : "/");
}

const results = document.getElementById("results");
function draw() {
  const pool = all.filter(matches);
  const shown = CATS.filter(([key, , test]) => key === "all" || key === state.cat || all.some(test));
  const current = shown.find(([key]) => key === state.cat) ?? shown[0];
  state.cat = current[0];
  render(
    "#cats",
    shown.map(([key, label, test]) => html`<a class="cat" href="${key === "all" ? "/" : `/?cat=${key}`}" data-cat="${key}" ${raw(key === current[0] ? 'aria-current="page"' : "")}>${key === "saved" ? icon("heart", 15, 1.8) : ""}${label}<span>${pool.filter(test).length}</span></a>`),
  );
  const rows = sorted(pool.filter(current[2]));
  document.getElementById("count").textContent = String(rows.length);
  const filters = [state.by && `listed by ${state.by}`, state.q && `“${state.q}”`, state.beds && `${state.beds}+ beds`, state.max && `up to ${formatPrice({ amount: state.max, currency: "USD" })}`].filter(Boolean);
  render(
    "#summary",
    filters.length ? html`<span>${rows.length} ${rows.length === 1 ? "result" : "results"} for ${filters.join(", ")}</span><button type="button" class="text-link" data-reset>Clear search</button>` : "",
  );
  document.getElementById("filter-dot").hidden = !(state.beds || state.max || state.sort);
  results.removeAttribute("aria-busy");
  render(
    results,
    rows.length
      ? rows.map((p, i) => card(p, { eager: i < 3, owner: contactFor(p, portfolio), away: here && placed(p) ? awayFrom(here, [p.location.lng, p.location.lat]) : null }))
      : state.cat === "saved"
        ? html`<p class="empty">Nothing saved yet. Tap the heart on any property to keep it here.</p>`
        : all.length
          ? html`<p class="empty">No properties match. <button type="button" class="text-link" data-reset>Clear the search</button> or <a class="text-link" href="/agents">ask the team</a>.</p>`
          : html`<p class="empty">New properties are being prepared. <a class="text-link" href="/agents">Ask us what's coming</a></p>`,
  );
  toUrl();
}

// ---- Search box and suggestions ------------------------------------------------------------------------
const box = document.getElementById("q");
const list = document.getElementById("suggest");
box.value = state.q;
function suggest() {
  const q = box.value.trim().toLowerCase();
  if (!q) return closeSuggest();
  const areas = [...new Set(all.map(place).filter(Boolean))].filter((a) => a.toLowerCase().includes(q)).slice(0, 4);
  const props = all.filter((p) => p.title.toLowerCase().includes(q) || place(p).toLowerCase().includes(q)).slice(0, 5);
  if (!areas.length && !props.length) {
    render(list, html`<p class="suggest__none">No area or property called “${box.value.trim()}” yet. Press Enter to search anyway.</p>`);
  } else {
    render(
      list,
      html`${areas.length ? html`<p class="suggest__h">Areas</p>${areas.map((a) => html`<button type="button" role="option" class="suggest__row" data-area="${a.split(",")[0]}">${icon("pin", 18)}<span>${a}</span><small>${all.filter((p) => place(p) === a).length} ${all.filter((p) => place(p) === a).length === 1 ? "property" : "properties"}</small></button>`)}` : ""}
        ${props.length ? html`<p class="suggest__h">Properties</p>${props.map((p) => html`<a role="option" class="suggest__row" href="/properties/${p.slug}">${p.photos?.[0] ? html`<img src="${small(p.photos[0])}" alt="" />` : html`<span class="suggest__mono">${p.title[0]}</span>`}<span>${p.title}</span><small>${p.location?.area ?? (p.coming_soon ? "Coming soon" : "")}</small></a>`)}` : ""}`,
    );
  }
  list.hidden = false;
  box.setAttribute("aria-expanded", "true");
}
function closeSuggest() {
  list.hidden = true;
  box.setAttribute("aria-expanded", "false");
}
box.addEventListener("input", suggest);
box.addEventListener("focus", suggest);
document.getElementById("search").addEventListener("submit", (e) => {
  e.preventDefault();
  state.q = box.value.trim();
  closeSuggest();
  box.blur();
  draw();
});
list.addEventListener("click", (e) => {
  const a = e.target.closest("[data-area]");
  if (!a) return;
  box.value = state.q = a.dataset.area;
  closeSuggest();
  draw();
});
document.addEventListener("click", (e) => !e.target.closest("#search") && closeSuggest());
box.addEventListener("keydown", (e) => e.key === "Escape" && closeSuggest());

// ---- Filters sheet --------------------------------------------------------------------------------------
const sheet = document.getElementById("filters");
function openFilters() {
  render(
    sheet,
    html`<form class="sheet__panel" method="dialog" id="filter-form">
      <div class="sheet__grip" aria-hidden="true"></div>
      <header class="sheet__head"><div><h2 id="filters-h">Filters</h2><p>Narrow the list down</p></div><button type="button" class="round round--soft" data-close-sheet aria-label="Close">${icon("close", 18, 2)}</button></header>
      <fieldset class="pick"><legend>Bedrooms</legend><div class="seg">${[0, 1, 2, 3, 4, 5].map((n) => html`<label class="slot"><input type="radio" name="beds" value="${n}" ${n === state.beds ? html`checked` : ""} /><span><b>${n ? `${n}+` : "Any"}</b></span></label>`)}</div></fieldset>
      <label class="field"><span>Maximum price (USD) <em>Optional</em></span><input name="max" type="number" inputmode="numeric" min="0" step="10000" placeholder="e.g. 1000000" value="${state.max || ""}" /></label>
      <fieldset class="pick"><legend>Sort by</legend><div class="seg seg--2">${SORTS.map(([v, l]) => html`<label class="slot"><input type="radio" name="sort" value="${v}" ${v === state.sort ? html`checked` : ""} /><span><b>${l}</b></span></label>`)}</div></fieldset>
      <p class="fineprint">Prices on request stay in the list when a maximum is set.</p>
      <div class="sheet__actions"><button type="button" class="btn btn--line-dark" data-reset>Reset</button><button type="submit" class="btn btn--dark">Show results</button></div>
    </form>`,
  );
  sheet.showModal();
}
document.getElementById("open-filters").addEventListener("click", openFilters);
sheet.addEventListener("click", (e) => (e.target === sheet || e.target.closest("[data-close-sheet]")) && sheet.close());
sheet.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  state.beds = Number(f.get("beds")) || 0;
  state.max = Number(f.get("max")) || 0;
  state.sort = String(f.get("sort") ?? "");
  sheet.close();
  if (state.sort === "near" && !here) await findMe();
  draw();
});

document.addEventListener("click", (e) => {
  if (e.target.closest("[data-reset]")) {
    Object.assign(state, { q: "", beds: 0, max: 0, sort: "", cat: "all", by: "" });
    box.value = "";
    if (sheet.open) sheet.close();
    return draw();
  }
  const c = e.target.closest("[data-cat]");
  if (c && !e.metaKey && !e.ctrlKey) {
    e.preventDefault();
    state.cat = c.dataset.cat;
    draw();
  }
});
// A heart tapped while "Saved" is open updates the list and its count.
addEventListener("pq:store", (e) => e.detail.key === "saved" && draw());

// ---- Distances from the visitor -------------------------------------------------------------------------
const near = document.getElementById("near");
async function findMe() {
  near.disabled = true;
  near.textContent = "Finding you…";
  try {
    here = await locate();
    near.hidden = true;
  } catch (err) {
    toast(err.message);
    near.disabled = false;
    near.textContent = "Show distances from me";
    if (state.sort === "near") state.sort = "";
  }
}
draw();
if (all.some(placed) && navigator.geolocation) {
  quietly().then((at) => {
    if (at) {
      here = at;
      return draw();
    }
    near.hidden = false;
  });
  near.addEventListener("click", () => findMe().then(draw));
}
