// Property card. On phones the name, price and facts sit on the photo (Homio style); on desktop they sit
// under it (three-column grid). The same markup serves both; CSS decides.
import { html, icon } from "./core.js";
import { PURPOSE_LABELS, STAGE_LABELS, STATUS_LABELS, cover, formatPrice, keyFacts, place } from "./data.js";

const isNew = (p) => p.listed && Date.now() - new Date(p.listed).getTime() < 30 * 86_400_000;

function tag(p) {
  if (p.status && p.status !== "available") return STATUS_LABELS[p.status];
  if (isNew(p)) return "New";
  return p.stage && p.stage !== "completed" ? STAGE_LABELS[p.stage] : null;
}

export function card(p, { eager = false } = {}) {
  const c = cover(p);
  const facts = keyFacts(p).slice(0, 3);
  const factList = facts.length ? html`<ul class="card__facts">${facts.map(([ic, t]) => html`<li>${icon(ic, 15)}${t}</li>`)}</ul>` : "";
  return html`<article class="card">
    <a class="card__media" href="/properties/${p.slug}" aria-label="${p.title}, ${formatPrice(p.price)}">
      ${c ? html`<img src="${c.src}" alt="" loading="${eager ? "eager" : "lazy"}" decoding="async" />` : html`<span class="card__noimg">Images to follow</span>`}
      ${tag(p) ? html`<span class="card__tag">${tag(p)}</span>` : ""}
      <span class="card__overlay">
        <span class="card__row"><span class="card__title">${p.title}</span><span class="card__price">${formatPrice(p.price)}</span></span>
        ${factList}
      </span>
    </a>
    <div class="card__body">
      <div class="card__row"><h3 class="card__title"><a href="/properties/${p.slug}">${p.title}</a></h3><span class="card__price">${formatPrice(p.price)}</span></div>
      <p class="card__place">${place(p)} · ${PURPOSE_LABELS[p.purpose] ?? ""}</p>
      ${factList}
    </div>
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

// A brochure shown as an open printed booklet (its first two pages), linking to the PDF.
export function booklet(p) {
  const [left, right] = p.brochure.pages ?? [];
  return html`<a class="booklet" href="${p.brochure.src}" target="_blank" rel="noopener">
    <span class="booklet__stage">
      <span class="booklet__book">
        ${left ? html`<img class="booklet__leaf booklet__leaf--l" src="${left}" alt="" loading="lazy" />` : ""}
        ${right ? html`<img class="booklet__leaf booklet__leaf--r" src="${right}" alt="" loading="lazy" />` : ""}
      </span>
    </span>
    <span class="booklet__cap"><strong>${p.title}</strong><span>${icon("download", 15)}Brochure · PDF</span></span>
  </a>`;
}
