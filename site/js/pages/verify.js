// Code screen: submits as soon as 6 digits are in (typed, pasted, or read from the SMS on Android),
// then signs the user in and continues to where they were going.
import { boot, sb, showErrors } from "../core.js";
import { otp as otpRule } from "../validate.js";

boot();

const pending = JSON.parse(sessionStorage.getItem("otp_pending") ?? "null");
if (!pending || Date.now() - pending.at > 15 * 60 * 1000) location.replace("/sign-in?error=expired");

// "+233241234567" -> "+233 24 *** 4567": enough to recognise, not enough to copy.
const m = /^(\+233)(\d{2})\d{3}(\d{4})$/.exec(pending?.phone ?? "");
document.getElementById("masked-phone").textContent = m ? `${m[1]} ${m[2]} *** ${m[3]}` : pending?.phone ?? "";

const form = document.getElementById("code-form");
const input = form.token;
let lastTried = "";

function setCode(raw) {
  const digits = String(raw).replace(/\D/g, "").slice(0, 6);
  input.value = digits;
  if (digits.length === 6 && digits !== lastTried) form.requestSubmit();
}
input.addEventListener("input", () => setCode(input.value));
input.addEventListener("paste", (e) => {
  e.preventDefault();
  setCode(e.clipboardData.getData("text"));
});

// Chrome on Android reads the code straight from the SMS ("@baid-atlas.vercel.app #123456").
if ("OTPCredential" in window) {
  const ac = new AbortController();
  form.addEventListener("submit", () => ac.abort(), { once: true });
  navigator.credentials.get({ otp: { transport: ["sms"] }, signal: ac.signal }).then((c) => c?.code && setCode(c.code)).catch(() => {});
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const r = otpRule(input.value);
  if (!showErrors(form, r.error ? { token: r.error } : {})) return;
  lastTried = r.value;
  const btn = form.querySelector("button");
  btn.disabled = true;
  btn.textContent = "Signing you in…";
  input.readOnly = true;
  const { error } = await sb.auth.verifyOtp({ phone: pending.phone, token: r.value, type: "sms" });
  if (error) {
    btn.disabled = false;
    btn.textContent = "Verify and continue";
    input.readOnly = false;
    input.value = "";
    lastTried = "";
    showErrors(form, { token: error.status === 429 ? "Too many attempts. Please wait a few minutes." : "That code is wrong or has expired. Check it, or send a new one." });
    return;
  }
  sessionStorage.removeItem("otp_pending");
  location.replace(pending.next);
});

// Resend, at most once a minute.
const resend = document.getElementById("resend");
const msg = document.getElementById("resend-msg");
resend.addEventListener("click", async () => {
  resend.disabled = true;
  const { error } = await sb.auth.signInWithOtp({ phone: pending.phone, options: { shouldCreateUser: true, channel: "sms" } });
  msg.textContent = error ? "Please wait a minute before asking for another code." : "A new code is on its way.";
  msg.className = `small ${error ? "error-text" : ""}`;
  setTimeout(() => (resend.disabled = false), 60_000);
});
