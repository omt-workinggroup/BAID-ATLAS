// Profile: for agents, companies, developers and home owners. Signed out: the four roles and Sign up /
// Sign in. Signed in: the account (name, role, phone, email) and Sign out.
import { boot, html, icon, render, toast } from "../core.js";
import { ROLES, currentAccount, roleName, showPhone, signOut } from "../account.js";

boot();
const root = document.getElementById("profile");

function welcome() {
  return html`<section class="acc">
    <p class="acc__eyebrow">Propertiq for professionals</p>
    <h1>List with Propertiq</h1>
    <p class="acc__lead">One account to show your properties across Accra.</p>
    <ul class="acc__roles">
      ${ROLES.map(([k, label, ic]) => html`<li><a href="/sign-up?role=${k}"><span class="acc__ic">${icon(ic, 22, 1.5)}</span><span>${label}</span></a></li>`)}
    </ul>
    <div class="acc__go">
      <a class="btn acc__primary" href="/sign-up">Create an account</a>
      <a class="btn acc__secondary" href="/sign-in">Sign in</a>
    </div>
  </section>
  <p class="acc__note">Just looking for a home? You don't need an account.</p>`;
}

function accountCard(a) {
  return html`<section class="acc acc--in">
    <span class="acc__avatar">${(a.name ?? "?").trim().charAt(0).toUpperCase()}</span>
    <p class="acc__eyebrow">${roleName(a.role)}</p>
    <h1>${a.name}</h1>
  </section>
  <dl class="acct">
    <div><dt>Phone</dt><dd>${showPhone(a.phone)} <span class="acct__ok">${icon("check", 13, 3)}Verified</span></dd></div>
    ${a.email ? html`<div><dt>Email</dt><dd>${a.email}${a.emailPending ? html` <span class="acct__wait">Check your inbox to confirm</span>` : ""}</dd></div>` : ""}
    <div><dt>Account type</dt><dd>${roleName(a.role)}</dd></div>
  </dl>
  <p class="fineprint">Adding your own listings is coming next. Until then, message us and we'll list them for you.</p>
  <div class="profile__go"><button type="button" class="btn btn--line-dark" data-signout>Sign out</button></div>`;
}

let account = null;
const draw = () => render(root, account && !account.unfinished ? accountCard(account) : welcome());
draw();
// An account that verified its phone but stopped before the last step goes back to finish it.
account = await currentAccount();
if (account?.unfinished) location.replace("/sign-up?step=details");
else draw();

root.addEventListener("click", async (e) => {
  if (!e.target.closest("[data-signout]")) return;
  await signOut().catch(() => {});
  account = null;
  toast("Signed out");
  draw();
});
