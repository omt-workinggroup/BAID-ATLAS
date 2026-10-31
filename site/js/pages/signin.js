// Sign in with phone number and password. "Forgot password?" texts a code to the number, then asks for a
// new password.
import { boot, html, icon, render } from "../core.js";
import { currentAccount, normalisePhone, sendCode, setPassword, showPhone, signIn, validPhone, verifyCode } from "../account.js";

boot();
const root = document.getElementById("auth");
let mode = "signin";
let phone = "";

const error = html`<p class="au__err" role="alert" hidden></p>`;
const phoneField = () => html`<label class="au__field"><span>Phone number</span><span class="au__phone"><span class="au__cc">+233</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="24 123 4567" value="${phone.replace(/^\+233/, "")}" required /></span></label>`;
const pwField = (label, auto) =>
  html`<label class="au__field"><span>${label}</span><span class="au__pw"><input name="password" type="password" autocomplete="${auto}" required /><button type="button" class="au__show" data-show>Show</button></span></label>`;

const views = {
  signin: () => html`<a class="au__back" href="/profile">${icon("back", 16, 2)}Back</a>
    <p class="eyebrow">Welcome back</p><h1>Sign in</h1>
    <form id="f" class="au__form" novalidate>${phoneField()}${pwField("Password", "current-password")}${error}<button type="submit" class="btn btn--dark">Sign in</button></form>
    <p class="au__alt"><button type="button" class="text-link" data-mode="forgot">Forgot password?</button> · New here? <a href="/sign-up">Sign up</a></p>`,
  forgot: () => html`<button type="button" class="au__back" data-mode="signin">${icon("back", 16, 2)}Back</button>
    <h1>Reset your password</h1><p class="au__lead">We'll text a code to the number on your account.</p>
    <form id="f" class="au__form" novalidate>${phoneField()}${error}<button type="submit" class="btn btn--dark">Send code</button></form>`,
  code: () => html`<button type="button" class="au__back" data-mode="forgot">${icon("back", 16, 2)}Back</button>
    <h1>Enter the code</h1><p class="au__lead">Sent by SMS to <strong>${showPhone(phone)}</strong>.</p>
    <form id="f" class="au__form" novalidate><label class="au__field"><span class="sr-only">6-digit code</span><input class="au__otp" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" required /></label>${error}<button type="submit" class="btn btn--dark">Verify</button></form>`,
  newpw: () => html`<h1>New password</h1><p class="au__lead">At least 8 characters.</p>
    <form id="f" class="au__form" novalidate>${pwField("New password", "new-password")}${error}<button type="submit" class="btn btn--dark">Save and sign in</button></form>`,
};

const fail = (form, m) => {
  const el = form.querySelector(".au__err");
  el.textContent = m;
  el.hidden = false;
};
async function busy(form, label, work) {
  const btn = form.querySelector("button[type=submit]");
  const was = btn.textContent;
  btn.disabled = true;
  btn.textContent = label;
  form.querySelector(".au__err").hidden = true;
  try {
    await work();
  } catch (e) {
    fail(form, e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = was;
  }
}
function readPhone(form) {
  const p = normalisePhone(form.phone.value);
  if (!validPhone(p)) {
    fail(form, "Enter a valid phone number, for example 024 123 4567.");
    return null;
  }
  return (phone = p);
}

const submit = {
  signin(form) {
    if (!readPhone(form)) return;
    if (!form.password.value) return fail(form, "Enter your password.");
    busy(form, "Signing in…", async () => {
      await signIn(phone, form.password.value);
      location.replace("/profile");
    });
  },
  forgot(form) {
    if (!readPhone(form)) return;
    busy(form, "Sending…", async () => {
      await sendCode(phone, { forReset: true });
      draw("code");
    });
  },
  code(form) {
    const code = form.code.value.replace(/\D/g, "");
    if (code.length !== 6) return fail(form, "Enter the 6-digit code from the text message.");
    busy(form, "Checking…", async () => {
      await verifyCode(phone, code);
      draw("newpw");
    });
  },
  newpw(form) {
    if (form.password.value.length < 8) return fail(form, "Choose a password of at least 8 characters.");
    busy(form, "Saving…", async () => {
      await setPassword(form.password.value);
      location.replace("/profile");
    });
  },
};

function draw(next = mode) {
  mode = next;
  render(root, views[mode]());
  const form = document.getElementById("f");
  form.querySelector("input")?.focus();
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submit[mode](form);
  });
}
root.addEventListener("click", (e) => {
  const m = e.target.closest("[data-mode]");
  if (m) draw(m.dataset.mode);
  const show = e.target.closest("[data-show]");
  if (show) {
    const input = show.previousElementSibling;
    input.type = input.type === "password" ? "text" : "password";
    show.textContent = input.type === "password" ? "Show" : "Hide";
  }
});

draw();
const a = await currentAccount();
if (a && !a.unfinished) location.replace("/profile");
