// Contact: the owner's details from the data file. Only the ways that are filled in are shown.
import { boot, html, icon, render } from "../core.js";
import { loadPortfolio, whatsappLink } from "../data.js";

boot();
const owner = (await loadPortfolio().catch(() => ({}))).owner ?? {};
document.getElementById("contact-about").textContent = owner.about ?? "";
const ways = [
  owner.whatsapp && { href: whatsappLink(owner.whatsapp), label: "WhatsApp", value: owner.whatsapp, ic: "chat", external: true },
  owner.phone && { href: `tel:${owner.phone}`, label: "Call", value: owner.phone, ic: "phone" },
  owner.email && { href: `mailto:${owner.email}`, label: "Email", value: owner.email, ic: "mail" },
].filter(Boolean);
render(
  "#contact-ways",
  ways.length
    ? ways.map((w) => html`<a class="contact-way" href="${w.href}" ${w.external ? html`target="_blank" rel="noopener"` : ""}>${icon(w.ic, 22)}<span>${w.label}</span><strong>${w.value}</strong></a>`)
    : html`<p class="contact-way"><span>Contact details are being added.</span><strong>${owner.location ?? "Accra, Ghana"}</strong></p>`,
);
