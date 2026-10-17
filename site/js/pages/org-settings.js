// Organisation public profile (owners and admins edit; others read).
import { boot, busy, field, formMessage, friendlyDbError, html, render, sb, setTitle, showErrors, textareaField } from "../core.js";
import { check, email, httpsUrl, optionalPhone, text } from "../validate.js";
import { canManageTeam, orgHeader, requireMembership } from "../portal.js";

boot();
const { org, role } = await requireMembership();
setTitle(`Profile · ${org.name}`);
const root = document.getElementById("root");
const editable = canManageTeam(role);
render(
  root,
  html`${orgHeader(org, role, "/settings")}
    ${editable ? "" : html`<div class="alert alert--info">Only owners and admins can edit the organisation profile.</div>`}
    <form class="card stack" id="settings-form" novalidate>
      <fieldset class="stack" style="border: 0; padding: 0; margin: 0" ${editable ? "" : "disabled"}>
        ${field({ label: "Name", name: "name", value: org.name, attrs: 'maxlength="120"' })}
        ${textareaField({ label: "Description", name: "description", value: org.description ?? "", attrs: 'maxlength="2000"', hint: "Shown on your public profile." })}
        ${field({ label: "Website", name: "website", type: "url", value: org.website ?? "", hint: "Must start with https://" })}
        ${field({ label: "Public email (optional)", name: "public_email", type: "email", value: org.public_email ?? "" })}
        ${field({ label: "Public phone (optional)", name: "public_phone", type: "tel", value: org.public_phone ?? "", hint: "e.g. 030 123 4567 or +233…" })}
        ${editable ? html`<button type="submit" class="btn btn--full">Save profile</button>` : ""}
      </fieldset>
    </form>
    <a class="link small" href="/providers/${org.slug}">View public profile ↗</a>`,
);
root.removeAttribute("aria-busy");

const form = document.getElementById("settings-form");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const { values, errors } = check(new FormData(form), {
    name: (v) => text(v, { label: "Name", min: 2, max: 120 }),
    description: (v) => text(v, { optional: true, max: 2000 }),
    website: httpsUrl,
    public_email: email,
    public_phone: optionalPhone,
  });
  if (!showErrors(form, errors)) return;
  await busy(form, "Saving…", async () => {
    const { data, error } = await sb.from("organizations").update(values).eq("id", org.id).select("id");
    formMessage(form, error || !data?.length ? "error" : "success", error || !data?.length ? friendlyDbError(error) : "Profile saved.");
  });
});
