// Listings on the homepage: the first property as a large feature, the rest as a two-column list.
// Plain image, plain text: the place and stage, the name, the price and three facts.
import { html, icon } from "./core.js";
import { PURPOSE_LABELS, STAGE_LABELS, STATUS_LABELS, TYPE_LABELS, cover, formatPrice, keyFacts, place } from "./data.js";

const eyebrow = (p) =>
  [place(p), p.stage && p.stage !== "completed" ? STAGE_LABELS[p.stage] : null, p.status && p.status !== "available" ? STATUS_LABELS[p.status] : null].filter(Boolean).join(" — ");
const priceLine = (p) => `${formatPrice(p.price)}${p.purpose ? ` · ${PURPOSE_LABELS[p.purpose]}` : ""}`;

function picture(p, { eager = false, ratio = "" } = {}) {
  const c = cover(p);
  return html`<a class="listing__img ${ratio}" href="/properties/${p.slug}" tabindex="-1" aria-hidden="true">
    ${c ? html`<img src="${c.src}" alt="" loading="${eager ? "eager" : "lazy"}" decoding="async" />` : html`<span class="listing__noimg">Images to follow</span>`}
  </a>`;
}

export function featureListing(p) {
  const facts = keyFacts(p);
  return html`<article class="listing listing--feature">
    ${picture(p, { eager: true })}
    <div class="listing__text">
      <p class="eyebrow">${eyebrow(p)}</p>
      <h3><a href="/properties/${p.slug}">${p.title}</a></h3>
      ${p.summary ? html`<p class="listing__summary">${p.summary}</p>` : ""}
      ${facts.length ? html`<p class="listing__meta">${[...facts.slice(0, 4).map(([, t]) => t), p.units].filter(Boolean).join(" · ")}</p>` : ""}
      <p class="listing__price">${priceLine(p)}</p>
      <a class="text-link" href="/properties/${p.slug}">View property</a>
    </div>
  </article>`;
}

export function listing(p, { eager = false } = {}) {
  const facts = keyFacts(p).slice(0, 3).map(([, t]) => t);
  return html`<article class="listing">
    ${picture(p, { eager })}
    <p class="eyebrow">${eyebrow(p)}</p>
    <h3><a href="/properties/${p.slug}">${p.title}</a></h3>
    <p class="listing__meta">${[TYPE_LABELS[p.type], ...facts].filter(Boolean).join(" · ")}</p>
    <p class="listing__price">${priceLine(p)}</p>
  </article>`;
}

// The property picked on the map.
export function mapCard(p) {
  const c = cover(p);
  return html`<a class="map-card" href="/properties/${p.slug}">
    ${c ? html`<img src="${c.src}" alt="" />` : ""}
    <span class="map-card__text"><span class="eyebrow">${place(p)}</span><strong>${p.title}</strong><span>${formatPrice(p.price)}</span></span>
    ${icon("arrow", 18, 1.8)}
  </a>`;
}
