// Public provider profile with its live listings.
import { boot, html, render, sb, setTitle } from "../core.js";
import { ORGANIZATION_TYPE_LABELS } from "../format.js";
import { CARD_COLUMNS, PAGE_SIZE, listingCard, savedIds, verifiedLabel, wireSaveButtons, withCoverUrls } from "../listings.js";
import { wireCompareButtons } from "../compare.js";

boot();
const slug = decodeURIComponent(location.pathname.split("/").filter(Boolean).pop() ?? "");
const root = document.getElementById("root");

const { data: org } = await sb
  .from("public_organizations")
  .select("id, name, slug, type, description, website, verification_status, created_at")
  .eq("slug", slug)
  .maybeSingle();

if (!org) {
  setTitle("Provider not found");
  render(root, html`<div class="empty"><h1>We couldn't find that provider.</h1><p>The link may be wrong, or the organisation may no longer be on Propertiq.</p><a class="btn" href="/explore">Explore property</a></div>`);
} else {
  setTitle(org.name);
  const [{ data: extra }, { data: rows }] = await Promise.all([
    sb.from("organizations").select("verification_scope").eq("id", org.id).maybeSingle(),
    sb.from("listing_cards").select(CARD_COLUMNS).eq("organization_id", org.id).eq("status", "published").order("published_at", { ascending: false }).limit(PAGE_SIZE),
  ]);
  const listings = await withCoverUrls(rows ?? []);
  const saved = await savedIds(listings.map((l) => l.id));
  const since = new Date(org.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  render(
    root,
    html`<section class="stack" style="padding-bottom: 2rem; border-bottom: 1px solid var(--border)">
        <div class="row" style="align-items: flex-start; gap: 1rem">
          <span class="monogram monogram--lg">${org.name.slice(0, 1)}</span>
          <div class="stack-sm"><h1>${org.name}</h1><p class="small muted">${ORGANIZATION_TYPE_LABELS[org.type]} · On Propertiq since ${since}</p></div>
        </div>
        ${org.verification_status === "verified" ? verifiedLabel(extra?.verification_scope ?? null, false) : ""}
        ${org.description ? html`<p class="prose" style="max-width: 42rem">${org.description}</p>` : ""}
        <div class="row wrap small">
          ${org.website ? html`<a class="link" href="${org.website}" rel="noopener noreferrer nofollow" target="_blank">Website ↗</a>` : ""}
          <span class="muted">${listings.length} live ${listings.length === 1 ? "listing" : "listings"}</span>
        </div>
      </section>
      <section class="stack">
        <h2>Live listings</h2>
        ${listings.length
          ? html`<div class="listing-grid">${listings.map((l) => listingCard(l, { saved: saved.has(l.id) }))}</div>`
          : html`<p class="muted">No live listings right now.</p>`}
      </section>`,
  );
  wireSaveButtons(root);
  wireCompareButtons(root);
}
root.removeAttribute("aria-busy");
