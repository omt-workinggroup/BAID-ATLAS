// One property, laid out like the reference detail screen: a photo with the name, place and price, a
// stats card, section tabs, a photo grid, "About Property" with See more, then units, amenities, payment
// plan, 3D tour, floor plans, brochure and location. Phones get a bottom bar (price, Book a Viewing,
// Contact Agent); desktop gets the same actions in a side panel. Printing gives a clean details sheet.
import { SITE_URL } from "../config.js";
import { boot, html, icon, render, setTitle, toast } from "../core.js";
import { contactFor, PURPOSE_LABELS, STAGE_LABELS, STATUS_LABELS, cover, filterProperties, formatArea, formatPrice, hasTour, keyFacts, loadPortfolio, money, paymentPlan, place, shortPrice, small, waLink, whatsappLink } from "../data.js";
import { artwork, booklet, card, initials } from "../cards.js";
import { amenitiesOf } from "../amenities.js";
import { wireCollect } from "../collect.js";
import { isSaved } from "../store.js";
import { mountTour } from "../tour.js";
import { openViewer } from "../viewer.js";
import { openVisit } from "../visit.js";
import { awayFrom, locate, quietly } from "../here.js";

const STAT_NAMES = { bed: "Beds", bath: "Baths", car: "Parking", area: "Size", plot: "Land" };

boot();
wireCollect();
document.body.classList.add("page-detail");
const slug = decodeURIComponent(location.pathname.split("/").filter(Boolean)[1] ?? "");
const root = document.getElementById("pd");

let portfolio;
try {
  portfolio = await loadPortfolio();
} catch {
  render(root, html`<div class="lost"><h1>This page couldn't load.</h1><p>Please check your connection and refresh.</p></div>`);
}
const p = portfolio?.properties?.find((x) => x.slug === slug);
if (portfolio && !p) {
  render(root, html`<div class="lost"><p class="eyebrow">No longer listed</p><h1>This property isn't listed any more.</h1><p>It may have been sold or let.</p><div class="lost__actions"><a class="btn btn--dark" href="/">See the other properties</a></div></div>`);
}
// Contact buttons go to whoever lists the property (the owner, or a profile in "directory").
if (p) show(p, contactFor(p, portfolio));

function section(id, title, body) {
  return html`<section class="pd-section" id="${id}" aria-labelledby="${id}-h"><h2 id="${id}-h">${title}</h2>${body}</section>`;
}

// A property whose photos and details haven't arrived yet: its name, its drawn thumbnail and how to ask.
function showSoon(p, owner) {
  setTitle(p.title);
  const wa = waLink(owner.whatsapp, `Hello, please let me know when "${p.title}" is ready to view (${SITE_URL}/properties/${p.slug}).`);
  render(
    root,
    html`<section class="soon-page">
      <a class="round" href="/" aria-label="Back to properties">${icon("back", 20, 2)}</a>
      <div class="soon-page__art">${artwork(p)}</div>
      <p class="eyebrow">Coming soon</p>
      <h1>${p.title}</h1>
      <p>${p.summary ? `${p.summary} ` : ""}Photos, prices and floor plans are being prepared. Ask us and we'll share what we have.</p>
      <div class="soon-page__actions">
        ${wa ? html`<a class="btn btn--dark" href="${wa}" target="_blank" rel="noopener">${icon("chat", 18)}Tell me when it's ready</a>` : ""}
        <a class="btn btn--outline-tan" href="/agents">See who's building</a>
      </div>
    </section>`,
  );
  root.removeAttribute("aria-busy");
}

function show(p, owner) {
  if (p.coming_soon) return showSoon(p, owner);
  setTitle(p.title);
  document.querySelector('meta[name="description"]')?.setAttribute("content", p.summary ?? p.title);
  const url = `${SITE_URL}/properties/${p.slug}`;
  const photos = p.photos ?? [];
  const plans = p.floorplans ?? [];
  const wa = whatsappLink(owner.whatsapp, p, url);
  const tel = owner.phone ? `tel:${owner.phone.replace(/\s/g, "")}` : "/agents";
  const facts = keyFacts(p);
  const status = [p.stage && STAGE_LABELS[p.stage], p.status && p.status !== "available" ? STATUS_LABELS[p.status] : null].filter(Boolean).join(" · ");
  const about = [p.summary, ...String(p.description ?? "").split(/\n\s*\n/)].filter(Boolean);
  const amenities = amenitiesOf(p);
  const others = filterProperties((portfolio.properties ?? []).filter((x) => x.slug !== p.slug), { sort: "newest" }).slice(0, 3);
  const canBook = Boolean(owner.whatsapp || owner.email);
  const actions = (variant) => html`
    ${canBook ? html`<button type="button" class="btn btn--dark" data-visit>${variant === "side" ? icon("calendar", 18) : ""}Book a Viewing</button>` : ""}
    <a class="btn btn--outline-tan" href="${tel}">Contact Agent</a>
    ${variant === "side" && wa ? html`<a class="text-link" href="${wa}" target="_blank" rel="noopener">Ask a question on WhatsApp</a>` : ""}
    ${variant === "side" ? html`<div class="side__links">${p.brochure?.src ? html`<a href="${p.brochure.src}" download>${icon("download", 16)}Brochure</a>` : ""}<button type="button" data-print>${icon("print", 16)}Print details</button></div>` : ""}`;
  const plan = p.purpose === "sale" && p.price?.amount && !p.price.on_request && p.price.period !== "month" ? p.price : null;
  const tabs = [
    ["about-property", "Overview"],
    p.unit_types?.length && ["units", "Units"],
    p.features?.length && ["amenities", "Amenities"],
    plan && ["payment", "Payment plan"],
    hasTour(p) && ["tour", "3D Tour"],
    plans.length && ["plans", "Floor Plans"],
    p.brochure?.src && ["brochure", "Brochure"],
    place(p) && ["location", "Location"],
  ].filter(Boolean);

  render(
    root,
    html`
      <section class="pd-top" aria-labelledby="pd-title">
        ${cover(p) ? html`<img src="${cover(p).src}" alt="${cover(p).alt ?? p.title}" fetchpriority="high" />` : ""}
        <div class="pd-top__bar">
          <a class="round" href="/" aria-label="Back to properties">${icon("back", 20, 2)}</a>
          <div>
            <button type="button" class="round" data-save="${p.slug}" aria-pressed="${isSaved(p.slug) ? "true" : "false"}" aria-label="Save">${icon("heart", 18, 1.8)}</button>
            <button type="button" class="round" id="share" aria-label="Share">${icon("share", 18, 1.8)}</button>
          </div>
        </div>
        ${p.renders ? html`<span class="pd-top__note">Artist's impression</span>` : ""}
        <div class="pd-top__text">
          <div>
            <h1 id="pd-title">${p.title}</h1>
            <p class="pd-top__place">${icon("pin", 15)}${place(p)}<span id="pd-away-top"></span></p>
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

      <nav class="pd-tabs" aria-label="On this page"><ul>${tabs.map(([id, label], i) => html`<li><a href="#${id}" ${i === 0 ? html`aria-current="true"` : ""}>${label}</a></li>`)}</ul></nav>

      <div class="pd-layout">
        <div class="pd-main">
          ${photos.length > 1
            ? html`<div class="photos">
                ${photos.slice(0, 4).map(
                  (ph, i) => html`<button type="button" data-photo="${i}" aria-label="Open image ${i + 1} of ${photos.length}">
                    <img src="${small(ph)}" alt="${ph.alt ?? ""}" loading="lazy" decoding="async" />
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

          ${amenities.found.length || amenities.other.length
            ? section(
                "amenities",
                "Amenities",
                html`${amenities.found.length ? html`<ul class="amen">${amenities.found.map(([ic, label, text]) => html`<li title="${text}">${icon(ic, 40, 1.2)}<span>${label}</span></li>`)}</ul>` : ""}
                  ${amenities.other.length ? html`<ul class="ticks">${amenities.other.map((x) => html`<li>${icon("check", 16, 2.2)}${x}</li>`)}</ul>` : ""}`,
              )
            : ""}

          ${plan
            ? section(
                "payment",
                "Payment Plan",
                html`<div class="planner" id="planner">
                  <div class="planner__inputs">
                    <label class="range"><span>Deposit <output id="pl-dep-out">30%</output></span><span class="range__rail"><span class="range__fill"></span><input type="range" id="pl-dep" min="10" max="60" step="5" value="30" /></span></label>
                    <label class="range"><span>Balance spread over <output id="pl-mo-out">12 months</output></span><span class="range__rail"><span class="range__fill"></span><input type="range" id="pl-mo" min="3" max="36" step="3" value="12" /></span></label>
                  </div>
                  <div class="planner__result">
                    <p class="planner__big"><strong id="pl-monthly"></strong><span>a month</span></p>
                    <div class="planner__bar" aria-hidden="true"><span id="pl-bar"></span></div>
                    <dl>
                      <div><dt><i class="dot dot--tan"></i>Deposit</dt><dd id="pl-deposit"></dd></div>
                      <div><dt><i class="dot"></i>Balance</dt><dd id="pl-balance"></dd></div>
                      <div><dt>Total</dt><dd>${money(plan.currency, plan.amount)}</dd></div>
                    </dl>
                    ${owner.whatsapp ? html`<a class="btn btn--dark" id="pl-ask" href="#" target="_blank" rel="noopener">Ask about payment terms</a>` : ""}
                  </div>
                </div>
                <p class="fineprint">A guide only: equal monthly payments with no interest added. Ask us for the actual payment terms.</p>`,
              )
            : ""}

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
                html`${p.brochure.pages?.length ? booklet(p) : ""}
                  <div class="doc"><span class="doc__icon">${icon("doc", 22)}</span><span class="doc__text"><strong>${p.brochure.label ?? `${p.title} brochure`}</strong><span>PDF</span></span><a class="text-link" href="${p.brochure.src}" target="_blank" rel="noopener">Open</a><a class="btn btn--dark" href="${p.brochure.src}" download>${icon("download", 16)}Download</a></div>`,
              )
            : ""}

          ${place(p)
            ? section(
                "location",
                "Location",
                html`${typeof p.location?.lat === "number" ? html`<div class="pd-map" id="pd-map" role="region" aria-label="Satellite map of the area"></div><p class="fineprint">The circle marks the neighbourhood. The exact address is shared when you arrange a viewing.</p><p class="away" id="pd-away"><button type="button" class="near" data-near>How far is it from me?</button></p>` : html`<p>${place(p)}</p>`}
                  ${p.nearby?.length ? html`<ul class="nearby">${p.nearby.map((x) => html`<li>${icon("pin", 15)}${x}</li>`)}</ul>` : ""}
                  <p class="pd-links">${typeof p.location?.lat === "number" ? html`<a class="btn btn--dark" href="/map?p=${p.slug}&directions=1">${icon("route", 17)}Directions</a><a class="text-link" href="/map?p=${p.slug}">Open on the map</a>` : ""}${p.website ? html`<a class="text-link" href="${p.website}" target="_blank" rel="noopener">Visit the development's website</a>` : ""}</p>`,
              )
            : ""}
        </div>

        <aside class="side" aria-label="Arrange a viewing">
          <p class="eyebrow">${PURPOSE_LABELS[p.purpose] ?? ""}${status ? ` · ${status}` : ""}</p>
          <p class="side__price">${formatPrice(p.price)}</p>
          ${p.listed_by ?? owner.name ? html`<p class="side__by"><span class="av">${initials(p.listed_by ?? owner.name)}</span><span>Listed by <strong>${p.listed_by ?? owner.name}</strong></span></p>` : ""}
          <p class="fineprint">Ask a question, get the payment terms or book a visit.</p>
          ${actions("side")}
          <p class="print-only">${[owner.phone, owner.email, `${SITE_URL}/properties/${p.slug}`].filter(Boolean).join("  ·  ")}</p>
        </aside>
      </div>

      ${others.length ? html`<section class="more-props" aria-labelledby="more-h"><h2 id="more-h">Other Properties</h2><div class="cards">${others.map((x) => card(x, { owner }))}</div></section>` : ""}

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

  // Payment planner: the deposit and the months update the monthly figure as the sliders move.
  if (plan) {
    const dep = document.getElementById("pl-dep");
    const mo = document.getElementById("pl-mo");
    const ask = document.getElementById("pl-ask");
    const draw = () => {
      const r = paymentPlan(plan.amount, Number(dep.value), Number(mo.value));
      document.getElementById("pl-dep-out").textContent = `${dep.value}%`;
      document.getElementById("pl-mo-out").textContent = `${mo.value} months`;
      document.getElementById("pl-monthly").textContent = money(plan.currency, r.monthly);
      document.getElementById("pl-deposit").textContent = money(plan.currency, r.deposit);
      document.getElementById("pl-balance").textContent = money(plan.currency, r.balance);
      document.getElementById("pl-bar").style.width = `${dep.value}%`;
      [dep, mo].forEach((x) => x.parentElement.style.setProperty("--fill", `${((x.value - x.min) / (x.max - x.min)) * 100}%`));
      if (ask) ask.href = waLink(owner.whatsapp, `Hello, about "${p.title}" (${url}): could I pay a ${dep.value}% deposit (${money(plan.currency, r.deposit)}) and the balance over ${mo.value} months? What payment terms do you offer?`);
    };
    dep.addEventListener("input", draw);
    mo.addEventListener("input", draw);
    draw();
  }

  // Section tabs: the tab for the section being read is highlighted, and scrolls into view in the bar.
  const tabLinks = [...root.querySelectorAll(".pd-tabs a")];
  const spy = new IntersectionObserver(
    (entries) => {
      const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!top) return;
      tabLinks.forEach((a) => {
        const on = a.getAttribute("href") === `#${top.target.id}`;
        if (on) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
        if (on) a.parentElement.parentElement.scrollTo({ left: a.offsetLeft - 16 });
      });
    },
    { rootMargin: "-35% 0px -55% 0px" },
  );
  tabs.forEach(([id]) => document.getElementById(id) && spy.observe(document.getElementById(id)));

  root.addEventListener("click", (e) => {
    if (e.target.closest("[data-visit]")) openVisit(p, owner, url);
    if (e.target.closest("[data-print]")) window.print();
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

  // How far the visitor is: shown at once if they have already allowed it, otherwise on request.
  const awayLine = document.getElementById("pd-away");
  if (awayLine) {
    const at = [p.location.lng, p.location.lat];
    const showAway = (here) => {
      const km = awayFrom(here, at);
      document.getElementById("pd-away-top").textContent = ` · ${km} from you`;
      render(awayLine, html`${icon("locate", 16)}<span>You're <strong>${km}</strong> away, in a straight line.</span>`);
    };
    quietly().then((here) => here && showAway(here));
    awayLine.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-near]");
      if (!btn) return;
      btn.disabled = true;
      btn.textContent = "Finding you…";
      locate()
        .then(showAway)
        .catch((err) => {
          toast(err.message);
          btn.disabled = false;
          btn.textContent = "How far is it from me?";
        });
    });
  }

  const mapEl = document.getElementById("pd-map");
  if (mapEl) {
    // The satellite map loads when it is about to scroll into view, already tilted over the area.
    new IntersectionObserver(
      (entries, obs) => {
        if (!entries.some((x) => x.isIntersecting)) return;
        obs.disconnect();
        import("../map.js").then(async (m) => {
          await m.loadMapLibre();
          const at = m.lngLat(p);
          const map = m.createMap(mapEl, { center: at, zoom: 15.3, pitch: 50, cooperative: true });
          m.addArea(map, at);
        });
      },
      { rootMargin: "300px" },
    ).observe(mapEl);
  }
}
