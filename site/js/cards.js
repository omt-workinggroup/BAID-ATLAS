// Property card: the photo carries the name, price and key facts; badges say what the page offers
// (3D tour, floor plans, brochure) so visitors know before they click.
import { html, icon, raw } from "./core.js";
import { PURPOSE_LABELS, STATUS_LABELS, TYPE_LABELS, cover, formatPrice, hasTour, keyFacts, place } from "./data.js";

export const noPhoto = () => html`<div class="no-photo">${icon("house", 30, 1.4)}<span>Photos coming soon</span></div>`;

export function heartButton(p, label = "Save") {
  return html`<button type="button" class="heart" data-save="${p.slug}" aria-pressed="false" aria-label="${label}: ${p.title}">${icon("heart", 18, 2)}</button>`;
}

export function propertyCard(p, { eager = false } = {}) {
  const photo = cover(p);
  const offers = [
    hasTour(p) && ["tour", "3D tour"],
    p.floorplans?.length && ["plan", "Floor plan"],
    p.brochure?.src && ["doc", "Brochure"],
  ].filter(Boolean);
  const closed = p.status && p.status !== "available";
  return html`<article class="pcard${raw(closed ? " pcard--closed" : "")}">
    <div class="pcard__media">
      ${photo ? html`<img src="${photo.src}" alt="${photo.alt ?? p.title}" loading="${eager ? "eager" : "lazy"}" decoding="async" />` : noPhoto()}
      <div class="pcard__tags">
        <div>
          <span class="tag tag--light">${PURPOSE_LABELS[p.purpose] ?? ""}</span>
          ${closed ? html`<span class="tag tag--dark">${STATUS_LABELS[p.status]}</span>` : ""}
        </div>
        ${heartButton(p)}
      </div>
      <div class="pcard__overlay">
        <div class="pcard__headline">
          <h3 class="pcard__title"><a href="/properties/${p.slug}">${p.title}</a></h3>
          <p class="pcard__price">${formatPrice(p.price)}</p>
        </div>
        ${keyFacts(p).length ? html`<ul class="pcard__facts">${keyFacts(p).slice(0, 3).map(([ic, t]) => html`<li>${icon(ic, 16)}${t}</li>`)}</ul>` : ""}
      </div>
    </div>
    <div class="pcard__body">
      <p class="pcard__meta">${icon("pin", 14)}${[TYPE_LABELS[p.type], place(p)].filter(Boolean).join(" · ")}</p>
      ${offers.length ? html`<ul class="pcard__offers">${offers.map(([ic, t]) => html`<li>${icon(ic, 14)}${t}</li>`)}</ul>` : ""}
    </div>
  </article>`;
}

export function skeletonCards(n = 6) {
  return Array.from({ length: n }, () => html`<div class="pcard pcard--skeleton" aria-hidden="true"><div class="pcard__media skeleton"></div><div class="skeleton skeleton--line"></div></div>`);
}

// Map preview: the property picked on the map, as a card along the bottom of the map.
export function mapPreviewCard(p) {
  const photo = cover(p);
  return html`<article class="mcard">
    <div class="mcard__media">
      ${photo ? html`<img src="${photo.src}" alt="${photo.alt ?? p.title}" decoding="async" />` : noPhoto()}
      <span class="tag tag--light">${PURPOSE_LABELS[p.purpose] ?? ""}</span>
    </div>
    <div class="mcard__body">
      <h3 class="mcard__title"><a href="/properties/${p.slug}">${p.title}</a></h3>
      <p class="mcard__meta">${icon("pin", 13)}${place(p)}</p>
      <p class="mcard__price">${formatPrice(p.price)}</p>
      ${keyFacts(p).length ? html`<ul class="mcard__facts">${keyFacts(p).slice(0, 3).map(([ic, t]) => html`<li>${icon(ic, 14)}${t}</li>`)}</ul>` : ""}
    </div>
    <button type="button" class="mcard__close" data-close-preview aria-label="Close preview">${raw("&times;")}</button>
  </article>`;
}
