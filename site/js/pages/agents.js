// Agents, developers and companies on one page. Everyone shown comes from the data file: the owner, plus any
// approved profiles in "directory". Nobody is invented; where a group is empty, the page invites them to join.
import { boot, html, icon, raw, render } from "../core.js";
import { loadPortfolio, waLink } from "../data.js";
import { initials } from "../cards.js";

boot();
const KINDS = [
  ["all", "All"],
  ["agent", "Agents"],
  ["developer", "Developers"],
  ["company", "Companies"],
  ["estate", "Estates"],
];
const KIND_ONE = { agent: "Agent", developer: "Developer", company: "Company", estate: "Estate" };
const SOCIALS = [
  ["instagram", "Instagram"],
  ["facebook", "Facebook"],
  ["linkedin", "LinkedIn"],
  ["x", "X"],
  ["tiktok", "TikTok"],
  ["youtube", "YouTube"],
];

const portfolio = await loadPortfolio().catch(() => ({ owner: {}, properties: [] }));
const props = portfolio.properties ?? [];
const owner = portfolio.owner ?? {};
// The owner is listed first, with its own properties; then the approved directory.
const people = [
  ...(owner.name ? [{ ...owner, kinds: owner.kinds ?? ["company"], verified: true, own: true }] : []),
  ...(portfolio.directory ?? []).map((d) => ({ ...d, kinds: d.kinds ?? [d.kind].filter(Boolean) })),
];
const listingsOf = (x) => props.filter((p) => (x.own ? !p.listed_by || p.listed_by === x.name : p.listed_by === x.name));

let kind = new URLSearchParams(location.search).get("kind") ?? "all";
let q = "";
const host = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};

function profile(x) {
  const ls = listingsOf(x);
  const live = ls.filter((p) => !p.coming_soon).length;
  const tel = x.phone ? `tel:${x.phone.replace(/\s/g, "")}` : null;
  const wa = waLink(x.whatsapp, `Hello ${x.name}, I found you on Propertiq.`);
  const socials = SOCIALS.filter(([k]) => x.socials?.[k]);
  const stats = [
    ls.length && [ls.length, ls.length === 1 ? "Property" : "Properties"],
    live && [live, "For sale or rent"],
    x.experience && [x.experience.replace(/^close to /i, "~").replace(/ years?$/i, " yrs"), "Experience"],
  ].filter(Boolean);
  return html`<article class="pc">
    <header class="pc__top">
      <span class="pc__mark${x.kinds.includes("agent") ? " pc__mark--round" : ""}">${x.logo ? html`<img src="${x.logo}" alt="" />` : initials(x.name)}</span>
      <div class="pc__id">
        <h2 class="pc__name">${x.name}${x.verified ? html`<span class="tick" title="Checked by Propertiq">${icon("check", 11, 3)}</span>` : ""}</h2>
        <p class="pc__kinds">${x.kinds.map((k) => KIND_ONE[k]).filter(Boolean).join(" · ")}${x.company ? ` at ${x.company}` : ""}</p>
        ${x.location ? html`<p class="pc__where">${icon("pin", 14)}<span>${x.location}</span></p>` : ""}
      </div>
    </header>
    ${x.tagline ? html`<p class="pc__about">${x.tagline}</p>` : ""}
    ${stats.length ? html`<dl class="pc__stats">${stats.map(([v, l]) => html`<div><dt>${l}</dt><dd>${v}</dd></div>`)}</dl>` : ""}
    ${x.services?.length ? html`<ul class="pc__tags">${x.services.slice(0, 6).map((t) => html`<li class="chip-s">${t}</li>`)}</ul>` : ""}
    ${x.areas?.length ? html`<p class="pc__areas"><b>Areas:</b> ${x.areas.join(", ")}</p>` : ""}
    ${x.website || socials.length || x.email
      ? html`<div class="pc__links">
          ${x.website ? html`<a class="pc__web" href="${x.website}" target="_blank" rel="noopener">${icon("globe", 16)}<span>${host(x.website)}</span></a>` : ""}
          ${x.email ? html`<a class="ptool ptool--line" href="mailto:${x.email}" aria-label="Email ${x.name}">${icon("mail", 16)}</a>` : ""}
          ${socials.map(([k, label]) => html`<a class="ptool ptool--line" href="${x.socials[k]}" target="_blank" rel="noopener" aria-label="${x.name} on ${label}">${icon(k, 16)}</a>`)}
        </div>`
      : ""}
    <div class="pc__actions">
      ${tel ? html`<a class="btn btn--line-dark" href="${tel}">${icon("phone", 16)}Call</a>` : ""}
      ${wa ? html`<a class="btn btn--dark" href="${wa}" target="_blank" rel="noopener">${icon("chat", 16)}WhatsApp</a>` : ""}
    </div>
    ${ls.length ? html`<a class="pc__more" href="/">See their ${ls.length} ${ls.length === 1 ? "property" : "properties"}${icon("arrow", 16)}</a>` : ""}
  </article>`;
}

function joinCard(k) {
  const who = { agent: "an agent", developer: "a developer", company: "a property company", estate: "an estate", all: "an agent, developer or company" }[k];
  const role = k === "all" ? "" : `?role=${k}`;
  return html`<article class="pc pc--join">
    <span class="pc__mark pc__mark--line">${icon(k === "agent" ? "user" : k === "developer" ? "crane" : k === "estate" ? "gate" : "building", 26, 1.5)}</span>
    <h2 class="pc__name">Are you ${who}?</h2>
    <p class="pc__about">Get a profile here, list your properties and reach buyers and tenants across Accra. We check every profile before it goes live.</p>
    <a class="btn btn--dark" href="/profile${role}">${icon("user", 16)}Join Propertiq</a>
  </article>`;
}

function draw() {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const text = (x) => [x.name, x.company, x.location, ...(x.areas ?? []), ...(x.services ?? [])].join(" ").toLowerCase();
  const inKind = (x) => kind === "all" || x.kinds.includes(kind);
  const rows = people.filter((x) => inKind(x) && words.every((w) => text(x).includes(w)));
  render(
    "#kinds",
    KINDS.map(([k, label]) => {
      const n = people.filter((x) => k === "all" || x.kinds.includes(k)).length;
      return html`<a class="cat" href="${k === "all" ? "/agents" : `/agents?kind=${k}`}" data-kind="${k}" ${raw(k === kind ? 'aria-current="page"' : "")}>${label}<span>${n}</span></a>`;
    }),
  );
  render(
    "#dir",
    html`${rows.map(profile)}${q && !rows.length ? html`<p class="empty">No one matches “${q}”.</p>` : ""}${joinCard(kind)}`,
  );
  history.replaceState(null, "", kind === "all" ? "/agents" : `/agents?kind=${kind}`);
}

document.getElementById("kinds").addEventListener("click", (e) => {
  const a = e.target.closest("[data-kind]");
  if (!a || e.metaKey || e.ctrlKey) return;
  e.preventDefault();
  kind = a.dataset.kind;
  draw();
});
document.getElementById("dir-q").addEventListener("input", (e) => {
  q = e.target.value.trim();
  draw();
});
document.getElementById("dir-search").addEventListener("submit", (e) => e.preventDefault());
draw();
