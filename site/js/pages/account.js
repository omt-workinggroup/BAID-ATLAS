// Account: name, display preferences and signing out. The phone is the verified sign-in number.
import { boot, busy, contactOf, formMessage, getStaffRoles, html, params, render, requireProfile, sb, selectField, showErrors, signOut, field } from "../core.js";
import { text } from "../validate.js";

boot();
const profile = await requireProfile();
const staff = await getStaffRoles();
const root = document.getElementById("root");

render(
  root,
  html`<div class="page-head"><h1>Account</h1><p>${contactOf(profile)}</p></div>
    ${params().get("welcome") ? html`<div class="alert alert--success">You're all set, ${profile.display_name}. Start exploring!</div>` : ""}
    <div class="grid-2">
      <a class="card stack-sm" href="/saved"><span class="bold">Saved</span><span class="tiny muted">Your hearted properties</span></a>
      <a class="card stack-sm" href="/inbox"><span class="bold">Inbox</span><span class="tiny muted">Messages and viewings</span></a>
    </div>
    ${staff.length ? html`<a class="btn btn--full" href="/ops">Operations dashboard →</a>` : ""}
    <section class="card stack">
      <h2>Profile and preferences</h2>
      <form class="stack" id="profile-form" novalidate>
        ${field({ label: "Name", name: "display_name", value: profile.display_name ?? "", attrs: 'autocomplete="name"' })}
        ${profile.phone ? html`<div class="card--muted card stack-sm" style="padding: 0.875rem 1rem"><span class="small bold">Phone number</span><span>${profile.phone}</span><span class="tiny muted">Used to sign in. Not shown publicly.</span></div>` : ""}
        ${selectField({ label: "Display prices in", name: "preferred_currency", value: profile.preferred_currency, options: [["GHS", "Ghana cedi (GHS)"], ["USD", "US dollar (USD)"], ["EUR", "Euro (EUR)"], ["GBP", "Pound sterling (GBP)"]], hint: "Listings always keep their original price and currency." })}
        ${selectField({ label: "Language and region", name: "preferred_locale", value: profile.preferred_locale, options: [["en-GH", "English (Ghana)"], ["en-GB", "English (UK)"], ["en-US", "English (US)"]] })}
        <button type="submit" class="btn btn--full">Save changes</button>
      </form>
    </section>
    <section class="card stack">
      <h2>Provider organisations</h2>
      <p class="small muted">Manage your agency, developer or landlord organisation, its listings, leads and team.</p>
      <a class="link" href="/portal">Go to provider portal →</a>
    </section>
    <section class="card stack">
      <h2>Security</h2>
      <p class="small muted">You sign in with a one-time code sent to ${profile.phone ?? "your phone"}. Signing out of all devices ends every other session too.</p>
      <div class="grid-2">
        <button type="button" class="btn btn--secondary" id="sign-out">Sign out</button>
        <button type="button" class="btn btn--danger" id="sign-out-all">Sign out of all devices</button>
      </div>
    </section>`,
);
root.removeAttribute("aria-busy");

const form = document.getElementById("profile-form");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const r = text(form.display_name.value, { label: "Your name", max: 80 });
  if (!showErrors(form, r.error ? { display_name: r.error } : {})) return;
  await busy(form, "Saving…", async () => {
    const { error } = await sb
      .from("profiles")
      .update({ display_name: r.value, preferred_currency: form.preferred_currency.value, preferred_locale: form.preferred_locale.value })
      .eq("id", profile.id);
    formMessage(form, error ? "error" : "success", error ? "We couldn't save your changes. Please try again." : "Saved.");
  });
});
document.getElementById("sign-out").addEventListener("click", () => signOut("local"));
document.getElementById("sign-out-all").addEventListener("click", () => signOut("global"));
