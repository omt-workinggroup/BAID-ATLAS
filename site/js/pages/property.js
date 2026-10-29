// One property: photo hero, key facts, photos, 3D tour, floor plans, brochure, location and contact.
import { SITE_URL } from "../config.js";
import { boot, html, icon, raw, render, setTitle, toast } from "../core.js";
import { PURPOSE_LABELS, STAGE_LABELS, STATUS_LABELS, TYPE_LABELS, formatArea, cover, filterProperties, formatPrice, hasTour, keyFacts, loadPortfolio, place, shortPrice, whatsappLink } from "../data.js";
import { noPhoto, propertyCard } from "../cards.js";
import { mountTour } from "../tour.js";
import { openViewer } from "../viewer.js";

boot();
const slug = decodeURIComponent(location.pathname.split("/").filter(Boolean)[1] ?? "");
const root = document.getElementById("pd");

let portfolio;
try {
  portfolio = await loadPortfolio();
} catch {
  render(root, html`<div class="empty"><h1>We couldn't load this property.</h1><p>Please refresh the page.</p></div>`);
}
const p = portfolio?.properties?.find((x) => x.slug === slug);
if (portfolio && !p) {
  render(root, html`<div class="empty"><h1>This property isn't listed any more.</h1><p>It may have been sold or let. Have a look at the rest of the portfolio.</p><a class="btn" href="/">See all properties</a></div>`);
}
if (p) show(p, portfolio.owner ?? {});

function show(p, owner) {
  setTitle(p.title);
  document.querySelector('meta[name="description"]')?.setAttribute("content", p.summary ?? p.title);
  const url = `${SITE_URL}/properties/${p.slug}`;
  const photos = p.photos ?? [];
  const plans = p.floorplans ?? [];
  const closed = p.status && p.status !== "available";
  const wa = whatsappLink(owner.whatsapp, p, url);
  const sections = [
    ["overview", "Overview", true],
    ["photos", `${p.renders ? "Gallery" : "Photos"} (${photos.length})`, photos.length > 0],
    ["tour", "3D tour", hasTour(p)],
    ["plans", "Floor plans", plans.length > 0],
    ["brochure", "Brochure", Boolean(p.brochure?.src)],
    ["location", "Location", Boolean(place(p))],
  ].filter((s) => s[2]);

  const contactButtons = (compact) => html`
    ${wa ? html`<a class="btn btn--whatsapp ${raw(compact ? "" : "btn--full")}" href="${wa}" target="_blank" rel="noopener">${icon("chat", 18)}WhatsApp</a>` : ""}
    ${owner.phone ? html`<a class="btn ${raw(compact ? "btn--light" : "btn--outline btn--full")}" href="tel:${owner.phone}">${icon("phone", 18)}Call</a>` : ""}
    ${!compact && owner.email ? html`<a class="btn btn--outline btn--full" href="mailto:${owner.email}?subject=${encodeURIComponent(p.title)}&body=${encodeURIComponent(`Hello, I'm interested in ${p.title} (${url}).`)}">${icon("mail", 18)}Email</a>` : ""}
    ${!wa && !owner.phone && !owner.email ? html`<a class="btn ${raw(compact ? "btn--light" : "btn--full")}" href="/contact">Contact</a>` : ""}`;

  const facts = keyFacts(p);
  const similar = filterProperties((portfolio.properties ?? []).filter((x) => x.slug !== p.slug && x.purpose === p.purpose), { sort: "newest" }).slice(0, 3);

  render(
    root,
    html`
      <section class="pd-hero" aria-labelledby="pd-title">
        ${cover(p) ? html`<img src="${cover(p).src}" alt="${cover(p).alt ?? p.title}" fetchpriority="high" />` : noPhoto()}
        ${p.renders ? html`<span class="pd-hero__note">Artist's impression</span>` : ""}
        <div class="pd-hero__controls">
          <a class="round-btn" href="/" aria-label="All properties">${icon("back", 20, 2)}</a>
          <div>
            <button type="button" class="round-btn" id="share" aria-label="Share">${icon("share", 19)}</button>
          </div>
        </div>
        <div class="pd-hero__text">
          <div class="row wrap" style="gap: 0.4rem">
            <span class="tag tag--light">${PURPOSE_LABELS[p.purpose] ?? ""}</span>
            ${TYPE_LABELS[p.type] ? html`<span class="tag tag--light">${TYPE_LABELS[p.type]}</span>` : ""}
            ${STAGE_LABELS[p.stage] ? html`<span class="tag tag--light">${STAGE_LABELS[p.stage]}</span>` : ""}
            ${closed ? html`<span class="tag tag--dark">${STATUS_LABELS[p.status]}</span>` : ""}
          </div>
          <h1 id="pd-title">${p.title}</h1>
          ${place(p) ? html`<p class="pd-hero__place">${icon("pin", 16)}${place(p)}</p>` : ""}
          <p class="pd-hero__price">${formatPrice(p.price)}</p>
          <div class="pd-hero__actions">
            ${hasTour(p) ? html`<a class="btn btn--light" href="#tour" data-start-tour>${icon("tour", 18)}Take the 3D tour</a>` : ""}
            ${photos.length ? html`<button type="button" class="btn btn--glass" data-photo="0">${icon("photo", 18)}${photos.length} ${p.renders ? "images" : "photos"}</button>` : ""}
            ${plans.length ? html`<a class="btn btn--glass" href="#plans">${icon("plan", 18)}Floor plans</a>` : ""}
          </div>
        </div>
      </section>

      <nav class="pd-tabs" aria-label="On this page">${sections.map(([id, label]) => html`<a href="#${id}">${label}</a>`)}</nav>

      <div class="pd-layout">
        <div class="pd-main">
          <section class="pd-section" id="overview" aria-labelledby="overview-h">
            <h2 id="overview-h">Overview</h2>
            ${facts.length ? html`<ul class="facts">${facts.map(([ic, t]) => html`<li class="fact">${icon(ic, 22)}<span>${t}</span></li>`)}</ul>` : ""}
            ${p.summary ? html`<p class="bold" style="font-size: 1.1rem">${p.summary}</p>` : ""}
            ${p.description ? html`<div class="prose">${String(p.description).split(/\n\s*\n/).map((para) => html`<p>${para}</p>`)}</div>` : ""}
            ${p.unit_types?.length
              ? html`<h3 style="margin-top: 0.5rem">${p.units ? `Units · ${p.units}` : "Units"}</h3>
                  <div class="units">${p.unit_types.map(
                    (u) => html`<div class="unit"><strong>${u.name}</strong>${formatArea(u.size) ? html`<span>${formatArea(u.size)}</span>` : ""}${u.note ? html`<span>${u.note}</span>` : ""}</div>`,
                  )}</div>`
              : p.units
                ? html`<p><strong>Units:</strong> ${p.units}</p>`
                : ""}
            ${p.features?.length ? html`<h3 style="margin-top: 0.5rem">Features</h3><ul class="features">${p.features.map((x) => html`<li>${icon("check", 18, 2.2)}${x}</li>`)}</ul>` : ""}
            ${p.developer ? html`<p class="small muted">Developer: ${p.developer}</p>` : ""}
          </section>

          ${photos.length
            ? html`<section class="pd-section" id="photos" aria-labelledby="photos-h">
                <h2 id="photos-h">${p.renders ? "Gallery" : "Photos"}</h2>
                ${p.renders ? html`<p class="small muted">These images are artist's impressions of the finished development.</p>` : ""}
                <div class="mosaic">
                  ${photos.slice(0, 5).map(
                    (ph, i) => html`<button type="button" data-photo="${i}" aria-label="Open photo ${i + 1} of ${photos.length}${ph.caption ? `: ${ph.caption}` : ""}">
                      <img src="${ph.src}" alt="${ph.alt ?? ""}" loading="lazy" decoding="async" />
                      ${i === 4 && photos.length > 5 ? html`<span class="mosaic__more">+${photos.length - 5} more</span>` : ""}
                    </button>`,
                  )}
                </div>
              </section>`
            : ""}

          ${hasTour(p)
            ? html`<section class="pd-section" id="tour" aria-labelledby="tour-h">
                <h2 id="tour-h">3D tour</h2>
                <p class="muted">Walk through the property: drag to look around, pinch or scroll to zoom, and tap the white circles to move between rooms.</p>
                <div id="tour-root"></div>
              </section>`
            : ""}

          ${plans.length
            ? html`<section class="pd-section" id="plans" aria-labelledby="plans-h">
                <h2 id="plans-h">Floor plans</h2>
                <div class="plans">
                  ${plans.map((pl, i) => html`<button type="button" class="plan" data-plan="${i}"><img src="${pl.src}" alt="${pl.label ?? "Floor plan"}" loading="lazy" /><span>${pl.label ?? `Plan ${i + 1}`}${icon("expand", 18)}</span></button>`)}
                </div>
              </section>`
            : ""}

          ${p.brochure?.src
            ? html`<section class="pd-section" id="brochure" aria-labelledby="brochure-h">
                <h2 id="brochure-h">Brochure</h2>
                <div class="brochure">
                  <span class="brochure__icon">${icon("doc", 26)}</span>
                  <div class="brochure__text"><strong>${p.brochure.label ?? `${p.title} brochure`}</strong><p>PDF with the full details, ready to print or share.</p></div>
                  <div class="brochure__actions">
                    <a class="btn btn--light" href="${p.brochure.src}" target="_blank" rel="noopener" aria-label="View the brochure">View</a>
                    <a class="btn btn--glass" href="${p.brochure.src}" download>${icon("download", 18)}Download</a>
                  </div>
                </div>
              </section>`
            : ""}

          ${place(p)
            ? html`<section class="pd-section" id="location" aria-labelledby="location-h">
                <h2 id="location-h">Location</h2>
                <p class="row" style="gap: 0.4rem">${icon("pin", 18)}${[p.location?.area, p.location?.city, p.location?.region].filter(Boolean).join(", ")}</p>
                ${p.nearby?.length ? html`<ul class="features">${p.nearby.map((x) => html`<li>${icon("pin", 18)}${x}</li>`)}</ul>` : ""}
                ${typeof p.location?.lat === "number" ? html`<div id="area-map" class="map--area" role="region" aria-label="Map of the area"></div><p class="tiny muted">The circle shows the area. The exact address is shared when you arrange a viewing.</p>` : ""}
              </section>`
            : ""}
        </div>

        <aside class="enquire" aria-label="Contact about this property">
          <p class="enquire__status ${raw(closed ? "enquire__status--closed" : "")}">${STATUS_LABELS[p.status ?? "available"]}</p>
          <p class="enquire__price">${formatPrice(p.price)}</p>
          ${p.price?.negotiable ? html`<p class="small muted">Open to offers</p>` : ""}
          <p class="small muted">Ask a question or arrange a viewing.</p>
          ${contactButtons(false)}
          ${p.brochure?.src ? html`<a class="btn btn--outline btn--full" href="${p.brochure.src}" download>${icon("download", 18)}Brochure</a>` : ""}
          ${p.website ? html`<a class="link small" href="${p.website}" target="_blank" rel="noopener" style="text-align: center">Visit the development's website ↗</a>` : ""}
        </aside>
      </div>

      ${similar.length
        ? html`<section class="pd-section" aria-labelledby="similar-h">
            <h2 id="similar-h">More ${(PURPOSE_LABELS[p.purpose] ?? "").toLowerCase()}</h2>
            <div class="pgrid">${similar.map((x) => propertyCard(x))}</div>
          </section>`
        : ""}

      <div class="action-bar">
        <span class="action-bar__price">${shortPrice(p.price)}</span>
        ${contactButtons(true)}
      </div>`,
  );
  root.removeAttribute("aria-busy");

  // Photos and plans open full screen.
  root.addEventListener("click", (e) => {
    const ph = e.target.closest("[data-photo]");
    if (ph) openViewer(photos.map((x) => ({ src: x.src, alt: x.alt, caption: x.caption })), Number(ph.dataset.photo));
    const pl = e.target.closest("[data-plan]");
    if (pl) openViewer(plans.map((x) => ({ src: x.src, alt: x.label, caption: x.label })), Number(pl.dataset.plan), { plan: true });
  });

  document.getElementById("share").addEventListener("click", async () => {
    if (navigator.share) {
      navigator.share({ title: p.title, text: `${p.title} — ${formatPrice(p.price)}`, url }).catch(() => {});
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied");
    } catch {
      toast(url);
    }
  });

  if (hasTour(p)) {
    const tour = mountTour(document.getElementById("tour-root"), p.tour, { poster: p.tour.poster ?? cover(p)?.src, title: p.title });
    root.querySelector("[data-start-tour]")?.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("tour").scrollIntoView({ behavior: "smooth", block: "start" });
      tour.start();
    });
    if (location.hash === "#tour") tour.start();
  }

  if (typeof p.location?.lat === "number") {
    // The map only loads when it is about to scroll into view.
    const el = document.getElementById("area-map");
    new IntersectionObserver((entries, obs) => {
      if (!entries.some((x) => x.isIntersecting)) return;
      obs.disconnect();
      import("../map.js").then(async (m) => {
        await m.loadLeaflet();
        m.areaMap(el, p.location.lat, p.location.lng);
      });
    }, { rootMargin: "300px" }).observe(el);
  }
}
