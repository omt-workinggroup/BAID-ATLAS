// One property, laid out like the reference detail screen: a photo with the name, place and price, a
// stats card, a photo grid, "About Property" with See more, then units, features, 3D tour, floor plans,
// brochure and location. Phones get a bottom bar (price, Schedule Visit, Contact Agent); desktop gets the
// same actions in a side panel.
import { SITE_URL } from "../config.js";
import { boot, html, icon, render, setTitle, toast } from "../core.js";
import { PURPOSE_LABELS, STAGE_LABELS, STATUS_LABELS, cover, filterProperties, formatArea, formatPrice, hasTour, keyFacts, loadPortfolio, place, shortPrice, whatsappLink } from "../data.js";
import { card } from "../cards.js";
import { mountTour } from "../tour.js";
import { openViewer } from "../viewer.js";

const STAT_NAMES = { bed: "Beds", bath: "Baths", car: "Parking", area: "Size", plot: "Land" };

boot();
document.body.classList.add("page-detail");
const slug = decodeURIComponent(location.pathname.split("/").filter(Boolean)[1] ?? "");
const root = document.getElementById("pd");

let portfolio;
try {
  portfolio = await loadPortfolio();
} catch {
  render(root, html`<p class="empty wrap">This page couldn't be loaded. Please refresh.</p>`);
}
const p = portfolio?.properties?.find((x) => x.slug === slug);
if (portfolio && !p) {
  render(root, html`<div class="empty wrap"><h1>This property isn't listed any more.</h1><p>It may have been sold or let. <a class="text-link" href="/#properties">See the other properties</a></p></div>`);
}
if (p) show(p, portfolio.owner ?? {});

function section(id, title, body) {
  return html`<section class="pd-section" id="${id}" aria-labelledby="${id}-h"><h2 id="${id}-h">${title}</h2>${body}</section>`;
}

function show(p, owner) {
  setTitle(p.title);
  document.querySelector('meta[name="description"]')?.setAttribute("content", p.summary ?? p.title);
  const url = `${SITE_URL}/properties/${p.slug}`;
  const photos = p.photos ?? [];
  const plans = p.floorplans ?? [];
  const wa = whatsappLink(owner.whatsapp, p, url);
  const tel = owner.phone ? `tel:${owner.phone.replace(/\s/g, "")}` : "/contact";
  const facts = keyFacts(p);
  const status = [p.stage && STAGE_LABELS[p.stage], p.status && p.status !== "available" ? STATUS_LABELS[p.status] : null].filter(Boolean).join(" · ");
  const about = [p.summary, ...String(p.description ?? "").split(/\n\s*\n/)].filter(Boolean);
  const others = filterProperties((portfolio.properties ?? []).filter((x) => x.slug !== p.slug), { sort: "newest" }).slice(0, 3);
  const actions = (variant) => html`
    <a class="btn btn--outline-tan" href="${wa ?? "/contact"}" ${wa ? html`target="_blank" rel="noopener"` : ""}>Schedule Visit</a>
    <a class="btn btn--dark" href="${tel}">Contact Agent</a>
    ${variant === "side" && p.brochure?.src ? html`<a class="text-link" href="${p.brochure.src}" download>Download brochure</a>` : ""}`;

  render(
    root,
    html`
      <section class="pd-top" aria-labelledby="pd-title">
        ${cover(p) ? html`<img src="${cover(p).src}" alt="${cover(p).alt ?? p.title}" fetchpriority="high" />` : ""}
        <div class="pd-top__bar">
          <a class="round" href="/#properties" aria-label="Back to properties">${icon("back", 20, 2)}</a>
          <div><button type="button" class="round" id="share" aria-label="Share">${icon("share", 18, 1.8)}</button></div>
        </div>
        ${p.renders ? html`<span class="pd-top__note">Artist's impression</span>` : ""}
        <div class="pd-top__text">
          <div>
            <h1 id="pd-title">${p.title}</h1>
            <p class="pd-top__place">${icon("pin", 15)}${place(p)}</p>
          </div>
          <p class="pd-top__price"><strong>${formatPrice(p.price)}</strong><span>${PURPOSE_LABELS[p.purpose] ?? ""}</span></p>
        </div>
      </section>

      ${facts.length || p.units
        ? html`<ul class="stats" aria-label="Key facts">
            ${facts.slice(0, 4).map(([k, t]) => html`<li><strong>${icon(k, 18)}${t.replace(/ (Beds?|Baths?|Parking|land)$/, "")}</strong>${STAT_NAMES[k]}</li>`)}
            ${facts.length < 4 && p.units ? html`<li><strong>${icon("grid", 18)}${String(p.units).split(" ")[0]}</strong>Units</li>` : ""}
          </ul>`
        : ""}

      <div class="pd-layout">
        <div class="pd-main">
          ${photos.length > 1
            ? html`<div class="photos">
                ${photos.slice(0, 4).map(
                  (ph, i) => html`<button type="button" data-photo="${i}" aria-label="Open image ${i + 1} of ${photos.length}">
                    <img src="${ph.src}" alt="${ph.alt ?? ""}" loading="${i < 2 ? "eager" : "lazy"}" decoding="async" />
                    ${i === 3 && photos.length > 4 ? html`<span class="photos__more"><b>${photos.length - 4}+</b>${p.renders ? "Images" : "Photos"}</span>` : ""}
                  </button>`,
                )}
              </div>`
            : ""}

          ${section(
            "about-property",
            "About Property",
            html`<div class="clamp" id="about-text">${about.map((para) => html`<p>${para}</p>`)}</div>
              <button type="button" class="see-more" id="see-more">See More</button>
              ${status ? html`<p class="fineprint">${status}${p.developer ? ` · Developer: ${p.developer}` : ""}</p>` : ""}`,
          )}

          ${p.unit_types?.length
            ? section("units", "Units", html`<div class="units">${p.unit_types.map((u) => html`<div class="unit"><strong>${u.name}</strong><span>${formatArea(u.size) ?? ""}</span></div>`)}</div>`)
            : ""}

          ${p.features?.length ? section("features", "Features", html`<ul class="ticks">${p.features.map((x) => html`<li>${icon("check", 16, 2.2)}${x}</li>`)}</ul>`) : ""}

          ${hasTour(p) ? section("tour", "3D Tour", html`<p>Drag to look around, pinch or scroll to zoom, and use the circles to move between rooms.</p><div id="tour-root"></div>`) : ""}

          ${plans.length
            ? section(
                "plans",
                "Floor Plans",
                html`<div class="plans">${plans.map((pl, i) => html`<figure><button type="button" data-plan="${i}" aria-label="Enlarge: ${pl.label ?? `plan ${i + 1}`}"><img src="${pl.src}" alt="${pl.label ?? "Floor plan"}" loading="lazy" /></button><figcaption>${pl.label ?? ""}</figcaption></figure>`)}</div>`,
              )
            : ""}

          ${p.brochure?.src
            ? section(
                "brochure",
                "Brochure",
                html`<div class="doc"><span class="doc__icon">${icon("doc", 22)}</span><span class="doc__text"><strong>${p.brochure.label ?? `${p.title} brochure`}</strong><span>PDF</span></span><a class="text-link" href="${p.brochure.src}" target="_blank" rel="noopener">Open</a><a class="btn btn--dark" href="${p.brochure.src}" download>${icon("download", 16)}Download</a></div>`,
              )
            : ""}

          ${place(p)
            ? section(
                "location",
                "Location",
                html`${typeof p.location?.lat === "number" ? html`<div class="pd-map" id="pd-map" role="region" aria-label="Satellite map of the area"></div><p class="fineprint">The circle marks the neighbourhood. The exact address is shared when you arrange a viewing.</p>` : html`<p>${place(p)}</p>`}
                  ${p.nearby?.length ? html`<ul class="nearby">${p.nearby.map((x) => html`<li>${icon("pin", 15)}${x}</li>`)}</ul>` : ""}
                  ${p.website ? html`<p><a class="text-link" href="${p.website}" target="_blank" rel="noopener">Visit the development's website</a></p>` : ""}`,
              )
            : ""}
        </div>

        <aside class="side" aria-label="Arrange a viewing">
          <p class="eyebrow">${PURPOSE_LABELS[p.purpose] ?? ""}${status ? ` · ${status}` : ""}</p>
          <p class="side__price">${formatPrice(p.price)}</p>
          <p class="fineprint">Ask a question, get the payment terms or book a visit.</p>
          ${actions("side")}
        </aside>
      </div>

      ${others.length ? html`<section class="more-props" aria-labelledby="more-h"><h2 id="more-h">Other Properties</h2><div class="cards">${others.map((x) => card(x))}</div></section>` : ""}

      <div class="buybar">
        <p class="buybar__price"><strong>${shortPrice(p.price)}</strong><span>${p.price?.on_request ? "Contact us" : "Total Price"}</span></p>
        ${actions("bar")}
      </div>`,
  );
  root.removeAttribute("aria-busy");

  // "See More" shows the whole description; it disappears when the text already fits.
  const aboutEl = document.getElementById("about-text");
  const more = document.getElementById("see-more");
  if (aboutEl.scrollHeight <= aboutEl.clientHeight + 2) more.hidden = true;
  more.addEventListener("click", () => {
    const open = aboutEl.classList.toggle("is-open");
    more.textContent = open ? "See Less" : "See More";
  });

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

  const mapEl = document.getElementById("pd-map");
  if (mapEl) {
    // The satellite map loads when it is about to scroll into view, then flies in and tilts.
    new IntersectionObserver(
      (entries, obs) => {
        if (!entries.some((x) => x.isIntersecting)) return;
        obs.disconnect();
        import("../map.js").then(async (m) => {
          await m.loadMapLibre();
          const at = m.lngLat(p);
          const map = m.createMap(mapEl, { center: at, zoom: 13, cooperative: true });
          m.addArea(map, at);
          map.once("load", () => {
            map.flyTo({ center: at, zoom: 15.3, pitch: 58, bearing: -20, duration: 3000, essential: true });
            map.once("moveend", () => m.orbit(map));
          });
        });
      },
      { rootMargin: "300px" },
    ).observe(mapEl);
  }
}
