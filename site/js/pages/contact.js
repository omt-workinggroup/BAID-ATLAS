// Contact: the owner's details from the data file. Only the ways that are filled in are shown.
import { boot, html, render } from "../core.js";
import { loadPortfolio, whatsappLink } from "../data.js";

boot();
const owner = (await loadPortfolio().catch(() => ({}))).owner ?? {};
document.getElementById("contact-about").textContent = owner.about ?? "";
const rows = [
  owner.whatsapp && ["WhatsApp", html`<a class="text-link" href="${whatsappLink(owner.whatsapp)}" target="_blank" rel="noopener">${owner.whatsapp}</a>`],
  owner.phone && ["Telephone", html`<a class="text-link" href="tel:${owner.phone.replace(/\s/g, "")}">${owner.phone}</a>`],
  owner.email && ["Email", html`<a class="text-link" href="mailto:${owner.email}">${owner.email}</a>`],
  owner.location && ["Office", owner.location],
].filter(Boolean);
render("#contact-ways", rows.length ? rows.map(([k, v]) => html`<div><dt>${k}</dt><dd>${v}</dd></div>`) : html`<div><dt>Details</dt><dd>Contact details are being added.</dd></div>`);
