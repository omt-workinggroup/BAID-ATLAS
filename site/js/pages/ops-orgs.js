// Organisation verification (platform admins). Record only what was actually checked.
import { boot, busy, formMessage, html, render, sb, setTitle, toast } from "../core.js";
import { ORGANIZATION_TYPE_LABELS, VERIFICATION_LABELS } from "../format.js";
import { opsHeader, requireStaff } from "../ops.js";

boot();
const { roles } = await requireStaff(["platform_admin"]);
setTitle("Organisations");
const root = document.getElementById("root");
const STATUSES = [["verified", "Verified"], ["in_review", "In review"], ["rejected", "Not approved"], ["expired", "Expired"]];

async function draw() {
  const { data, error } = await sb
    .from("organizations")
    .select("id, name, slug, type, verification_status, verification_scope, verified_at, verification_expires_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  render(
    root,
    html`${opsHeader(roles, "/ops/organisations")}
      <h1 style="font-size: 1.75rem">Organisations</h1>
      <p class="small muted">Record only what you actually checked. The scope is shown publicly next to the "Verified" label and must not imply ownership of any property.</p>
      ${error ? html`<div class="alert alert--error">Couldn't load organisations.</div>` : ""}
      <ul class="list">
        ${(data ?? []).map(
          (o) => html`<li class="card stack-sm">
            <div class="row-between" style="align-items: flex-start">
              <div><p class="bold">${o.name}</p><p class="tiny muted">${ORGANIZATION_TYPE_LABELS[o.type]} · /${o.slug}</p></div>
              <span class="status ${o.verification_status === "verified" ? "status--approved" : ""}">${VERIFICATION_LABELS[o.verification_status]}</span>
            </div>
            ${o.verification_scope ? html`<p class="small">Scope: ${o.verification_scope}</p>` : ""}
            ${o.verification_expires_at ? html`<p class="tiny muted">Expires ${new Date(o.verification_expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>` : ""}
            <details>
              <summary class="small bold">Update verification</summary>
              <form class="stack-sm mt-1" data-org="${o.id}" novalidate>
                <label class="sr-only" for="st-${o.id}">Status</label>
                <select class="select" id="st-${o.id}" name="status">${STATUSES.map(([v, l]) => html`<option value="${v}">${l}</option>`)}</select>
                <label class="sr-only" for="sc-${o.id}">What was checked</label>
                <input class="input" id="sc-${o.id}" name="scope" maxlength="200" placeholder="e.g. Business registration matches organisation name" />
                <div class="field"><label for="mo-${o.id}">Valid for (months)</label><input class="input" id="mo-${o.id}" name="months" type="number" min="1" max="36" value="12" inputmode="numeric" /></div>
                <button class="btn" type="submit">Save</button>
              </form>
            </details>
          </li>`,
        )}
      </ul>`,
  );
  root.removeAttribute("aria-busy");
}

root.addEventListener("submit", async (e) => {
  const form = e.target.closest("form[data-org]");
  if (!form) return;
  e.preventDefault();
  const status = form.status.value;
  const scope = form.scope.value.trim();
  const months = Number(form.months.value);
  if (status === "verified" && scope.length < 3) return formMessage(form, "error", "Describe exactly what was verified.");
  if (!Number.isInteger(months) || months < 1 || months > 36) return formMessage(form, "error", "Choose between 1 and 36 months.");
  const expires = new Date();
  expires.setMonth(expires.getMonth() + months);
  await busy(form, "Saving…", async () => {
    const { error } = await sb.rpc("set_organization_verification", {
      p_org: form.dataset.org,
      p_status: status,
      p_scope: scope,
      p_expires_at: status === "verified" ? expires.toISOString() : null,
    });
    if (error) return formMessage(form, "error", error.message.includes("describe") ? "Describe exactly what was verified." : "Couldn't save verification.");
    toast("Verification saved and audited.");
    await draw();
  });
});

await draw();
