// Shared engine for every page: safe HTML, icons, the header, footer and bottom bar, saved properties
// (kept on this device only) and small helpers. There are no accounts: the site is a public portfolio.

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

// ---- Saved properties (this device only, no account needed) -------------------------------------------
const SAVED_KEY = "propertiq-saved";
export function savedSlugs() {
  try {
    const v = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}
export function toggleSaved(slug) {
  const list = savedSlugs();
  const next = list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug];
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(next));
  } catch {
    // Private browsing: saving simply doesn't stick.
  }
  return next.includes(slug);
}
// Heart buttons anywhere inside root: data-save="<slug>".
export function wireSaveButtons(root = document) {
  const mark = () => {
    const saved = savedSlugs();
    root.querySelectorAll("[data-save]").forEach((b) => b.setAttribute("aria-pressed", String(saved.includes(b.dataset.save))));
  };
  root.addEventListener("click", (e) => {
    const b = e.target.closest("[data-save]");
    if (!b) return;
    e.preventDefault();
    const on = toggleSaved(b.dataset.save);
    mark();
    toast(on ? "Saved on this device" : "Removed from saved");
  });
  mark();
}

// ---- Page shell ----------------------------------------------------------------------------------------
const NAV = [
  { href: "/properties", label: "Properties", icon: "grid", match: (p, s) => (p === "/properties" && !s.includes("view=map")) || p.startsWith("/properties/") },
  { href: "/properties?view=map", label: "Map", icon: "map", match: (p, s) => p === "/properties" && s.includes("view=map") },
  { href: "/saved", label: "Saved", icon: "heart", match: (p) => p === "/saved" },
  { href: "/contact", label: "Contact", icon: "chat", match: (p) => p === "/contact" },
];
const CATEGORIES = [
  ["/properties?purpose=sale", "For sale"],
  ["/properties?purpose=rent", "For rent"],
  ["/properties?type=land", "Land"],
  ["/properties?type=commercial", "Commercial"],
];

function headerView(path, search) {
  const here = path + search;
  return html`
    <a href="#main" class="skip-link">Skip to content</a>
    <header class="site-header">
      <div class="site-header__inner">
        <a href="/" class="logo" aria-label="Propertiq home"><img class="logo-img" src="/brand/propertiq-logo.webp" alt="Propertiq" width="880" height="216" data-logo /></a>
        <nav class="top-nav" aria-label="Primary">
          <ul>
            <li><a href="/properties" ${raw(path === "/properties" && !search ? 'aria-current="page"' : "")}>All properties</a></li>
            ${CATEGORIES.map(([href, label]) => html`<li><a href="${href}" ${raw(here === href ? 'aria-current="page"' : "")}>${label}</a></li>`)}
            <li><a href="/saved" ${raw(path === "/saved" ? 'aria-current="page"' : "")}>Saved</a></li>
          </ul>
        </nav>
        <a href="/contact" class="header-cta">Contact</a>
      </div>
    </header>`;
}

function bottomNavView(path, search) {
  return html`
    <nav class="bottom-nav" aria-label="Primary">
      <ul>
        ${NAV.map((n) => html`<li><a href="${n.href}" ${raw(n.match(path, search) ? 'aria-current="page"' : "")}>${icon(n.icon, 24, 1.7)}${n.label}</a></li>`)}
      </ul>
    </nav>`;
}

function footerView() {
  return html`
    <footer class="site-footer">
      <div class="site-footer__inner">
        <div class="site-footer__about">
          <img class="logo-img" src="/brand/propertiq-logo.webp" alt="Propertiq" width="880" height="216" loading="lazy" data-logo />
          <p>A private portfolio of homes, land and commercial property in Ghana. Every property here is ours to show you.</p>
        </div>
        <nav aria-label="Properties"><h4>Properties</h4><ul>${CATEGORIES.map(([href, label]) => html`<li><a href="${href}">${label}</a></li>`)}<li><a href="/properties?view=map">On the map</a></li></ul></nav>
        <nav aria-label="Get in touch"><h4>Get in touch</h4><ul><li><a href="/contact">Contact</a></li><li><a href="/saved">Saved properties</a></li></ul></nav>
      </div>
      <div class="site-footer__legal"><p>© ${new Date().getFullYear()} Propertiq. Always view a property and check its documents before you pay.</p></div>
    </footer>`;
}

// Draws the header, footer and bottom bar around the page's <main>. Called once per page.
export function boot() {
  const path = location.pathname.replace(/\.html$/, "").replace(/\/index$/, "/").replace(/\/$/, "") || "/";
  document.body.classList.add("app");
  document.body.insertAdjacentHTML("afterbegin", markup(headerView(path, location.search)));
  document.body.insertAdjacentHTML("beforeend", markup(footerView()) + markup(bottomNavView(path, location.search)));
  // If the logo file is missing, show the name in text instead.
  document.querySelectorAll("img[data-logo]").forEach((img) => {
    const fallback = () => img.replaceWith(Object.assign(document.createElement("span"), { className: "logo-text", textContent: "Propertiq" }));
    if (img.complete && img.naturalWidth === 0) fallback();
    else img.addEventListener("error", fallback, { once: true });
  });
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
