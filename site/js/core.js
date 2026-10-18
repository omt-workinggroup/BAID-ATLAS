// Shared engine for every page: Supabase connection, safe HTML, header/footer/navigation, sign-in checks
// and small helpers for forms. Pages import what they need from here.
import { SUPABASE_KEY, SUPABASE_URL, MEDIA_BUCKET } from "./config.js";

// ---- Supabase ------------------------------------------------------------------------------------------
// The browser session lives in localStorage. Security is enforced by the database (row-level security and
// checked functions), never by this code.
export const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: "propertiq-auth" },
});

// ---- Safe HTML -----------------------------------------------------------------------------------------
// html`<p>${value}</p>` escapes every value, so text typed by users can never become markup.
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
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  inbox: "M4 13h4l1.5 3h5L16 13h4M5.5 5h13L21 13v6H3v-6z",
  briefcase: "M3 7h18v13H3zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1.5-4 4.5-6 8-6s6.5 2 8 6",
  arrow: "M5 12h14M13 6l6 6-6 6",
  back: "M15 18l-6-6 6-6",
  check: "M5 12l5 5 9-10",
  filter: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M14 4v4M8 10v4M16 16v4",
  pin: "M12 21s-7-7.4-7-12a7 7 0 0 1 14 0c0 4.6-7 12-7 12zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  photo: "M3 5h18v14H3zM8.5 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM21 16l-5-5-8 8",
  house: "M3 10.5 12 3l9 7.5M5 9v11h14V9M10 20v-5h4v5",
  share: "M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 3v12M7 8l5-5 5 5",
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  send: "M4 12 20 4l-6 16-2.5-6.5z",
  chat: "M4 5h16v11H8l-4 4z",
};
export function icon(name, size = 22, stroke = 1.6) {
  return raw(
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PATHS[name]}"/></svg>`,
  );
}

// ---- Session and profile -------------------------------------------------------------------------------
let sessionPromise;
export function getSession() {
  sessionPromise ??= sb.auth.getSession().then(({ data }) => data.session ?? null);
  return sessionPromise;
}
export async function getUser() {
  return (await getSession())?.user ?? null;
}

let profilePromise;
export function getProfile() {
  profilePromise ??= (async () => {
    const user = await getUser();
    if (!user) return null;
    const { data } = await sb
      .from("profiles")
      .select("id, display_name, email, phone, preferred_locale, preferred_currency, account_status, email_verified_at, phone_verified_at, onboarded_at")
      .eq("id", user.id)
      .maybeSingle();
    return data ?? null;
  })();
  return profilePromise;
}

export const isVerified = (p) => Boolean(p?.phone_verified_at || p?.email_verified_at);
export const contactOf = (p) => p?.phone ?? p?.email ?? "";

let staffPromise;
export function getStaffRoles() {
  staffPromise ??= (async () => {
    const user = await getUser();
    if (!user) return [];
    const { data } = await sb.from("staff_roles").select("role").eq("user_id", user.id);
    return (data ?? []).map((r) => r.role);
  })();
  return staffPromise;
}

const here = () => location.pathname + location.search;

// Sends signed-out visitors to sign in, then back here.
export async function requireUser() {
  const user = await getUser();
  if (!user) {
    location.replace(`/sign-in?next=${encodeURIComponent(here())}`);
    return new Promise(() => {});
  }
  return user;
}

// Signed in, active and onboarded (unless allowNotOnboarded).
export async function requireProfile({ allowNotOnboarded = false } = {}) {
  await requireUser();
  const profile = await getProfile();
  if (!profile) {
    location.replace(`/sign-in?next=${encodeURIComponent(here())}`);
    return new Promise(() => {});
  }
  if (profile.account_status !== "active") {
    location.replace("/suspended");
    return new Promise(() => {});
  }
  if (!allowNotOnboarded && !profile.onboarded_at) {
    location.replace(`/onboarding?next=${encodeURIComponent(here())}`);
    return new Promise(() => {});
  }
  return profile;
}

// Only allow same-site paths we expect, so ?next= can't send people to another website.
const NEXT_PREFIXES = ["/account", "/saved", "/inbox", "/onboarding", "/portal", "/invitations", "/ops", "/properties", "/explore", "/providers"];
export function safeNext(input, fallback = "/account") {
  const v = String(input ?? "");
  if (!v.startsWith("/") || v.startsWith("//") || v.includes("\\")) return fallback;
  try {
    const u = new URL(v, "https://x.invalid");
    if (u.origin !== "https://x.invalid") return fallback;
    return NEXT_PREFIXES.some((p) => u.pathname === p || u.pathname.startsWith(`${p}/`)) ? u.pathname + u.search : fallback;
  } catch {
    return fallback;
  }
}

export async function signOut(scope = "local") {
  await sb.auth.signOut({ scope });
  location.href = "/sign-in?signed_out=1";
}

// ---- Page shell ----------------------------------------------------------------------------------------
const NAV = [
  { href: "/", label: "Home", icon: "home", match: (p) => p === "/" },
  { href: "/explore", label: "Explore", icon: "search", match: (p) => p.startsWith("/explore") || p.startsWith("/properties") },
  { href: "/saved", label: "Saved", icon: "heart", match: (p) => p.startsWith("/saved") },
  { href: "/inbox", label: "Inbox", icon: "inbox", match: (p) => p.startsWith("/inbox"), badge: true },
  { href: "/portal", label: "Provider", icon: "briefcase", match: (p) => p.startsWith("/portal"), desktopOnly: true },
];

function navItems(signedIn) {
  const account = signedIn
    ? { href: "/account", label: "Account", icon: "user", match: (p) => p.startsWith("/account") || p.startsWith("/onboarding") }
    : { href: "/sign-in", label: "Sign in", icon: "user", match: (p) => p.startsWith("/sign-") || p.startsWith("/verify") };
  return [...NAV, account];
}

function headerView(signedIn, path) {
  return html`
    <a href="#main" class="skip-link">Skip to content</a>
    <header class="site-header">
      <div class="site-header__inner">
        <a href="/" class="logo" aria-label="Propertiq home"><span class="logo-frame"><img src="/brand/propertiq-logo.jpg" alt="Propertiq" width="1280" height="720" data-logo /></span></a>
        <nav class="top-nav" aria-label="Primary">
          <ul>
            ${navItems(signedIn).map(
              (n) => html`<li><a href="${n.href}" ${raw(n.match(path) ? 'aria-current="page"' : "")}>${n.label}${n.badge ? raw('<span class="badge-count" data-unread hidden></span>') : ""}</a></li>`,
            )}
          </ul>
        </nav>
        ${signedIn ? "" : html`<a href="/sign-in" class="header-signin">Sign in</a>`}
      </div>
    </header>`;
}

function bottomNavView(signedIn, path) {
  return html`
    <nav class="bottom-nav" aria-label="Primary">
      <ul>
        ${navItems(signedIn)
          .filter((n) => !n.desktopOnly)
          .map(
            (n) => html`<li><a href="${n.href}" ${raw(n.match(path) ? 'aria-current="page"' : "")}>${icon(n.icon, 24, 1.7)}${n.badge ? raw('<span class="dot" data-unread-dot hidden></span>') : ""}${n.label}</a></li>`,
          )}
      </ul>
    </nav>`;
}

const FOOTER_COLS = [
  ["Find property", [["/explore?purpose=sale", "For sale"], ["/explore?purpose=long_term_rent", "To rent"], ["/explore?purpose=short_stay", "Short stays"], ["/explore?type=land", "Land"], ["/explore?type=commercial", "Commercial"]]],
  ["Providers", [["/portal", "Provider portal"], ["/sign-up", "List a property"]]],
  ["Trust", [["/trust-and-verification", "Trust and verification"]]],
  ["Your account", [["/saved", "Saved properties"], ["/inbox", "Inbox"], ["/account", "Account settings"]]],
];

function footerView() {
  return html`
    <footer class="site-footer">
      <div class="site-footer__inner">
        <div class="site-footer__about">
          <span class="logo-frame"><img src="/brand/propertiq-logo.jpg" alt="Propertiq" width="1280" height="720" loading="lazy" data-logo /></span>
          <p>Property listings for Ghana, reviewed before they go live, with verification you can read in full.</p>
        </div>
        <div class="footer-cols">
          ${FOOTER_COLS.map(
            ([title, links]) => html`<nav aria-label="${title}"><h4>${title}</h4><ul>${links.map(([href, label]) => html`<li><a href="${href}">${label}</a></li>`)}</ul></nav>`,
          )}
        </div>
      </div>
      <div class="site-footer__legal"><p>© ${new Date().getFullYear()} Propertiq. Always view a property and check its documents before you pay.</p></div>
    </footer>`;
}

// Draws the header, footer and bottom navigation around the page's <main>. Called once per page.
export async function boot() {
  const user = await getUser();
  const path = location.pathname.replace(/\.html$/, "").replace(/\/index$/, "/") || "/";
  document.body.classList.add("app");
  document.body.insertAdjacentHTML("afterbegin", part(headerView(Boolean(user), path)));
  document.body.insertAdjacentHTML("beforeend", part(footerView()) + part(bottomNavView(Boolean(user), path)));
  // The logo is the supplied artwork, used unchanged. If the file is missing, show the name in text instead.
  document.querySelectorAll("img[data-logo]").forEach((img) => {
    const fallback = () => img.parentElement.replaceWith(Object.assign(document.createElement("span"), { className: "logo-text", textContent: "Propertiq" }));
    if (img.complete && img.naturalWidth === 0) fallback();
    else img.addEventListener("error", fallback, { once: true });
  });
  if (user) refreshUnread();
  if ("serviceWorker" in navigator && location.hostname !== "localhost") navigator.serviceWorker.register("/sw.js").catch(() => {});
}

// Unread inbox count on the navigation (conversations with messages newer than our last read).
export async function refreshUnread() {
  const { data, error } = await sb.rpc("unread_conversation_count");
  if (error) return;
  const n = Number(data) || 0;
  document.querySelectorAll("[data-unread]").forEach((el) => {
    el.hidden = n === 0;
    el.textContent = n > 9 ? "9+" : String(n);
  });
  document.querySelectorAll("[data-unread-dot]").forEach((el) => (el.hidden = n === 0));
}

// ---- Small helpers ------------------------------------------------------------------------------------
export const params = () => new URLSearchParams(location.search);
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function setTitle(title) {
  document.title = title ? `${title} · Propertiq` : "Propertiq — Property, understood better";
}

export function toast(message) {
  document.querySelector(".toast")?.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.textContent = message;
  document.body.append(el);
  setTimeout(() => el.remove(), 3200);
}

export function alertBox(tone, message) {
  return html`<div class="alert alert--${tone}" role="${tone === "error" ? "alert" : "status"}">${message}</div>`;
}

// Text field markup. Errors are shown with showErrors(form, errors).
export function field({ label, name, type = "text", value = "", hint = "", attrs = "" }) {
  const id = `f-${name}`;
  return html`<div class="field">
    <label for="${id}">${label}</label>
    <input class="input" id="${id}" name="${name}" type="${type}" value="${value ?? ""}" aria-describedby="${id}-msg" ${raw(attrs)} />
    <p class="hint" id="${id}-msg" data-hint="${hint}">${hint}</p>
  </div>`;
}

export function selectField({ label, name, options, value = "", hint = "" }) {
  const id = `f-${name}`;
  return html`<div class="field">
    <label for="${id}">${label}</label>
    <select class="select" id="${id}" name="${name}" aria-describedby="${id}-msg">
      ${options.map(([v, l]) => html`<option value="${v}" ${raw(String(v) === String(value ?? "") ? "selected" : "")}>${l}</option>`)}
    </select>
    <p class="hint" id="${id}-msg" data-hint="${hint}">${hint}</p>
  </div>`;
}

export function textareaField({ label, name, value = "", hint = "", attrs = "" }) {
  const id = `f-${name}`;
  return html`<div class="field">
    <label for="${id}">${label}</label>
    <textarea class="textarea" id="${id}" name="${name}" aria-describedby="${id}-msg" ${raw(attrs)}>${value ?? ""}</textarea>
    <p class="hint" id="${id}-msg" data-hint="${hint}">${hint}</p>
  </div>`;
}

// Shows field errors under each input (falls back to the hint text when a field has no error).
export function showErrors(form, errors = {}) {
  for (const el of form.querySelectorAll("[name]")) {
    const msg = form.querySelector(`#f-${el.name}-msg`);
    const err = errors[el.name];
    if (err) el.setAttribute("aria-invalid", "true");
    else el.removeAttribute("aria-invalid");
    if (msg) {
      msg.textContent = err || msg.dataset.hint || "";
      msg.className = err ? "error-text" : "hint";
    }
  }
  const first = Object.keys(errors)[0];
  if (first) form.querySelector(`[name="${first}"]`)?.focus();
  return Object.keys(errors).length === 0;
}

// Disables the submit button and swaps its label while work is running.
export async function busy(form, label, work) {
  const btn = form.querySelector('button[type="submit"]');
  const original = btn?.textContent;
  if (btn) {
    btn.disabled = true;
    btn.textContent = label;
  }
  try {
    return await work();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = original;
    }
  }
}

export function formMessage(form, tone, message) {
  let box = form.querySelector("[data-form-message]");
  if (!box) {
    box = document.createElement("div");
    box.dataset.formMessage = "";
    form.prepend(box);
  }
  render(box, message ? alertBox(tone, message) : "");
}

// Maps database error codes raised by checked functions to plain messages.
export function friendlyDbError(error) {
  const m = error?.message ?? "";
  switch (error?.code) {
    case "42501":
      return m.includes("not verified") ? "Please verify your phone number first." : "You don't have permission to do that.";
    case "23505":
      if (m.includes("already a member")) return "That person is already a member.";
      return "That already exists.";
    case "23514":
      return m.includes("owner") ? "An organisation must keep at least one owner." : "Some details are not valid.";
    case "54000":
      return "Too many attempts. Please wait a while and try again.";
    case "P0002":
      return m.includes("invitation") ? "This invitation is invalid, already used or expired." : "That item no longer exists.";
    case "22023":
      return m || "Some details are not valid.";
    default:
      return "Something went wrong. Please try again.";
  }
}

// Private photos are served through short-lived signed links; storage rules decide what can be signed.
export async function signedUrls(paths) {
  const unique = [...new Set(paths.filter(Boolean))];
  const map = new Map();
  if (unique.length === 0) return map;
  const { data } = await sb.storage.from(MEDIA_BUCKET).createSignedUrls(unique, 3600);
  for (const row of data ?? []) if (row.path && row.signedUrl) map.set(row.path, row.signedUrl);
  return map;
}
