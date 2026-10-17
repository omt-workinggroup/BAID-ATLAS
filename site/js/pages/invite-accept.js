// Accept an organisation invitation (must be signed in with the invited phone number).
import { boot, busy, contactOf, formMessage, friendlyDbError, html, params, render, requireProfile, sb } from "../core.js";

boot();
const profile = await requireProfile();
const token = params().get("token") ?? "";
const root = document.getElementById("root");
render(
  root,
  html`<div class="page-head"><h1>Join an organisation</h1><p>You've been invited to join a team on Propertiq. The invitation must have been sent to <strong class="bold" style="color: var(--text)">${contactOf(profile)}</strong>.</p></div>
    <form class="card stack" id="accept-form"><button type="submit" class="btn btn--full">Accept invitation</button></form>`,
);
root.removeAttribute("aria-busy");
const form = document.getElementById("accept-form");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!/^[a-f0-9]{48}$/.test(token)) return formMessage(form, "error", "This invitation link is not valid.");
  await busy(form, "Joining…", async () => {
    const { data: orgId, error } = await sb.rpc("accept_invitation", { p_token: token });
    if (error || !orgId) return formMessage(form, "error", error?.message?.includes("different") ? "This invitation was sent to a different phone number." : friendlyDbError(error));
    const { data: org } = await sb.from("organizations").select("slug").eq("id", orgId).single();
    location.href = `/portal/${org.slug}?joined=1`;
  });
});
