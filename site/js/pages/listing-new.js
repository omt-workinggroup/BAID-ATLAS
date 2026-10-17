// New listing: details first; photos come next on the edit page.
import { boot, formMessage, html, render, sb, setTitle, showErrors } from "../core.js";
import { listingDbMessage, listingFormView, readListingForm, wirePurpose } from "../listingform.js";
import { canEditListings, requireMembership } from "../portal.js";

boot();
const { org, role } = await requireMembership();
setTitle(`New listing · ${org.name}`);
const root = document.getElementById("root");
if (!canEditListings(role)) location.replace(`/portal/${org.slug}/listings`);
render(
  root,
  html`<a class="back-link" href="/portal/${org.slug}/listings">← ${org.name} listings</a>
    <div class="page-head"><h1>New listing</h1><p>Step 1 of 3: the details. Next you'll add photos, then submit it for review.</p></div>
    <div class="steps"><span class="done">Details</span><span>Photos</span><span>Review</span><span>Live</span></div>
    ${listingFormView({}, { submitLabel: "Save and add photos" })}`,
);
root.removeAttribute("aria-busy");

const form = document.getElementById("listing-form");
wirePurpose(form);
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const { payload, errors } = readListingForm(form);
  if (!showErrors(form, errors)) return;
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = "Saving…";
  const { data, error } = await sb.rpc("create_listing", { p_org: org.id, p: payload });
  if (error || !data) {
    btn.disabled = false;
    btn.textContent = "Save and add photos";
    return formMessage(form, "error", listingDbMessage(error));
  }
  location.href = `/portal/${org.slug}/listings/${data}?created=1`;
});
