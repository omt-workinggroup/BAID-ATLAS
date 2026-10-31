// Profile: sign up to list (agent, developer, company, estate or home owner), sign in, and what this visitor
// has kept on this device (saved properties, their location).
// Listing accounts are opened by the Propertiq team for now: "Sign up" sends a written application on
// WhatsApp or by email, and "Sign in" says so plainly. Nothing here pretends to log anyone in.
import { boot, html, icon, raw, render, toast } from "../core.js";
import { formatPrice, loadPortfolio, place, small, waLink } from "../data.js";
import { wireCollect } from "../collect.js";
import { saved, toggleSaved } from "../store.js";
import { remembered } from "../here.js";

boot();
wireCollect();
const ROLES = [
  ["agent", "Agent", "user", "Show, sell or let other people's property"],
  ["developer", "Developer", "crane", "List your projects and units, off-plan or ready"],
  ["company", "Company", "building", "Agencies and property firms with several agents"],
  ["estate", "Estate", "gate", "Gated communities and estates with many homes"],
  ["owner", "Home owner", "home", "Sell or let your own home directly"],
];
const portfolio = await loadPortfolio().catch(() => ({ owner: {}, properties: [] }));
const owner = portfolio.owner ?? {};
const bySlug = Object.fromEntries((portfolio.properties ?? []).map((p) => [p.slug, p]));
const qs = new URLSearchParams(location.search);
let tab = qs.get("tab") === "signin" ? "signin" : "signup";
let role = ROLES.some(([k]) => k === qs.get("role")) ? qs.get("role") : "agent";
const root = document.getElementById("profile");

const field = (name, label, attrs = {}, hint = "") =>
  html`<label class="field"><span>${label}${hint ? html` <em>${hint}</em>` : ""}</span><input name="${name}" ${raw(Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(" "))} /></label>`;
function extraFields() {
  if (role === "agent") return html`${field("company", "Agency", { autocomplete: "organization" }, "Optional")}${field("licence", "Licence number", {}, "Real Estate Agency Council, if you have one")}`;
  if (role === "owner") return html`${field("property", "Your property", { placeholder: "e.g. 3-bed house in Adenta" })}`;
  return html`${field("company", role === "estate" ? "Estate name" : "Company name", { autocomplete: "organization", required: "" })}${field("website", "Website", { type: "url", placeholder: "https://" }, "Optional")}${field("socials", "Instagram, Facebook or LinkedIn", { placeholder: "Links or @handles" }, "Optional")}`;
}

function signup() {
  return html`<form class="su" id="signup" novalidate>
    <fieldset class="roles"><legend>I'm joining as</legend>
      ${ROLES.map(([k, label, ic, about]) => html`<label class="role"><input type="radio" name="role" value="${k}" ${k === role ? raw("checked") : ""} /><span class="role__box"><span class="role__icon">${icon(ic, 22)}</span><span><strong>${label}</strong><small>${about}</small></span></span></label>`)}
    </fieldset>
    <div class="su__fields">
      ${field("name", "Full name", { autocomplete: "name", required: "" })}
      ${field("phone", "Phone (WhatsApp)", { type: "tel", autocomplete: "tel", inputmode: "tel", placeholder: "+233", required: "" })}
      ${field("email", "Email", { type: "email", autocomplete: "email" }, "Optional")}
      ${field("areas", "Areas you cover", { placeholder: "e.g. East Legon, Airport, Spintex" }, "Optional")}
      <div class="su__extra" id="extra">${extraFields()}</div>
    </div>
    <p class="sheet__error" role="alert" hidden></p>
    <div class="su__send">
      ${owner.whatsapp ? html`<a class="btn btn--dark" data-send="wa" href="#" target="_blank" rel="noopener">${icon("chat", 17)}Send on WhatsApp</a>` : ""}
      ${owner.email ? html`<a class="btn btn--line-dark" data-send="mail" href="#">${icon("mail", 17)}Send by email</a>` : ""}
    </div>
    <p class="fineprint">Our team opens each account by hand: we'll check your details, then reply to set up your profile and listings.</p>
  </form>`;
}

function signin() {
  const wa = waLink(owner.whatsapp, "Hello, I list with Propertiq and I'd like to update my listings.");
  return html`<div class="si">
    <span class="si__icon">${icon("user", 28, 1.4)}</span>
    <h2>Listing accounts are opening soon</h2>
    <p>Until sign-in is ready, agents, developers and owners already on Propertiq update their listings by messaging us. Saved properties need no account: they stay on this device, below.</p>
    <div class="su__send">${wa ? html`<a class="btn btn--dark" href="${wa}" target="_blank" rel="noopener">${icon("chat", 17)}Update my listings</a>` : ""}<a class="btn btn--line-dark" href="/profile" data-tab="signup">New here? Sign up</a></div>
  </div>`;
}

function mine() {
  const s = saved().map((x) => bySlug[x]).filter(Boolean);
  const row = (p) => html`<li class="mine__row">
    <a href="/properties/${p.slug}">${p.photos?.[0] ? html`<img src="${small(p.photos[0])}" alt="" />` : html`<span class="suggest__mono">${p.title[0]}</span>`}<span><strong>${p.title}</strong><small>${p.coming_soon ? "Coming soon" : formatPrice(p.price)} · ${place(p) || "Accra"}</small></span></a>
    <button type="button" class="ptool ptool--plain" data-unsave="${p.slug}" aria-label="Remove ${p.title} from saved">${icon("close", 16, 2)}</button>
  </li>`;
  return html`<section class="mine" aria-labelledby="mine-h">
    <h2 id="mine-h">On this device</h2>
    <div class="mine__grid">
      <div class="mine__box"><h3>${icon("heart", 18, 1.8)}Saved <span>${s.length}</span></h3>${s.length ? html`<ul>${s.map(row)}</ul>` : html`<p class="fineprint">Tap the heart on any property to keep it here.</p>`}</div>
      <div class="mine__box"><h3>${icon("locate", 18, 1.8)}Your location</h3>${remembered() ? html`<p class="fineprint">Shared for this visit, to show distances. It never leaves this device.</p><button type="button" class="btn btn--line-dark" data-forget>Forget my location</button>` : html`<p class="fineprint">Not shared. Distances and directions ask first.</p>`}</div>
    </div>
  </section>`;
}

function draw() {
  render(
    root,
    html`<header class="profile__head"><p class="eyebrow">Profile</p><h1>${tab === "signup" ? "List with Propertiq" : "Welcome back"}</h1>
        <p>${tab === "signup" ? "Agents, developers, companies, estates and home owners: tell us who you are and we'll get you listed." : "Sign in to manage your listings."}</p></header>
      <div class="seg-tabs" role="tablist"><button type="button" role="tab" data-tab="signup" aria-selected="${tab === "signup" ? "true" : "false"}">Sign up</button><button type="button" role="tab" data-tab="signin" aria-selected="${tab === "signin" ? "true" : "false"}">Sign in</button></div>
      ${tab === "signup" ? signup() : signin()}
      <div id="mine">${mine()}</div>`,
  );
  if (tab === "signup") wireForm();
}

function wireForm() {
  const form = document.getElementById("signup");
  const error = form.querySelector(".sheet__error");
  const read = () => Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, String(v).trim()]));
  const label = () => ROLES.find(([k]) => k === role)[1];
  const message = (v) =>
    [
      `Hello Propertiq, I'd like to join as ${/^[aeiou]/i.test(label()) ? "an" : "a"} ${label().toLowerCase()}.`,
      `Name: ${v.name}`,
      v.company && `${role === "estate" ? "Estate" : role === "agent" ? "Agency" : "Company"}: ${v.company}`,
      `Phone: ${v.phone}`,
      v.email && `Email: ${v.email}`,
      v.areas && `Areas: ${v.areas}`,
      v.licence && `Licence: ${v.licence}`,
      v.property && `Property: ${v.property}`,
      v.website && `Website: ${v.website}`,
      v.socials && `Socials: ${v.socials}`,
    ]
      .filter(Boolean)
      .join("\n");
  const missing = (v) => (!v.name ? "Add your name." : !/\d{7,}/.test(v.phone.replace(/\D/g, "")) ? "Add a phone number we can reach you on." : ["developer", "company", "estate"].includes(role) && !v.company ? `Add the ${role === "estate" ? "estate" : "company"} name.` : "");
  const update = () => {
    const v = read();
    const text = message(v);
    const wa = form.querySelector('[data-send="wa"]');
    const mail = form.querySelector('[data-send="mail"]');
    if (wa) wa.href = waLink(owner.whatsapp, text);
    if (mail) mail.href = `mailto:${owner.email}?subject=${encodeURIComponent(`Join Propertiq: ${label()}`)}&body=${encodeURIComponent(text)}`;
    if (!missing(v)) error.hidden = true;
  };
  form.addEventListener("change", (e) => {
    if (e.target.name !== "role") return;
    role = e.target.value;
    render("#extra", extraFields());
    history.replaceState(null, "", `/profile?role=${role}`);
    update();
  });
  form.addEventListener("input", update);
  form.querySelectorAll("[data-send]").forEach((a) =>
    a.addEventListener("click", (e) => {
      const problem = missing(read());
      if (!problem) return toast("Opening your message. Send it to finish.");
      e.preventDefault();
      error.textContent = problem;
      error.hidden = false;
    }),
  );
  update();
}

root.addEventListener("click", (e) => {
  const t = e.target.closest("[data-tab]");
  if (t) {
    e.preventDefault();
    tab = t.dataset.tab;
    history.replaceState(null, "", tab === "signin" ? "/profile?tab=signin" : "/profile");
    return draw();
  }
  const u = e.target.closest("[data-unsave]");
  if (u) toggleSaved(u.dataset.unsave);
  if (e.target.closest("[data-forget]")) {
    try {
      sessionStorage.removeItem("pq-here");
    } catch {
      /* storage unavailable */
    }
    toast("Location forgotten");
    render("#mine", mine());
  }
});
addEventListener("pq:store", () => render("#mine", mine()));
draw();
