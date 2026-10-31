// Profile: "Sign up" and "Sign in" for agents, companies, developers and home owners. Signed in, it shows
// the account (name, role, phone, email) with "Sign out". Below, what this visitor keeps on this device
// (saved properties, their location), which needs no account.
import { boot, html, icon, render, toast } from "../core.js";
import { formatPrice, loadPortfolio, place, small } from "../data.js";
import { wireCollect } from "../collect.js";
import { saved, toggleSaved } from "../store.js";
import { remembered } from "../here.js";
import { currentAccount, roleName, showPhone, signOut } from "../account.js";

boot();
wireCollect();
const portfolio = await loadPortfolio().catch(() => ({ properties: [] }));
const bySlug = Object.fromEntries((portfolio.properties ?? []).map((p) => [p.slug, p]));
const root = document.getElementById("profile");

function welcome() {
  return html`<header class="profile__head">
      <span class="profile__icon">${icon("user", 30, 1.4)}</span>
      <p class="eyebrow">Profile</p>
      <h1>List your properties on Propertiq</h1>
      <p>Agents, companies, developers and home owners: create an account to manage your listings.</p>
    </header>
    <div class="profile__go">
      <a class="btn btn--dark" href="/sign-up">Sign up</a>
      <a class="btn btn--line-dark" href="/sign-in">Sign in</a>
    </div>`;
}

function accountCard(a) {
  return html`<header class="profile__head">
      <span class="profile__icon profile__icon--on">${(a.name ?? "?").trim().charAt(0).toUpperCase()}</span>
      <p class="eyebrow">${roleName(a.role)}</p>
      <h1>${a.name}</h1>
    </header>
    <dl class="acct">
      <div><dt>Phone</dt><dd>${showPhone(a.phone)} <span class="acct__ok">${icon("check", 13, 3)}Verified</span></dd></div>
      ${a.email ? html`<div><dt>Email</dt><dd>${a.email}${a.emailPending ? html` <span class="acct__wait">Check your inbox to confirm</span>` : ""}</dd></div>` : ""}
      <div><dt>Account type</dt><dd>${roleName(a.role)}</dd></div>
    </dl>
    <p class="fineprint">Adding your own listings is coming next. Until then, message us and we'll list them for you.</p>
    <div class="profile__go"><button type="button" class="btn btn--line-dark" data-signout>Sign out</button></div>`;
}

function mine() {
  const s = saved().map((x) => bySlug[x]).filter(Boolean);
  const row = (p) => html`<li class="mine__row">
    <a href="/properties/${p.slug}">${p.photos?.[0] ? html`<img src="${small(p.photos[0])}" alt="" />` : html`<span class="suggest__mono">${p.title[0]}</span>`}<span><strong>${p.title}</strong><small>${p.coming_soon ? "Coming soon" : formatPrice(p.price)} · ${place(p) || "Accra"}</small></span></a>
    <button type="button" class="ptool ptool--plain" data-unsave="${p.slug}" aria-label="Remove ${p.title} from saved">${icon("close", 16, 2)}</button>
  </li>`;
  return html`<section class="mine" aria-labelledby="mine-h">
    <h2 id="mine-h">On this phone</h2>
    <div class="mine__grid">
      <div class="mine__box"><h3>${icon("heart", 18, 1.8)}Saved <span>${s.length}</span></h3>${s.length ? html`<ul>${s.map(row)}</ul>` : html`<p class="fineprint">Tap the heart on any property to keep it here. No account needed.</p>`}</div>
      <div class="mine__box"><h3>${icon("locate", 18, 1.8)}Your location</h3>${remembered() ? html`<p class="fineprint">Shared for this visit, to show distances. It never leaves this device.</p><button type="button" class="btn btn--line-dark" data-forget>Forget my location</button>` : html`<p class="fineprint">Not shared. Distances and directions ask first.</p>`}</div>
    </div>
  </section>`;
}

let account = null;
function draw() {
  render(root, html`${account && !account.unfinished ? accountCard(account) : welcome()}<div id="mine">${mine()}</div>`);
}
draw();
// An account that verified its phone but stopped before step 4 goes back to finish it.
account = await currentAccount();
if (account?.unfinished) location.replace("/sign-up?step=details");
else draw();

root.addEventListener("click", async (e) => {
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
  if (e.target.closest("[data-signout]")) {
    await signOut().catch(() => {});
    account = null;
    toast("Signed out");
    draw();
  }
});
addEventListener("pq:store", () => render("#mine", mine()));
