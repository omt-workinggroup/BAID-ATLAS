// Sign in and sign up share one flow: phone number -> SMS code. New numbers get a new account.
import { alertBox, boot, busy, getUser, params, render, safeNext, sb, showErrors } from "../core.js";
import { phone as phoneRule } from "../validate.js";

boot();
const isSignUp = location.pathname.startsWith("/sign-up");
const next = isSignUp ? "/onboarding" : safeNext(params().get("next"));

if (await getUser()) location.replace(next);

const notices = {
  signed_out: ["success", "You have been signed out."],
  expired: ["error", "That code request has expired. Enter your number to get a new one."],
  link: ["error", "That link is invalid or has expired. Please sign in again."],
};
const p = params();
const notice = p.get("signed_out") ? notices.signed_out : ["expired", "link"].includes(p.get("error")) ? notices[p.get("error")] : null;
if (notice) render("#notice", alertBox(...notice));

const form = document.getElementById("phone-form");
form.next.value = next; // the checked destination after the code is verified
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const r = phoneRule(form.phone.value);
  if (!showErrors(form, r.error ? { phone: r.error } : {})) return;

  await busy(form, "Sending code…", async () => {
    const { error } = await sb.auth.signInWithOtp({ phone: r.value, options: { shouldCreateUser: true, channel: "sms" } });
    if (error) {
      showErrors(form, { phone: smsError(error) });
      return;
    }
    sessionStorage.setItem("otp_pending", JSON.stringify({ phone: r.value, next, at: Date.now() }));
    location.href = "/verify";
  });
});

// Only a rejected number is the user's to fix; delivery problems (gateway down, out of credit) are ours.
function smsError(error) {
  if (error.status === 429 || error.code === "over_sms_send_rate_limit") return "Please wait a minute before asking for another code.";
  if ((error.status === 400 || error.status === 422) && error.code !== "phone_provider_disabled" && /phone/i.test(error.message)) {
    return "We couldn't send a code to that number. Check it and try again.";
  }
  return "We couldn't send a text message right now. Please try again in a few minutes.";
}
