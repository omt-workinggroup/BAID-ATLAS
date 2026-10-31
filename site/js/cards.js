// Property card: photo (with a save button), then price and purpose, name, area, type and key facts,
// who lists it, and Call / Email / WhatsApp. One layout for phones and desktop.
import { SITE_URL } from "./config.js";
import { html, icon } from "./core.js";
import { PURPOSE_LABELS, STAGE_LABELS, STATUS_LABELS, TYPE_LABELS, cover, formatPrice, keyFacts, place, small, waLink, whatsappLink } from "./data.js";
import { isSaved } from "./store.js";

const isNew = (p) => p.listed && Date.now() - new Date(p.listed).getTime() < 30 * 86_400_000;
const TYPE_SHORT = { ...TYPE_LABELS, commercial: "Offices & stores" };

function tag(p) {
  if (p.coming_soon) return "Coming soon";
  if (p.status && p.status !== "available") return STATUS_LABELS[p.status];
  if (p.stage && p.stage !== "completed") return STAGE_LABELS[p.stage];
  return isNew(p) ? "New" : null;
}
export const initials = (name) =>
  String(name ?? "")
    .replace(/\b(ltd|limited|plc|inc)\b\.?/gi, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

// Until a property's photos arrive, its thumbnail is drawn: its initial in a thin frame.
export function artwork(p) {
  return html`<span class="art" aria-hidden="true"><span class="art__grid"></span><span class="art__mark">${p.title.charAt(0)}</span><span class="art__name">${p.title}</span></span>`;
}

// The heart on the photo. data-save is handled once per page (wireCollect).
export function photoTools(p) {
  return html`<button type="button" class="ptool card__save" data-save="${p.slug}" aria-pressed="${isSaved(p.slug) ? "true" : "false"}" aria-label="Save ${p.title}">${icon("heart", 18, 1.8)}</button>`;
}

// "away" is how far the visitor is from it (when they have shared their location).
export function card(p, { eager = false, away = null, owner = {} } = {}) {
  const c = cover(p);
  const url = `/properties/${p.slug}`;
  const lister = p.listed_by ?? owner.name;
  const t = tag(p);
  const facts = keyFacts(p).slice(0, 3);
  const tel = owner.phone ? `tel:${owner.phone.replace(/\s/g, "")}` : null;
  const wa = p.coming_soon ? waLink(owner.whatsapp, `Hello, please tell me about "${p.title}" (${SITE_URL}${url}).`) : whatsappLink(owner.whatsapp, p, `${SITE_URL}${url}`);
  const mail = owner.email ? `mailto:${owner.email}?subject=${encodeURIComponent(p.title)}&body=${encodeURIComponent(`Hello, I'm interested in "${p.title}" (${SITE_URL}${url}).`)}` : null;
  return html`<article class="card${p.coming_soon ? " card--soon" : ""}">
    <div class="card__media">
      <a href="${url}" tabindex="-1" aria-hidden="true">${c ? html`<img src="${small(c)}" alt="" loading="${eager ? "eager" : "lazy"}" ${eager ? html`fetchpriority="high"` : ""} decoding="async" />` : artwork(p)}</a>
      ${t ? html`<span class="card__tag">${t}</span>` : ""}
      ${photoTools(p)}
    </div>
    <div class="card__body">
      <p class="card__price"><strong>${p.coming_soon ? "Coming soon" : formatPrice(p.price)}</strong>${PURPOSE_LABELS[p.purpose] ? html`<span class="chip-s">${PURPOSE_LABELS[p.purpose]}</span>` : ""}</p>
      <h3 class="card__title"><a href="${url}">${p.title}</a></h3>
      <p class="card__place">${icon("pin", 15)}${place(p) || p.summary || "Accra"}</p>
      ${facts.length || p.type || away
        ? html`<ul class="card__facts">
            ${p.type ? html`<li class="chip-s">${TYPE_SHORT[p.type] ?? p.type}</li>` : ""}
            ${facts.map(([ic, text]) => html`<li>${icon(ic, 16)}${text}</li>`)}
            ${away ? html`<li class="card__away">${icon("locate", 16)}${away} away</li>` : ""}
          </ul>`
        : ""}
      ${lister
        ? html`<div class="card__by"><span class="av">${initials(lister)}</span><span class="card__lister">${lister}</span>${p.listed_by ? "" : html`<span class="tick" title="Listed by the owner">${icon("check", 11, 3)}</span>`}<button type="button" class="ptool ptool--plain" data-share="${url}" data-title="${p.title}" aria-label="Share ${p.title}">${icon("share", 17)}</button></div>`
        : ""}
      <div class="card__actions">
        ${tel ? html`<a class="btn btn--line-dark" href="${tel}">${icon("phone", 16)}Call</a>` : ""}
        ${mail ? html`<a class="btn btn--line-dark" href="${mail}">${icon("mail", 16)}Email</a>` : ""}
        ${wa ? html`<a class="btn btn--dark" href="${wa}" target="_blank" rel="noopener">${icon("chat", 16)}WhatsApp</a>` : ""}
      </div>
    </div>
  </article>`;
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
