// One property: title and price, a large image, then overview, units, gallery, 3D tour, floor plans,
// brochure, location (satellite map) and how to arrange a viewing.
import { SITE_URL } from "../config.js";
import { boot, html, render, setTitle, toast } from "../core.js";
import { PURPOSE_LABELS, STAGE_LABELS, STATUS_LABELS, TYPE_LABELS, cover, filterProperties, formatArea, formatPrice, hasTour, keyFacts, loadPortfolio, place, whatsappLink } from "../data.js";
import { listing } from "../cards.js";
import { mountTour } from "../tour.js";
import { openViewer } from "../viewer.js";

const FACT_NAMES = { bed: "Bedrooms", bath: "Bathrooms", car: "Parking", area: "Size", plot: "Land" };

boot();
const slug = decodeURIComponent(location.pathname.split("/").filter(Boolean)[1] ?? "");
const root = document.getElementById("pd");

let portfolio;
try {
  portfolio = await loadPortfolio();
} catch {
  render(root, html`<div class="empty wrap"><h1>This page couldn't be loaded.</h1><p>Please refresh.</p></div>`);
}
const p = portfolio?.properties?.find((x) => x.slug === slug);
if (portfolio && !p) {
  render(root, html`<div class="empty wrap"><h1>This property isn't listed any more.</h1><p>It may have been sold or let.</p><p><a class="text-link" href="/#properties">See the other properties</a></p></div>`);
}
if (p) show(p, portfolio.owner ?? {});

function section(id, title, body) {
  return html`<section class="pd-section" id="${id}" aria-labelledby="${id}-h">
    <h2 id="${id}-h">${title}</h2>
    <div class="pd-section__body">${body}</div>
  </section>`;
}


function show(p, owner) {
  setTitle(p.title);
  document.querySelector('meta[name="description"]')?.setAttribute("content", p.summary ?? p.title);
  const url = `${SITE_URL}/properties/${p.slug}`;
  const photos = p.photos ?? [];
  const plans = p.floorplans ?? [];
  const wa = whatsappLink(owner.whatsapp, p, url);
  const facts = keyFacts(p);
  const located = typeof p.location?.lat === "number";
  const line = [TYPE_LABELS[p.type], p.stage && STAGE_LABELS[p.stage], p.status && p.status !== "available" ? STATUS_LABELS[p.status] : null].filter(Boolean).join(" · ");
  const others = filterProperties((portfolio.properties ?? []).filter((x) => x.slug !== p.slug), { sort: "newest" }).slice(0, 2);
  const parts = [
    ["overview", "Overview", true],
    ["units", "Units", Boolean(p.unit_types?.length)],
    ["gallery", p.renders ? "Gallery" : "Photos", photos.length > 1],
    ["tour", "3D tour", hasTour(p)],
    ["plans", "Floor plans", plans.length > 0],
    ["brochure", "Brochure", Boolean(p.brochure?.src)],
    ["location", "Location", Boolean(place(p))],
    ["viewing", "Viewing", true],
  ].filter((x) => x[2]);

  render(
    root,
    html`
      <div class="wrap">
        <p class="crumbs"><a href="/#properties">Properties</a> <span aria-hidden="true">/</span> <span>${p.title}</span></p>
        <header class="pd-head">
          <div>
            <p class="eyebrow">${place(p)}</p>
            <h1>${p.title}</h1>
            <p class="pd-head__line">${line}</p>
          </div>
          <div class="pd-head__side">
            <p class="pd-head__price">${formatPrice(p.price)}</p>
            <p class="pd-head__terms">${PURPOSE_LABELS[p.purpose] ?? ""}${p.price?.negotiable ? " · open to offers" : ""}</p>
            <div class="pd-head__actions">
              ${wa ? html`<a class="button" href="${wa}" target="_blank" rel="noopener">Arrange a viewing</a>` : html`<a class="button" href="/contact">Arrange a viewing</a>`}
              ${p.brochure?.src ? html`<a class="text-link" href="${p.brochure.src}" download>Download brochure</a>` : ""}
              <button type="button" class="text-link" id="share">Share</button>
            </div>
          </div>
        </header>
      </div>

      ${cover(p)
        ? html`<figure class="pd-hero">
            <button type="button" data-photo="0" aria-label="Open the image gallery"><img src="${cover(p).src}" alt="${cover(p).alt ?? p.title}" fetchpriority="high" /></button>
            <figcaption class="wrap">${p.renders ? "Artist's impression" : (cover(p).caption ?? "")}${photos.length > 1 ? html` · <button type="button" class="text-link" data-photo="0">View all ${photos.length} images</button>` : ""}</figcaption>
          </figure>`
        : ""}

      <div class="wrap pd-body">
        <nav class="pd-index" aria-label="On this page">${parts.map(([id, label]) => html`<a href="#${id}">${label}</a>`)}</nav>

        ${section(
          "overview",
          "Overview",
          html`${p.summary ? html`<p class="lead">${p.summary}</p>` : ""}
            ${facts.length || p.units
              ? html`<dl class="facts">${facts.map(([k, t]) => html`<div><dt>${FACT_NAMES[k]}</dt><dd>${t.replace(/ (Beds?|Baths?|Parking|land)$/, "")}</dd></div>`)}${p.units ? html`<div><dt>Units</dt><dd>${p.units}</dd></div>` : ""}</dl>`
              : ""}
            ${p.description ? html`<div class="prose">${String(p.description).split(/\n\s*\n/).map((para) => html`<p>${para}</p>`)}</div>` : ""}
            ${p.features?.length ? html`<h3>Features</h3><ul class="list-cols">${p.features.map((x) => html`<li>${x}</li>`)}</ul>` : ""}
            ${p.developer ? html`<p class="fineprint">Developer: ${p.developer}</p>` : ""}`,
        )}

        ${p.unit_types?.length
          ? section(
              "units",
              "Units",
              html`<table class="table">
                <thead><tr><th scope="col">Type</th><th scope="col">Size</th></tr></thead>
                <tbody>${p.unit_types.map((u) => html`<tr><td>${u.name}</td><td>${formatArea(u.size) ?? "—"}</td></tr>`)}</tbody>
              </table>`,
            )
          : ""}

        ${photos.length > 1
          ? section(
              "gallery",
              p.renders ? "Gallery" : "Photos",
              html`${p.renders ? html`<p class="fineprint">Artist's impressions of the finished development.</p>` : ""}
                <div class="gallery">
                  ${photos.map(
                    (ph, i) => html`<figure>
                      <button type="button" data-photo="${i}" aria-label="Open image ${i + 1} of ${photos.length}"><img src="${ph.src}" alt="${ph.alt ?? ""}" loading="lazy" decoding="async" /></button>
                      ${ph.caption ? html`<figcaption>${ph.caption}</figcaption>` : ""}
                    </figure>`,
                  )}
                </div>`,
            )
          : ""}

        ${hasTour(p) ? section("tour", "3D tour", html`<p>Drag to look around, pinch or scroll to zoom, and use the circles to move between rooms.</p><div id="tour-root"></div>`) : ""}

        ${plans.length
          ? section(
              "plans",
              "Floor plans",
              html`<div class="plans">
                ${plans.map(
                  (pl, i) => html`<figure>
                    <button type="button" data-plan="${i}" aria-label="Enlarge: ${pl.label ?? `plan ${i + 1}`}"><img src="${pl.src}" alt="${pl.label ?? "Floor plan"}" loading="lazy" /></button>
                    <figcaption>${pl.label ?? ""}</figcaption>
                  </figure>`,
                )}
              </div>`,
            )
          : ""}

        ${p.brochure?.src
          ? section(
              "brochure",
              "Brochure",
              html`<p>${p.brochure.label ?? `${p.title} brochure`} (PDF)</p>
                <p class="row-links"><a class="text-link" href="${p.brochure.src}" target="_blank" rel="noopener">Open</a><a class="text-link" href="${p.brochure.src}" download>Download</a></p>`,
            )
          : ""}

        ${place(p)
          ? section(
              "location",
              "Location",
              html`<p>${[p.location?.area, p.location?.city, p.location?.region].filter(Boolean).join(", ")}</p>
                ${located
                  ? html`<div class="pd-map" id="pd-map" role="region" aria-label="Satellite map of the area"></div>
                      <p class="fineprint">The circle marks the neighbourhood. The exact address is shared when you arrange a viewing.</p>`
                  : ""}
                ${p.nearby?.length ? html`<h3>Nearby</h3><ul class="list-plain">${p.nearby.map((x) => html`<li>${x}</li>`)}</ul>` : ""}`,
            )
          : ""}

        ${section(
          "viewing",
          "Viewing",
          html`<p>To see ${p.title}, ask a question or get the payment terms, contact ${owner.name ?? "us"}.</p>
            <p class="row-links">
              ${wa ? html`<a class="button" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
              ${owner.phone ? html`<a class="text-link" href="tel:${owner.phone.replace(/\s/g, "")}">${owner.phone}</a>` : ""}
              ${owner.email ? html`<a class="text-link" href="mailto:${owner.email}?subject=${encodeURIComponent(p.title)}&body=${encodeURIComponent(`Hello, I'm interested in ${p.title} (${url}).`)}">${owner.email}</a>` : ""}
              ${p.website ? html`<a class="text-link" href="${p.website}" target="_blank" rel="noopener">Development website</a>` : ""}
            </p>`,
        )}
      </div>

      ${others.length
        ? html`<section class="wrap more" aria-labelledby="more-h">
            <h2 id="more-h">Other properties</h2>
            <div class="listing-grid">${others.map((x) => listing(x))}</div>
          </section>`
        : ""}`,
  );
  root.removeAttribute("aria-busy");

  root.addEventListener("click", (e) => {
    const ph = e.target.closest("[data-photo]");
    if (ph) openViewer(photos.map((x) => ({ src: x.src, alt: x.alt, caption: x.caption })), Number(ph.dataset.photo));
    const pl = e.target.closest("[data-plan]");
    if (pl) openViewer(plans.map((x) => ({ src: x.src, alt: x.label, caption: x.label })), Number(pl.dataset.plan), { plan: true });
  });

  document.getElementById("share").addEventListener("click", async () => {
    if (navigator.share) return navigator.share({ title: p.title, url }).catch(() => {});
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied");
    } catch {
      toast(url);
    }
  });

  if (hasTour(p)) {
    const tour = mountTour(document.getElementById("tour-root"), p.tour, { poster: p.tour.poster ?? cover(p)?.src, title: p.title });
    if (location.hash === "#tour") tour.start();
  }

  if (located) {
    // The satellite map loads when it is about to scroll into view, then flies in and tilts.
    const el = document.getElementById("pd-map");
    new IntersectionObserver(
      (entries, obs) => {
        if (!entries.some((x) => x.isIntersecting)) return;
        obs.disconnect();
        import("../map.js").then(async (m) => {
          await m.loadMapLibre();
          const at = m.lngLat(p);
          const map = m.createMap(el, { center: at, zoom: 13, pitch: 0, cooperative: true });
          m.addArea(map, at);
          map.once("load", () => {
            map.flyTo({ center: at, zoom: 15.3, pitch: 58, bearing: -20, duration: 3000, essential: true });
            map.once("moveend", () => m.orbit(map));
          });
        });
      },
      { rootMargin: "300px" },
    ).observe(el);
  }
}
