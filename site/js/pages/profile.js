// Profile: for agents, companies, developers and homeowners. Signed out: the four roles and Sign up /
// Sign in. Signed in: the account (name, role, phone, email), its verification status, and Sign out.
import { boot, html, icon, render, toast } from "../core.js";
import {
  ROLES,
  STATUS,
  currentAccount,
  latestApplication,
  roleName,
  showPhone,
  signOut,
} from "../account.js";

boot();
const root = document.getElementById("profile");

function welcome() {
  return html`<section class="acc">
      <p class="acc__eyebrow">Propertiq for professionals</p>
      <h1>List with Propertiq</h1>
      <p class="acc__lead">One account to show your properties across Accra.</p>
      <ul class="acc__roles">
        ${ROLES.map(
          ([k, label, ic]) =>
            html`<li>
              <a href="/sign-up?role=${k}"
                ><span class="acc__ic">${icon(ic, 22, 1.5)}</span
                ><span>${label}</span></a
              >
            </li>`,
        )}
      </ul>
      <div class="acc__go">
        <a class="btn acc__primary" href="/sign-up">Create an account</a>
        <a class="btn acc__secondary" href="/sign-in">Sign in</a>
      </div>
    </section>
    <p class="acc__note">
      Just looking for a home? You don't need an account.
    </p>`;
}

function verification(app) {
  if (!app)
    return html`<div class="vstat vstat--todo">
      <div>
        <strong>Application not finished</strong>
        <p>
          Add your ${roleName(account.role).toLowerCase()} details and documents
          so we can verify your account.
        </p>
      </div>
      <a class="btn btn--dark" href="/sign-up?step=info">Finish application</a>
    </div>`;
  const [label, about] = STATUS[app.status] ?? STATUS.submitted;
  return html`<div
    class="vstat${app.status === "approved" ? " vstat--ok" : ""}"
  >
    <div>
      <span class="pill"
        >${app.status === "approved" ? icon("check", 12, 3) : ""}${label}</span
      >
      <p>${about}</p>
      ${app.status === "more_info_required" && app.reviewer_note ? html`<p class="vstat__note">${app.reviewer_note}</p>` : ""}
    </div>
    <small>Reference <strong>${app.reference}</strong></small>
  </div>`;
}

function accountCard(a) {
  return html`<section class="acc acc--in">
      <span class="acc__avatar"
        >${(a.name ?? "?").trim().charAt(0).toUpperCase()}</span
      >
      <p class="acc__eyebrow">${roleName(a.role)}</p>
      <h1>${a.name}</h1>
    </section>
    ${
      app === undefined
        ? ""
        : html`<h2 class="au__h2">Verification</h2>
            ${verification(app)}`
    }
    <dl class="acct">
      <div>
        <dt>Phone</dt>
        <dd>
          ${showPhone(a.phone)}
          <span class="acct__ok">${icon("check", 13, 3)}Verified</span>
        </dd>
      </div>
      ${
        a.email
          ? html`<div>
              <dt>Email</dt>
              <dd>
                ${a.email}${a.emailPending ? html` <span class="acct__wait">Check your inbox to confirm</span>` : ""}
              </dd>
            </div>`
          : ""
      }
      <div>
        <dt>Account type</dt>
        <dd>${roleName(a.role)}</dd>
      </div>
    </dl>
    <p class="fineprint">
      ${app?.status === "approved" ? "Adding your own listings is coming next. Until then, message us and we'll list them for you." : "You can add properties once your account is verified."}
    </p>
    <div class="profile__go">
      <button type="button" class="btn btn--line-dark" data-signout>
        Sign out
      </button>
    </div>`;
}

let account = null;
let app; // undefined while loading, null when there's no application
const draw = () =>
  render(
    root,
    account && !account.unfinished ? accountCard(account) : welcome(),
  );
draw();
// An account that verified its phone but stopped before the last step goes back to finish it.
account = await currentAccount();
if (account?.unfinished) location.replace("/sign-up?step=account");
else {
  draw();
  if (account) {
    app = await latestApplication();
    draw();
  }
}

root.addEventListener("click", async (e) => {
  if (!e.target.closest("[data-signout]")) return;
  await signOut().catch(() => {});
  account = null;
  toast("Signed out");
  draw();
});
