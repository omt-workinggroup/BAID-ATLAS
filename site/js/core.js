// Shared engine for every page: safe HTML, icons, the header, menu and bottom bar, and small helpers.
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
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  locate: "M12 3v3M12 18v3M3 12h3M18 12h3M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  route: "M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 15V9a4 4 0 0 1 4-4h6M18 9v6a4 4 0 0 1-4 4H8",
  stop: "M7 7h10v10H7z",
  print: "M7 9V3h10v6M7 17H4v-8h16v8h-3M7 14h10v7H7z",
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
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  people: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20a6 6 0 0 1 12 0M10 20a6 6 0 0 1 12 0",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9M12 3C9.5 5.6 8.3 8.6 8.3 12s1.2 6.4 3.7 9",
  instagram: "M4 4h16v16H4zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM17 7h.01",
  facebook: "M14 21v-8h3l.5-3.5H14V8c0-1 .4-1.6 1.7-1.6H18V3.3A23 23 0 0 0 15.4 3C12.8 3 11 4.6 11 7.5v2H8V13h3v8",
  linkedin: "M4 9h4v11H4zM6 4.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM11 9h4v1.6c.6-1 1.8-1.8 3.4-1.8 3 0 3.6 2 3.6 4.6V20h-4v-5.6c0-1.3-.2-2.4-1.6-2.4s-1.7 1.1-1.7 2.3V20h-4z",
  x: "M4 4l16 16M20 4 4 20",
  tiktok: "M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.5 2.5 2.4 4.3 5 4.5",
  youtube: "M3 7.5C3 6 4 5 5.5 5h13C20 5 21 6 21 7.5v9c0 1.5-1 2.5-2.5 2.5h-13C4 19 3 18 3 16.5zM10 9v6l5-3z",
  crane: "M4 21h8M7 21V5l12 3M7 5l4 16M19 8v5M17 13h4v3h-4z",
  building: "M4 21V5l8-2v18M12 9h8v12M7 8h2M7 12h2M7 16h2M15 13h2M15 17h2M2 21h20",
  gate: "M3 21V8l9-5 9 5v13M7 21v-9h10v9M10 12v9M14 12v9",
  walk: "M13 4.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM10 22l2-7 3 3v6M8 12l2-5 4 1 2 4 3 1M12 15l-1.5-6",
  turn: "M9 20V10a4 4 0 0 1 4-4h6M15 2l4 4-4 4",
  verified: "M12 3l2.3 1.7 2.8-.2.9 2.7 2.3 1.6-.9 2.7.9 2.7-2.3 1.6-.9 2.7-2.8-.2L12 21l-2.3-1.7-2.8.2-.9-2.7L3.7 15.2l.9-2.7-.9-2.7 2.3-1.6.9-2.7 2.8.2zM8.5 12l2.5 2.5 4.5-5",
  // Amenities (line icons in the style of the rest)
  wifi: "M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01",
  kitchen: "M3 10h18v11H3zM3 14h18M7 10V3h4v4H7M14 3h6v4h-6M8 17h3M15 17h2",
  ac: "M2 5h20v8H2zM5 10h14M7 16l-1 3M10.5 16l-.5 3M13.5 16l.5 3M17 16l1 3",
  generator: "M3 6h18v12H3zM10 9l-3 4h4l-2 4M14 10h4M14 13h4M6 18v2M18 18v2",
  water: "M5 4h14M6 4v12l3 4h6l3-4V4M9 8h2M9 11h2M9 14h2",
  pool: "M2 18c2 0 2-1.5 4-1.5S8 18 10 18s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5M2 21c2 0 2-1.5 4-1.5S8 21 10 21s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5M8 15V5a2 2 0 0 1 4 0M14 15V5a2 2 0 0 1 4 0M8 8h6M8 12h6",
  gym: "M6.5 6.5l11 11M3 10l7-7M14 21l7-7M5 12l7-7M12 19l7-7",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4",
  lift: "M5 3h14v18H5zM12 3v18M8.5 8l1.5-2 1.5 2M14 16l1.5 2 1.5-2",
  balcony: "M3 12h18M5 12v8M9 12v8M15 12v8M19 12v8M3 20h18M7 12V4h10v8",
  smart: "M7 2h10v20H7zM11 18h2M12 6a3 3 0 0 1 3 3M12 3.5a5.5 5.5 0 0 1 5.5 5.5",
  shop: "M3 9l2-5h14l2 5M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0zM5 13v8h14v-8M10 21v-5h4v5",
  keys: "M8 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM11 11h10M18 11v3M21 11v2",
  garden: "M12 21v-8M12 13c-4 0-6-3-6-7 4 0 6 3 6 7zM12 13c4 0 6-3 6-7-4 0-6 3-6 7zM5 21h14",
  window: "M4 3h16v18H4zM12 3v18M4 12h16",
  floor: "M3 21 21 3M3 15 15 3M3 9l6-6M9 21 21 9M15 21l6-6",
  paint: "M4 4h13v5H4zM17 6h3v6h-8v3M11 15h2v6h-2z",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7z",
  cctv: "M3 7l12-4 2 6-12 4zM7 12l1 4h4M15 9l4 1M2 20h7v-4",
  people2: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M16 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 6",
};
export function icon(name, size = 22, stroke = 1.6) {
  return raw(
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PATHS[name]}"/></svg>`,
  );
}

// ---- Page shell ----------------------------------------------------------------------------------------
// Desktop: a black bar with links, a WhatsApp button, a profile button and a menu button.
// Phones: the logo and a call button at the top, and a bottom bar (Home, Map, Agents, Profile).
const LINKS = [
  ["/", "Properties"],
  ["/?cat=sale", "For sale"],
  ["/?cat=rent", "For rent"],
  ["/map", "Map"],
  ["/agents", "Agents & developers"],
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
          <a class="btn btn--dark" href="/agents" data-owner-wa target="_blank" rel="noopener">WhatsApp us</a>
          <a class="icon-square profile-btn" href="/profile" aria-label="Profile: sign in or sign up">${icon("user", 20)}</a>
          <a class="icon-square" href="tel:" data-owner-tel aria-label="Call us">${icon("phone", 20)}</a>
          <button type="button" class="icon-square menu-btn" aria-expanded="false" aria-controls="menu" aria-label="Menu">${icon("menu", 20, 1.8)}</button>
        </div>
      </div>
    </header>
    <div class="menu" id="menu" hidden>
      <nav aria-label="Main">
        <ul>${[...LINKS, ["/profile", "Profile"]].map(([href, label], i) => html`<li style="--i:${i}"><a href="${href}">${label}</a></li>`)}</ul>
      </nav>
      <p class="menu__foot" data-owner-line></p>
    </div>`;
}

function bottomNavView(here) {
  const tabs = [
    ["/", "Home", "home"],
    ["/map", "Map", "map"],
    ["/agents", "Agents", "people"],
    ["/profile", "Profile", "user"],
  ];
  return html`<nav class="tabbar" aria-label="Quick links">
    <ul>${tabs.map(([href, label, ic]) => html`<li><a href="${href}" ${raw(here === href ? 'aria-current="page"' : "")}><span class="tabbar__icon">${icon(ic, 22, 1.7)}</span>${label}</a></li>`)}</ul>
  </nav>`;
}

// Draws the header, menu and bottom bar around the page's <main>. Called once per page.
export function boot() {
  document.body.classList.add("app");
  document.body.insertAdjacentHTML("afterbegin", markup(headerView()));
  const here = ["/", "/map", "/agents", "/profile"].includes(location.pathname) ? location.pathname : "";
  document.body.insertAdjacentHTML("beforeend", markup(bottomNavView(here)));
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

  // The phone number for the call button and the menu comes from the data file.
  import("./data.js").then(({ loadPortfolio }) =>
    loadPortfolio()
      .then(({ owner = {} }) => {
        const tel = owner.phone ? `tel:${owner.phone.replace(/\s/g, "")}` : null;
        document.querySelectorAll("[data-owner-line]").forEach((el) => (el.textContent = [owner.phone, owner.email].filter(Boolean).join("   ·   ")));
        document.querySelectorAll("[data-owner-tel]").forEach((el) => (tel ? (el.href = tel) : el.remove()));
        const wa = owner.whatsapp ? `https://wa.me/${owner.whatsapp.replace(/\D/g, "")}` : null;
        document.querySelectorAll("[data-owner-wa]").forEach((el) => (wa ? (el.href = wa) : el.removeAttribute("target")));
      })
      .catch(() => {}),
  );
  // The header link for the page being viewed is marked, so it carries the underline.
  const here2 = location.pathname + location.search;
  document.querySelectorAll(".site-nav a").forEach((a) => a.getAttribute("href") === here2 && a.setAttribute("aria-current", "page"));
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
