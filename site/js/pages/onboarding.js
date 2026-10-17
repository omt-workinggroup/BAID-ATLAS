// First visit after sign-up: name and what brings them here.
import { boot, busy, formMessage, friendlyDbError, params, requireProfile, safeNext, sb, showErrors } from "../core.js";
import { text } from "../validate.js";

boot();
const profile = await requireProfile({ allowNotOnboarded: true });
const next = safeNext(params().get("next"), "/account?welcome=1");
if (profile.onboarded_at) location.replace(next);

const form = document.getElementById("onboarding-form");
form.display_name.value = profile.display_name ?? "";
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const r = text(form.display_name.value, { label: "Your name", max: 80 });
  if (!showErrors(form, r.error ? { display_name: r.error } : {})) return;
  await busy(form, "Saving…", async () => {
    const { error } = await sb.rpc("complete_onboarding", { p_display_name: r.value });
    if (error) return formMessage(form, "error", friendlyDbError(error));
    location.replace(form.intent.value === "provide" ? "/portal/new" : next);
  });
});
