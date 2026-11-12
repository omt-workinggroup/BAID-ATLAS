// Sign up in four steps: 1 role, 2 phone number, 3 the 6-digit code sent by SMS, 4 name, email and password.
// The step is kept in the address (?step=) so the back button works. An account that verified its phone
// but stopped before step 4 is sent back to it (/sign-up?step=details).
import { boot, html, icon, render } from "../core.js";
import { ROLES, currentAccount, finishAccount, normalisePhone, roleName, sendCode, showPhone, validPhone, verifyCode } from "../account.js";

boot();
const root = document.getElementById("auth");
const KEY = "pq-signup";
const load = () => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
};
const st = { role: "agent", phone: "", ...load() };
// /sign-up?role=company (from the Profile page) starts with that role picked.
const asked = new URLSearchParams(location.search).get("role");
if (ROLES.some(([k]) => k === asked)) st.role = asked;
const keep = () => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(st));
  } catch {
    /* storage unavailable */
  }
};
const STEPS = ["role", "phone", "code", "details"];
let step = new URLSearchParams(location.search).get("step");
if (!STEPS.includes(step)) step = "role";
// The code and details steps need a number (and, for details, a verified one).
if (step !== "role" && step !== "details" && !st.phone) step = step === "code" ? "phone" : step;

function go(next, { replace = false } = {}) {
  step = next;
  history[replace ? "replaceState" : "pushState"](null, "", next === "role" ? "/sign-up" : `/sign-up?step=${next}`);
  draw();
}
addEventListener("popstate", () => {
  const s = new URLSearchParams(location.search).get("step");
  step = STEPS.includes(s) ? s : "role";
  draw();
});

const bar = () => html`<div class="steps" aria-hidden="true">${STEPS.map((s, i) => html`<i class="${i <= STEPS.indexOf(step) ? "on" : ""}"></i>`)}</div>
  <p class="stepn">Step ${STEPS.indexOf(step) + 1} of 4${step !== "role" ? ` · ${roleName(st.role)}` : ""}</p>`;
const back = (to) => html`<a class="au__back" href="${to}" data-back="${to}">${icon("back", 16, 2)}Back</a>`;
const error = html`<p class="au__err" role="alert" hidden></p>`;
const fail = (form, message) => {
  const el = form.querySelector(".au__err");
  el.textContent = message;
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

const views = {
  role: () => html`${back("/profile")}${bar()}
    <h1>Who are you?</h1><p class="au__lead">Choose how you'll list on Propertiq.</p>
    <form id="f" class="au__form" novalidate>
      <fieldset class="r4"><legend class="sr-only">Account type</legend>
        ${ROLES.map(([k, label, ic, about]) => html`<label class="r4__opt"><input type="radio" name="role" value="${k}" ${k === st.role ? html`checked` : ""} /><span class="r4__box"><span class="r4__ic">${icon(ic, 22)}</span><strong>${label}</strong><small>${about}</small></span></label>`)}
      </fieldset>
      ${error}<button type="submit" class="btn btn--dark">Continue</button>
    </form>
    <p class="au__alt">Already have an account? <a href="/sign-in">Sign in</a></p>`,
  phone: () => html`${back("/sign-up")}${bar()}
    <h1>Your phone number</h1><p class="au__lead">We'll text you a 6-digit code to confirm it's yours.</p>
    <form id="f" class="au__form" novalidate>
      <label class="au__field"><span>Phone number</span><span class="au__phone"><span class="au__cc">+233</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="24 123 4567" value="${st.phone ? st.phone.replace(/^\+233/, "") : ""}" required /></span></label>
      ${error}<button type="submit" class="btn btn--dark">Send code</button>
    </form>
    <p class="au__alt">Already have an account? <a href="/sign-in">Sign in</a></p>`,
  code: () => html`${back("/sign-up?step=phone")}${bar()}
    <h1>Enter the code</h1><p class="au__lead">Sent by SMS to <strong>${showPhone(st.phone)}</strong>. <a class="text-link" href="/sign-up?step=phone" data-back="/sign-up?step=phone">Change</a></p>
    <form id="f" class="au__form" novalidate>
      <label class="au__field"><span class="sr-only">6-digit code</span><input class="au__otp" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" maxlength="6" placeholder="••••••" required /></label>
      ${error}<button type="submit" class="btn btn--dark">Verify</button>
    </form>
    <p class="au__alt">Didn't get it? <button type="button" class="text-link" id="resend" disabled>Resend in <span id="t">60</span>s</button></p>`,
  details: () => html`${bar()}
    <h1>Your details</h1><p class="au__lead"><span class="au__ok">${icon("check", 13, 3)}Phone confirmed</span> ${showPhone(st.phone)}</p>
    <form id="f" class="au__form" novalidate>
      <label class="au__field"><span>${st.role === "company" || st.role === "developer" ? "Company name" : "Your name"}</span><input name="name" autocomplete="${st.role === "company" || st.role === "developer" ? "organization" : "name"}" value="${st.name ?? ""}" required /></label>
      <label class="au__field"><span>Email</span><input name="email" type="email" autocomplete="email" value="${st.email ?? ""}" required /></label>
      <label class="au__field"><span>Password <em>At least 8 characters</em></span><span class="au__pw"><input name="password" type="password" autocomplete="new-password" minlength="8" required /><button type="button" class="au__show" data-show>Show</button></span></label>
      ${error}<button type="submit" class="btn btn--dark">Create account</button>
    </form>
    <p class="au__alt">You'll sign in with your phone number and this password.</p>`,
};

function draw() {
  render(root, views[step]());
  const form = document.getElementById("f");
  form.querySelector("input:not([type=radio])")?.focus();
  if (step === "code") startResend();
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submit[step](form);
  });
}

const submit = {
  role(form) {
    st.role = new FormData(form).get("role") ?? "agent";
    keep();
    go("phone");
  },
  phone(form) {
    const phone = normalisePhone(form.phone.value);
    if (!validPhone(phone)) return fail(form, "Enter a valid phone number, for example 024 123 4567.");
    busy(form, "Sending…", async () => {
      await sendCode(phone);
      st.phone = phone;
      keep();
      go("code");
    });
  },
  code(form) {
    const code = form.code.value.replace(/\D/g, "");
    if (code.length !== 6) return fail(form, "Enter the 6-digit code from the text message.");
    busy(form, "Checking…", async () => {
      await verifyCode(st.phone, code);
      // A number that already finished signing up is simply signed in.
      const a = await currentAccount();
      if (a && !a.unfinished) {
        sessionStorage.removeItem(KEY);
        location.replace("/profile");
        return;
      }
      go("details", { replace: true });
    });
  },
  details(form) {
    const f = Object.fromEntries(new FormData(form));
    const name = String(f.name ?? "").trim();
    const email = String(f.email ?? "").trim();
    if (name.length < 2) return fail(form, "Add your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(form, "Add a valid email address.");
    if (String(f.password).length < 8) return fail(form, "Choose a password of at least 8 characters.");
    Object.assign(st, { name, email });
    keep();
    busy(form, "Creating…", async () => {
      await finishAccount({ role: st.role, name, email, password: f.password });
      sessionStorage.removeItem(KEY);
      location.replace("/profile?welcome=1");
    });
  },
};

let timer;
function startResend() {
  clearInterval(timer);
  let left = 60;
  const btn = document.getElementById("resend");
  timer = setInterval(() => {
    left -= 1;
    const t = document.getElementById("t");
    if (t) t.textContent = String(left);
    if (left <= 0) {
      clearInterval(timer);
      btn.disabled = false;
      btn.textContent = "Send a new code";
    }
  }, 1000);
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    try {
      await sendCode(st.phone);
      startResend();
    } catch (e) {
      fail(document.getElementById("f"), e.message);
      btn.disabled = false;
    }
  });
}

root.addEventListener("click", (e) => {
  const b = e.target.closest("[data-back]");
  if (b && b.dataset.back.startsWith("/sign-up")) {
    e.preventDefault();
    const s = new URL(b.dataset.back, location.origin).searchParams.get("step") ?? "role";
    go(s);
  }
  const show = e.target.closest("[data-show]");
  if (show) {
    const input = show.previousElementSibling;
    input.type = input.type === "password" ? "text" : "password";
    show.textContent = input.type === "password" ? "Show" : "Hide";
  }
});

// Signed in already: finished accounts go to the profile; unfinished ones finish step 4.
const a = await currentAccount();
if (a && !a.unfinished) location.replace("/profile");
else {
  if (a?.unfinished) {
    st.phone = a.phone ?? st.phone;
    st.role = a.role ?? st.role;
    step = "details";
  } else if (step === "details") step = "role";
  history.replaceState(null, "", step === "role" ? "/sign-up" : `/sign-up?step=${step}`);
  draw();
}
