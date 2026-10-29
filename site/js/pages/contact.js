// Contact: everything about Resilience Estate Ltd, who run Propertiq, from the data file: who they are,
// how to reach them (only the ways that are filled in), their office on a map, and what they do.
import { boot, html, icon, render } from "../core.js";
import { loadPortfolio, whatsappLink } from "../data.js";

boot();
const owner = (await loadPortfolio().catch(() => ({}))).owner ?? {};
const tel = owner.phone ? `tel:${owner.phone.replace(/\s/g, "")}` : null;
const wa = whatsappLink(owner.whatsapp);

if (owner.name) document.getElementById("owner-name").textContent = owner.name;
document.getElementById("owner-tagline").textContent = owner.tagline ?? "";
document.getElementById("owner-about").textContent = owner.about ?? "";
render(
  "#contact-actions",
  html`${wa ? html`<a class="btn btn--dark" href="${wa}" target="_blank" rel="noopener">${icon("chat", 18)}WhatsApp</a>` : ""}
    ${tel ? html`<a class="btn btn--outline-tan" href="${tel}">${icon("phone", 18)}Call</a>` : ""}
    ${owner.email ? html`<a class="btn btn--outline-tan" href="mailto:${owner.email}">${icon("mail", 18)}Email</a>` : ""}`,
);
const rows = [
  owner.phone && ["Telephone", html`<a href="${tel}">${owner.phone}</a>`],
  owner.whatsapp && ["WhatsApp", html`<a href="${wa}" target="_blank" rel="noopener">${owner.whatsapp}</a>`],
  owner.email && ["Email", html`<a href="mailto:${owner.email}">${owner.email}</a>`],
  owner.location && ["Office", owner.location],
  owner.website && ["Website", html`<a href="${owner.website}" target="_blank" rel="noopener">${owner.website.replace(/^https?:\/\//, "")}</a>`],
].filter(Boolean);
render("#contact-ways", rows.map(([k, v]) => html`<div><dt>${k}</dt><dd>${v}</dd></div>`));
render("#services", (owner.services ?? []).map((s) => html`<li>${s}</li>`));

const office = owner.office;
const mapEl = document.getElementById("office-map");
if (office && typeof office.lat === "number") {
  document.getElementById("office-line").textContent = owner.location ?? "";
  import("../map.js").then(async (m) => {
    await m.loadMapLibre();
    const at = [office.lng, office.lat];
    const map = m.createMap(mapEl, { center: at, zoom: 14, style: "satellite", cooperative: true });
    const pin = document.createElement("span");
    pin.className = "tagpin is-active";
    pin.innerHTML = '<span class="tagpin__label"></span><span class="tagpin__tip"></span>';
    pin.querySelector(".tagpin__label").textContent = "Our office";
    new window.maplibregl.Marker({ element: pin, anchor: "bottom" }).setLngLat(at).addTo(map);
    map.once("load", () => map.flyTo({ center: at, zoom: 16.4, pitch: 55, bearing: -20, duration: 2800, essential: true }));
  });
} else {
  mapEl.remove();
}
