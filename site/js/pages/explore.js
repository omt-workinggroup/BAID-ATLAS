// Explore: search box, purpose chips, filter sheet and "Load more".
import { boot, html, markup, params, raw, render, setTitle } from "../core.js";
import { FURNISHING_LABELS, PROPERTY_TYPES, PROPERTY_TYPE_LABELS, PURPOSES, PURPOSE_LABELS } from "../format.js";
import { activeFilterCount, listingCard, parseSearch, savedIds, searchListings, skeletonCards, toQueryString, wireSaveButtons } from "../listings.js";

boot();
const f = parseSearch(params());
const base = { q: f.q, type: f.type, min: f.min, max: f.max, beds: f.beds, baths: f.baths, furnishing: f.furnishing, fresh: f.fresh, currency: f.currency, sort: f.sort };

// Heading and title
const heading = f.purpose ? `${PURPOSE_LABELS[f.purpose]}${f.type ? ` · ${PROPERTY_TYPE_LABELS[f.type]}` : ""}` : f.type ? PROPERTY_TYPE_LABELS[f.type] : "Explore property";
document.getElementById("heading").textContent = heading;
setTitle(heading);

// Search box keeps the current purpose and type
const searchForm = document.getElementById("search-form");
searchForm.q.value = f.q ?? "";
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  location.href = `/explore${toQueryString({ ...base, purpose: f.purpose, q: searchForm.q.value.trim() || undefined })}`;
});

// Purpose chips
render(
  "#purpose-chips",
  html`<a class="chip" href="/explore${toQueryString(base)}" ${raw(!f.purpose ? 'aria-current="page"' : "")}>All</a>
    ${PURPOSES.map((p) => html`<a class="chip" href="/explore${toQueryString({ ...base, purpose: p })}" ${raw(f.purpose === p ? 'aria-current="page"' : "")}>${PURPOSE_LABELS[p]}</a>`)}`,
);

// Filter sheet
const count = activeFilterCount(f);
const badge = document.getElementById("filter-count");
badge.hidden = count === 0;
badge.textContent = String(count);
document.getElementById("open-filters").setAttribute("aria-label", `Filters${count ? ` (${count} active)` : ""}`);

const chip = (name, value, label, checked) =>
  html`<label class="pill-choice"><input type="radio" name="${name}" value="${value}" ${raw(checked ? "checked" : "")} /><span>${label}</span></label>`;
render("#f-purpose", [chip("purpose", "", "Any", !f.purpose), ...PURPOSES.map((p) => chip("purpose", p, PURPOSE_LABELS[p], f.purpose === p))]);
render("#f-type", [chip("type", "", "Any", !f.type), ...PROPERTY_TYPES.map((t) => chip("type", t, PROPERTY_TYPE_LABELS[t], f.type === t))]);
render("#f-beds", [chip("beds", "", "Any", !f.beds), ...[1, 2, 3, 4, 5].map((b) => chip("beds", b, `${b}+`, f.beds === b))]);
render("#f-baths", [chip("baths", "", "Any", !f.baths), ...[1, 2, 3, 4].map((b) => chip("baths", b, `${b}+`, f.baths === b))]);
render("#f-furnishing", [chip("furnishing", "", "Any", !f.furnishing), ...Object.entries(FURNISHING_LABELS).map(([k, v]) => chip("furnishing", k, v, f.furnishing === k))]);
document.getElementById("f-fresh").checked = Boolean(f.fresh);
render("#f-sort", [
  chip("sort", "newest", "Newest", !f.sort || f.sort === "newest"),
  chip("sort", "price_asc", "Price: low to high", f.sort === "price_asc"),
  chip("sort", "price_desc", "Price: high to low", f.sort === "price_desc"),
]);
const dialog = document.getElementById("filters");
const filterForm = document.getElementById("filter-form");
filterForm.q.value = f.q ?? "";
filterForm.currency.value = f.currency ?? "GHS";
filterForm.min.value = f.min ?? "";
filterForm.max.value = f.max ?? "";
document.getElementById("clear-all").href = `/explore${toQueryString({ q: f.q })}`;
document.getElementById("open-filters").addEventListener("click", () => dialog.showModal());
dialog.querySelector("[data-close]").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (e) => e.target === dialog && dialog.close());
filterForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const d = new FormData(filterForm);
  const v = (k) => String(d.get(k) ?? "").trim() || undefined;
  location.href = `/explore${toQueryString({ q: v("q"), purpose: v("purpose"), type: v("type"), currency: v("min") || v("max") ? v("currency") : undefined, min: v("min"), max: v("max"), beds: v("beds"), baths: v("baths"), furnishing: v("furnishing"), fresh: d.get("fresh") ? "1" : undefined, sort: v("sort") === "newest" ? undefined : v("sort") })}`;
});

// Results
const grid = document.getElementById("results");
const more = document.getElementById("load-more");
render(grid, skeletonCards(6));
let shown = 0;
let cursor = f.cursor;

async function load(append) {
  const result = await searchListings({ ...f, cursor });
  if (result.error) {
    render("#results-error", html`<p role="alert" class="alert alert--error">We couldn't load listings right now. Please try again in a moment.</p>`);
    render(grid, "");
    return;
  }
  if (!append && result.rows.length === 0) {
    grid.outerHTML = emptyView(count > 0 || Boolean(f.q));
    return;
  }
  const saved = await savedIds(result.rows.map((r) => r.id));
  const cards = result.rows.map((l, i) => html`<div class="rise" style="animation-delay:${Math.min(i, 8) * 40}ms">${listingCard(l, { saved: saved.has(l.id), eager: !append && i < 2 })}</div>`);
  if (append) grid.insertAdjacentHTML("beforeend", markup(cards));
  else render(grid, cards);
  grid.removeAttribute("aria-busy");
  shown += result.rows.length;
  cursor = result.nextCursor;
  more.hidden = !cursor;
  document.getElementById("results-count").textContent = `Showing ${shown} ${shown === 1 ? "property" : "properties"}${cursor ? " — more below" : ""}`;
}

function emptyView(filtered) {
  return `<div class="empty">
    <span class="accent"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5M5 9v11h14V9M10 20v-5h4v5"/></svg></span>
    <h2>${filtered ? "Nothing matches those filters" : "Listings are on their way"}</h2>
    <p>${filtered ? "Try a nearby area, a wider price range or fewer bedrooms." : "Every listing is reviewed before it goes live, and the first providers are being checked now."}</p>
    <div class="row wrap">${filtered ? '<a class="btn btn--secondary" href="/explore">Clear filters</a>' : ""}<a class="btn" href="/portal">List your property</a></div>
  </div>`;
}

more.addEventListener("click", async () => {
  more.disabled = true;
  more.textContent = "Loading…";
  await load(true);
  more.disabled = false;
  more.textContent = "Load more";
});

wireSaveButtons(grid);
await load(false);
