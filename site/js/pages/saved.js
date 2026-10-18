// Saved (hearted) properties. Ones that are sold or paused drop out automatically.
import { boot, html, render, requireProfile, sb } from "../core.js";
import { CARD_COLUMNS, listingCard, wireSaveButtons, withCoverUrls } from "../listings.js";
import { wireCompareButtons } from "../compare.js";

boot();
await requireProfile();
const root = document.getElementById("root");
const { data: saved } = await sb.from("saved_listings").select("listing_id, created_at").order("created_at", { ascending: false });
const ids = (saved ?? []).map((s) => s.listing_id);
const { data: rows } = ids.length ? await sb.from("listing_cards").select(CARD_COLUMNS).in("id", ids).eq("status", "published") : { data: [] };
const order = new Map(ids.map((id, i) => [id, i]));
const listings = await withCoverUrls((rows ?? []).sort((a, b) => order.get(a.id) - order.get(b.id)));

render(
  root,
  html`<div class="page-head"><h1>Saved</h1><p>Properties you've hearted. Anything sold, rented or paused is removed from this list.</p></div>
    ${listings.length
      ? html`<div class="listing-grid">${listings.map((l) => listingCard(l, { saved: true }))}</div>`
      : html`<div class="empty"><h2>Nothing saved yet</h2><p>Tap the heart on any property to keep it here.</p><a class="btn" href="/explore">Explore property</a></div>`}`,
);
root.removeAttribute("aria-busy");
wireSaveButtons(root);
wireCompareButtons(root);
