// Shared engine for every page: safe HTML, icons, the header, menu and footer, and small helpers.
// There are no accounts: the site is a public listing of the portfolio.

// ---- Safe HTML -----------------------------------------------------------------------------------------
// html`<p>${value}</p>` escapes every value, so text from the data file can never become markup.
// Wrap trusted markup (our own icons or other html`` results) in raw() to insert it as-is.
const RAW = Symbol("raw");
export const raw = (markup) => ({ [RAW]: String(markup ?? "") });
export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function part(v) {
  if (v === null || v === undefined || v === false) return "";
  if (Array.isArray(v)) return v.map(part).join("");
  if (typeof v === "object" && RAW in v) return v[RAW];
  return esc(v);
}
export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((v, i) => (out += part(v) + strings[i + 1]));
  return raw(out);
}
// The final HTML string of a view, for insertAdjacentHTML.
export const markup = (view) => part(view);
export function render(target, view) {
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (el) el.innerHTML = part(view);
  return el;
}

// ---- Icons (outline, 24px grid) ------------------------------------------------------------------------
const PATHS = {
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5",
  home: "M4 10.5 12 4l8 6.5V20h-5v-5H9v5H4z",
  menu: "M4 7h16M4 12h16M4 17h16",
  sliders: "M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4",
  star: "M12 4l2.4 5 5.6.6-4.2 3.8 1.2 5.6L12 16.3 7 19l1.2-5.6L4 9.6 9.6 9z",
  layers: "M12 4 3 9l9 5 9-5zM3 14l9 5 9-5",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  map: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2",
  chat: "M4 5h16v11H8l-4 4z",
  mail: "M3 6h18v12H3zM3 6l9 7 9-7",
  arrow: "M5 12h14M13 6l6 6-6 6",
  back: "M15 18l-6-6 6-6",
  next: "M9 18l6-6-6-6",
  close: "M6 6l12 12M18 6 6 18",
  check: "M5 12l5 5 9-10",
  filter: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M14 4v4M8 10v4M16 16v4",
  pin: "M12 21s-7-7.4-7-12a7 7 0 0 1 14 0c0 4.6-7 12-7 12zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  photo: "M3 5h18v14H3zM8.5 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM21 16l-5-5-8 8",
  house: "M3 10.5 12 3l9 7.5M5 9v11h14V9M10 20v-5h4v5",
  share: "M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 3v12M7 8l5-5 5 5",
  bed: "M3 19v-8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8M3 15h18M6 9V6h5v3",
  bath: "M4 12h16v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM6 12V5a2 2 0 0 1 4 0M7 20l-1 2M17 20l1 2",
  area: "M4 4h16v16H4zM4 9h4M4 14h2M9 4v4M14 4v2",
  plot: "M3 20 8 4h8l5 16zM6 14h12M9.5 9h5",
  car: "M4 17v-4l2-6h12l2 6v4zM4 17v2M20 17v2M4 13h16M7.5 15h.01M16.5 15h.01",
  tour: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12c0 2.2 4 4 9 4s9-1.8 9-4M12 3c2.2 2.5 3 5.5 3 9s-.8 6.5-3 9",
  plan: "M4 4h16v16H4zM4 12h7M11 4v10M15 12h5M15 12v8",
  doc: "M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6",
  download: "M12 4v11M7 10l5 5 5-5M5 20h14",
  expand: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  play: "M8 5v14l11-7z",
};
export function icon(name, size = 22, stroke = 1.6) {
  return raw(
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PATHS[name]}"/></svg>`,
  );
}

// ---- Page shell ----------------------------------------------------------------------------------------
// Desktop: a white bar with links, a black "Contact" button and a menu button.
// Phones: the logo and a call button at the top, and a bottom bar (Home, Map, Contact).
const LINKS = [
  ["/", "Properties"],
  ["/?cat=sale", "For sale"],
  ["/?cat=rent", "For rent"],
  ["/map", "Map"],
];

function headerView() {
  return html`
    <a href="#main" class="skip-link">Skip to content</a>
    <header class="site-header">
      <div class="site-header__inner">
        <a href="/" class="logo" aria-label="Propertiq, home"><img class="logo-img" src="/brand/propertiq-logo.webp" alt="Propertiq" width="880" height="216" data-logo /></a>
        <nav class="site-nav" aria-label="Main">
          <ul>${LINKS.map(([href, label]) => html`<li><a href="${href}">${label}</a></li>`)}</ul>
        </nav>
        <div class="site-header__actions">
          <a class="btn btn--dark" href="/contact">Contact</a>
          <a class="icon-square" href="tel:" data-owner-tel aria-label="Call us">${icon("phone", 20)}</a>
          <button type="button" class="icon-square menu-btn" aria-expanded="false" aria-controls="menu" aria-label="Menu">${icon("menu", 20, 1.8)}</button>
        </div>
      </div>
    </header>
    <div class="menu" id="menu" hidden>
      <nav aria-label="Main">
        <ul>${[...LINKS, ["/contact", "Contact"]].map(([href, label], i) => html`<li style="--i:${i}"><a href="${href}">${label}</a></li>`)}</ul>
      </nav>
      <p class="menu__foot" data-owner-line></p>
    </div>`;
}

function bottomNavView(here) {
  const tabs = [
    ["/", "Home", "home"],
    ["/map", "Map", "map"],
    ["/contact", "Contact", "chat"],
  ];
  return html`<nav class="tabbar" aria-label="Quick links">
    <ul>${tabs.map(([href, label, ic]) => html`<li><a href="${href}" ${raw(here === href ? 'aria-current="page"' : "")}><span class="tabbar__icon">${icon(ic, 22, 1.7)}</span>${label}</a></li>`)}</ul>
  </nav>`;
}

function footerView() {
  return html`
    <footer class="site-footer">
      <div class="site-footer__inner">
        <section class="site-footer__cta" aria-labelledby="footer-cta">
          <h2 id="footer-cta">Seen something you like?</h2>
          <p>Tell us which property and when you'd like to visit. We'll take it from there.</p>
          <div class="site-footer__buttons" data-owner-buttons></div>
        </section>
        <nav class="site-footer__col" aria-label="Browse">
          <h3>Browse</h3>
          <ul>
            <li><a href="/">All properties</a></li>
            <li><a href="/?cat=sale">For sale</a></li>
            <li><a href="/?cat=rent">For rent</a></li>
            <li><a href="/?cat=commercial">Offices &amp; stores</a></li>
            <li><a href="/map">Map</a></li>
          </ul>
        </nav>
        <div class="site-footer__col">
          <h3>Talk to us</h3>
          <ul data-owner-talk></ul>
        </div>
        <div class="site-footer__col">
          <h3>Visit</h3>
          <address data-owner-address></address>
        </div>
      </div>
      <div class="site-footer__brand">
        <img class="logo-img" src="/brand/propertiq-logo.webp" alt="Propertiq" width="880" height="216" loading="lazy" data-logo />
        <p>© ${new Date().getFullYear()} Propertiq · Images of buildings still under way are artist's impressions.</p>
      </div>
    </footer>`;
}

// Draws the header, menu and footer around the page's <main>. Called once per page.
export function boot() {
  document.body.classList.add("app");
  document.body.insertAdjacentHTML("afterbegin", markup(headerView()));
  const here = ["/", "/map", "/contact"].includes(location.pathname) ? location.pathname : "";
  document.body.insertAdjacentHTML("beforeend", markup(footerView()) + markup(bottomNavView(here)));
  // If the logo file is missing, show the name in text instead.
  document.querySelectorAll("img[data-logo]").forEach((img) => {
    const fallback = () => img.replaceWith(Object.assign(document.createElement("span"), { className: "logo-text", textContent: "Propertiq" }));
    if (img.complete && img.naturalWidth === 0) fallback();
    else img.addEventListener("error", fallback, { once: true });
  });

  // Phones: "Menu" opens a full-screen menu; any link, Escape or the button closes it.
  const btn = document.querySelector(".menu-btn");
  const menu = document.getElementById("menu");
  const setOpen = (open) => {
    menu.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", open ? "Close menu" : "Menu");
    document.documentElement.classList.toggle("menu-open", open);
  };
  btn.addEventListener("click", () => setOpen(menu.hidden));
  menu.addEventListener("click", (e) => e.target.closest("a") && setOpen(false));
  document.addEventListener("keydown", (e) => e.key === "Escape" && !menu.hidden && setOpen(false));

  // The owner's details in the footer and menu come from the data file.
  import("./data.js").then(({ loadPortfolio }) =>
    loadPortfolio()
      .then(({ owner = {} }) => {
        const tel = owner.phone ? `tel:${owner.phone.replace(/\s/g, "")}` : null;
        const wa = owner.whatsapp ? `https://wa.me/${owner.whatsapp.replace(/\D/g, "")}` : null;
        document.querySelectorAll("[data-owner-talk]").forEach((el) =>
          render(el, html`${tel ? html`<li><a href="${tel}">${owner.phone}</a></li>` : ""}${wa ? html`<li><a href="${wa}" target="_blank" rel="noopener">WhatsApp</a></li>` : ""}${owner.email ? html`<li><a href="mailto:${owner.email}">${owner.email}</a></li>` : ""}`),
        );
        document.querySelectorAll("[data-owner-address]").forEach((el) => render(el, html`<span>${owner.location ?? "Accra, Ghana"}</span><a href="/contact">Directions</a>`));
        document.querySelectorAll("[data-owner-buttons]").forEach((el) =>
          render(el, html`${wa ? html`<a class="btn btn--light" href="${wa}" target="_blank" rel="noopener">Message on WhatsApp</a>` : ""}${tel ? html`<a class="btn btn--line" href="${tel}">Call ${owner.phone}</a>` : ""}`),
        );
        document.querySelectorAll("[data-owner-line]").forEach((el) => (el.textContent = [owner.phone, owner.email].filter(Boolean).join("   ·   ")));
        document.querySelectorAll("[data-owner-tel]").forEach((el) => (tel ? (el.href = tel) : el.remove()));
      })
      .catch(() => {}),
  );
  if ("serviceWorker" in navigator && location.hostname !== "localhost") navigator.serviceWorker.register("/sw.js").catch(() => {});
}

export const params = () => new URLSearchParams(location.search);
export function setTitle(title) {
  document.title = title ? `${title} · Propertiq` : "Propertiq";
}
export function toast(message) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = Object.assign(document.createElement("div"), { className: "toast", role: "status" });
    document.body.append(el);
  }
  el.textContent = message;
  el.classList.add("is-on");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("is-on"), 2200);
}
