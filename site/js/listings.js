// Listing cards, search and saving. Used by Home, Explore, Saved and provider pages.
import { $$, getUser, html, icon, raw, sb, signedUrls, toast } from "./core.js";
import { COMPLETION_LABELS, FURNISHING_LABELS, PROPERTY_TYPES, PURPOSES, PURPOSE_LABELS, PROPERTY_TYPE_LABELS, formatLocation, formatPrice, listingFacts } from "./format.js";
import { STALE_AFTER_DAYS, availabilityState } from "./trust.js";

export const CARD_COLUMNS =
  "id, slug, title, purpose, asking_price, currency, price_period, status, published_at, is_sponsored, property_type, region, city, locality, bedrooms, bathrooms, floor_area, floor_area_unit, land_area, land_area_unit, organization_name, organization_slug, organization_verification_status, organization_verification_scope, cover_path, cover_alt, cover_is_render, cover_is_staged, image_count, reference, negotiable, availability_confirmed_at, availability_method, subtype, furnishing, completion_status";
// At least 50 listings show before "Load more" (60 fills 2-, 3- and 4-column grids evenly).
export const PAGE_SIZE = 60;
export const SORTS = ["newest", "price_asc", "price_desc"];
const FURNISHINGS = Object.keys(FURNISHING_LABELS);

// ---- Search filters (from the address bar) ---------------------------------------------------------------
const int = (v, max) => (v && /^\d+$/.test(v) ? Math.min(Number(v), max) : undefined);
export function parseSearch(p) {
  const q = (p.get("q") ?? "").replace(/[^\p{L}\p{N}\s'-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  const purpose = p.get("purpose");
  const type = p.get("type");
  const currency = p.get("currency");
  const sort = p.get("sort");
  return {
    q: q || undefined,
    purpose: PURPOSES.includes(purpose) ? purpose : undefined,
    type: PROPERTY_TYPES.includes(type) ? type : undefined,
    min: int(p.get("min"), 1e9),
    max: int(p.get("max"), 1e9),
    beds: int(p.get("beds"), 10),
    baths: int(p.get("baths"), 10),
    furnishing: FURNISHINGS.includes(p.get("furnishing")) ? p.get("furnishing") : undefined,
    fresh: p.get("fresh") === "1" ? 1 : undefined,
    currency: currency && /^[A-Z]{3}$/.test(currency) ? currency : undefined,
    sort: SORTS.includes(sort) ? sort : undefined,
    cursor: p.get("cursor") || undefined,
  };
}

export function activeFilterCount(f) {
  return [f.purpose, f.type, f.min, f.max, f.beds, f.baths, f.furnishing, f.fresh].filter((v) => v !== undefined).length;
}

export function toQueryString(f) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}

// Keyset cursor "<sortValue>|<id>" in base64url, so "Load more" stays stable while listings change.
export function encodeCursor(value, id) {
  return btoa(`${value}|${id}`).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function decodeCursor(cursor) {
  if (!cursor) return null;
  try {
    const [value, id] = atob(cursor.replace(/-/g, "+").replace(/_/g, "/")).split("|");
    if (!value || !/^[0-9a-f-]{36}$/.test(id ?? "") || !/^[0-9TZ:.+\- ]+$/.test(value)) return null;
    return { value, id };
  } catch {
    return null;
  }
}

// ---- Queries ---------------------------------------------------------------------------------------------
export async function withCoverUrls(rows) {
  const urls = await signedUrls(rows.map((r) => r.cover_path));
  return rows.map((r) => ({ ...r, cover_url: r.cover_path ? (urls.get(r.cover_path) ?? null) : null }));
}

export async function searchListings(f) {
  const sort = f.sort ?? "newest";
  let q = sb.from("listing_cards").select(CARD_COLUMNS).eq("status", "published");
  if (f.purpose) q = q.eq("purpose", f.purpose);
  if (f.type) q = q.eq("property_type", f.type);
  if (f.beds) q = q.gte("bedrooms", f.beds);
  if (f.baths) q = q.gte("bathrooms", f.baths);
  if (f.furnishing) q = q.eq("furnishing", f.furnishing);
  if (f.fresh) q = q.gte("availability_confirmed_at", new Date(Date.now() - STALE_AFTER_DAYS * 86_400_000).toISOString());
  if (f.currency) q = q.eq("currency", f.currency);
  if (f.min !== undefined) q = q.gte("asking_price", f.min);
  if (f.max !== undefined) q = q.lte("asking_price", f.max);
  if (f.q) {
    const t = `%${f.q}%`;
    q = q.or(`title.ilike.${t},city.ilike.${t},locality.ilike.${t},region.ilike.${t},reference.ilike.${t}`);
  }
  const c = decodeCursor(f.cursor);
  if (sort === "newest") {
    if (c) q = q.or(`published_at.lt."${c.value}",and(published_at.eq."${c.value}",id.lt.${c.id})`);
    q = q.order("published_at", { ascending: false }).order("id", { ascending: false });
  } else {
    const asc = sort === "price_asc";
    const op = asc ? "gt" : "lt";
    if (c) q = q.or(`asking_price.${op}.${c.value},and(asking_price.eq.${c.value},id.${op}.${c.id})`);
    q = q.order("asking_price", { ascending: asc }).order("id", { ascending: asc });
  }
  const { data, error } = await q.limit(PAGE_SIZE + 1);
  if (error) return { rows: [], nextCursor: null, error: true };
  const page = (data ?? []).slice(0, PAGE_SIZE);
  const last = page[page.length - 1];
  const nextCursor =
    (data ?? []).length > PAGE_SIZE && last ? encodeCursor(sort === "newest" ? last.published_at : String(last.asking_price), last.id) : null;
  return { rows: await withCoverUrls(page), nextCursor, error: false };
}

export async function latestListings(limit = 8) {
  const { data } = await sb.from("listing_cards").select(CARD_COLUMNS).eq("status", "published").order("published_at", { ascending: false }).limit(limit);
  return withCoverUrls(data ?? []);
}

export async function savedIds(ids) {
  const user = await getUser();
  if (!user || ids.length === 0) return new Set();
  const { data } = await sb.from("saved_listings").select("listing_id").in("listing_id", ids);
  return new Set((data ?? []).map((r) => r.listing_id));
}

// ---- Card markup -----------------------------------------------------------------------------------------
export const noPhoto = (compact = false) =>
  html`<div class="no-photo">${icon("house", compact ? 22 : 30, 1.4)}${compact ? "" : html`<span>Photos coming soon</span>`}</div>`;

export function heartButton(l, saved) {
  return html`<button type="button" class="heart" data-save="${l.id}" data-slug="${l.slug}" aria-pressed="${saved ? "true" : "false"}" aria-label="${saved ? "Remove from saved" : "Save"}: ${l.title}">${icon("heart", 18, 2)}</button>`;
}

export function verifiedLabel(scope, compact = true) {
  return html`<span class="verified" title="${scope ? `Verified: ${scope}. This does not prove ownership of any specific property.` : ""}">${icon("check", 13, 3)}${compact ? "Verified provider" : `Verified: ${scope ?? "provider"}`}</span>`;
}

export function listingCard(l, { saved = false, eager = false } = {}) {
  const facts = listingFacts(l);
  return html`<article class="lcard">
    <div class="lcard__media">
      ${l.cover_url ? html`<img src="${l.cover_url}" alt="${l.cover_alt ?? l.title}" loading="${eager ? "eager" : "lazy"}" decoding="async" />` : noPhoto()}
      <div class="lcard__tags">
        <div>
          <span class="tag tag--light">${PURPOSE_LABELS[l.purpose]}</span>
          ${l.is_sponsored ? html`<span class="tag tag--sponsored">Sponsored</span>` : ""}
          ${l.cover_is_render || l.cover_is_staged ? html`<span class="tag tag--warning">${l.cover_is_render ? "Render" : "Staged"}</span>` : ""}
          ${l.completion_status && l.completion_status !== "completed" ? html`<span class="tag tag--warning">${COMPLETION_LABELS[l.completion_status]}</span>` : ""}
        </div>
        ${heartButton(l, saved)}
      </div>
      ${l.image_count > 1 ? html`<span class="lcard__count">${icon("photo", 12, 2)}${l.image_count}</span>` : ""}
    </div>
    <div class="lcard__body">
      <p class="lcard__price">${formatPrice(l.asking_price, l.currency, l.price_period)}</p>
      <h3 class="lcard__title"><a href="/properties/${l.slug}">${l.title}</a></h3>
      <p class="lcard__meta">${PROPERTY_TYPE_LABELS[l.property_type]} · ${formatLocation(l.locality, l.city)}</p>
      ${facts.length ? html`<ul class="facts-inline">${facts.map((f) => html`<li>${f}</li>`)}</ul>` : ""}
      ${l.organization_verification_status === "verified" ? html`<div class="mt-1">${verifiedLabel(l.organization_verification_scope)}</div>` : ""}
      ${availabilityLine(l.availability_confirmed_at)}
    </div>
  </article>`;
}

// One quiet line on each card: when availability was last confirmed (or that it needs reconfirming).
export function availabilityLine(confirmedAt) {
  const a = availabilityState(confirmedAt);
  if (a.state === "none") return "";
  const when = a.days <= 0 ? "today" : a.days === 1 ? "yesterday" : `${a.days} days ago`;
  return a.state === "fresh"
    ? html`<p class="avail avail--fresh">Availability confirmed ${when}</p>`
    : html`<p class="avail avail--stale">Availability not confirmed in ${STALE_AFTER_DAYS}+ days</p>`;
}

export function skeletonCards(n = 6) {
  return raw(
    Array.from({ length: n })
      .map(() => '<div class="lcard"><div class="lcard__media skeleton"></div><div class="lcard__body"><div class="skeleton" style="height:1.1rem;width:40%"></div><div class="skeleton" style="height:1rem;width:75%;margin-top:.4rem"></div><div class="skeleton" style="height:.9rem;width:55%;margin-top:.4rem"></div></div></div>')
      .join(""),
  );
}

// ---- Saving (hearts) -------------------------------------------------------------------------------------
// One listener for every heart on the page. Signed-out visitors are sent to sign in first.
export function wireSaveButtons(root = document) {
  if (root.dataset?.savesWired) return;
  if (root.dataset) root.dataset.savesWired = "1";
  root.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-save]");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const user = await getUser();
    if (!user) {
      location.href = `/sign-in?next=${encodeURIComponent(`/properties/${btn.dataset.slug}`)}`;
      return;
    }
    const id = btn.dataset.save;
    const saving = btn.getAttribute("aria-pressed") !== "true";
    setPressed(id, saving);
    const { error } = saving
      ? await sb.from("saved_listings").upsert({ listing_id: id, user_id: user.id }, { onConflict: "user_id,listing_id", ignoreDuplicates: true })
      : await sb.from("saved_listings").delete().eq("listing_id", id).eq("user_id", user.id);
    if (error) {
      setPressed(id, !saving);
      toast("We couldn't update your saved list. Please try again.");
    } else {
      toast(saving ? "Saved" : "Removed from saved");
    }
  });
}

function setPressed(id, on) {
  for (const b of $$(`[data-save="${CSS.escape(id)}"]`)) {
    b.setAttribute("aria-pressed", on ? "true" : "false");
    if (b.dataset.label === "text") b.lastChild.textContent = on ? " Saved" : " Save";
  }
}
