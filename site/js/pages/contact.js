// Contact: how to reach the team (only the ways filled in, in the data file) and the office on a map.
import { boot, html, icon, render } from "../core.js";
import { loadPortfolio, whatsappLink } from "../data.js";

boot();
const owner = (await loadPortfolio().catch(() => ({}))).owner ?? {};
const tel = owner.phone ? `tel:${owner.phone.replace(/\s/g, "")}` : null;
const wa = whatsappLink(owner.whatsapp);

const ways = [
  wa && { href: wa, ic: "chat", title: "WhatsApp", value: owner.whatsapp, note: "Quickest. Send photos, questions or a time that suits you.", external: true },
  tel && { href: tel, ic: "phone", title: "Call", value: owner.phone, note: "Prefer to talk it through? Give us a ring." },
  owner.email && { href: `mailto:${owner.email}`, ic: "mail", title: "Email", value: owner.email, note: "Good for documents, payment plans and longer questions." },
].filter(Boolean);
render(
  "#ways",
  ways.map(
    (w, i) => html`<li style="--n:${i}"><a class="way" href="${w.href}" ${w.external ? html`target="_blank" rel="noopener"` : ""}>
      <span class="way__icon">${icon(w.ic, 22)}</span>
      <span class="way__title">${w.title}</span>
      <strong>${w.value}</strong>
      <span class="way__note">${w.note}</span>
      <span class="way__go">${icon("arrow", 18, 1.8)}</span>
    </a></li>`,
  ),
);

if (owner.location) document.querySelector("[data-office-line]").textContent = owner.location;
const office = owner.office;
const mapEl = document.getElementById("office-map");
if (office && typeof office.lat === "number") {
  const dir = document.getElementById("directions");
  dir.href = `https://www.google.com/maps/dir/?api=1&destination=${office.lat},${office.lng}`;
  dir.hidden = false;
  import("../map.js").then(async (m) => {
    await m.loadMapLibre();
    const at = [office.lng, office.lat];
    const map = m.createMap(mapEl, { center: at, zoom: 14, style: "satellite", cooperative: true });
    const pin = document.createElement("span");
    pin.className = "tagpin is-active";
    pin.innerHTML = '<span class="tagpin__label">We\'re here</span><span class="tagpin__tip"></span>';
    new window.maplibregl.Marker({ element: pin, anchor: "bottom" }).setLngLat(at).addTo(map);
    map.once("load", () => {
      map.flyTo({ center: at, zoom: 16.4, pitch: 58, bearing: -20, duration: 2800, essential: true });
      map.once("moveend", () => m.orbit(map));
    });
  });
} else {
  mapEl.remove();
}
