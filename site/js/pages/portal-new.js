// Create an organisation. The signed-in person becomes its owner.
import { boot, busy, field, formMessage, friendlyDbError, html, isVerified, render, requireProfile, sb, selectField, showErrors, textareaField } from "../core.js";
import { ORGANIZATION_TYPE_LABELS } from "../format.js";
import { check, slug as slugRule, slugify, text } from "../validate.js";

boot();
const profile = await requireProfile();
const root = document.getElementById("root");
render(
  root,
  html`<a class="back-link" href="/portal">← Provider portal</a>
    <div class="page-head"><h1>Create an organisation</h1><p>You'll be the owner. You can invite your team next.</p></div>
    ${isVerified(profile)
      ? html`<form class="card card--lift stack" id="org-form" novalidate>
          ${field({ label: "Organisation name", name: "name", attrs: 'autocomplete="organization" maxlength="120"' })}
          ${field({ label: "Web address", name: "slug", hint: "propertiq.com/providers/your-name — lowercase letters, numbers and hyphens.", attrs: 'maxlength="60" autocapitalize="none"' })}
          ${selectField({ label: "Type", name: "type", value: "", options: [["", "Choose…"], ...Object.entries(ORGANIZATION_TYPE_LABELS)] })}
          ${textareaField({ label: "Short description (optional)", name: "description", attrs: 'maxlength="2000"' })}
          <button type="submit" class="btn btn--full">Create organisation</button>
        </form>`
      : html`<div class="alert alert--warning">Verify your phone number before creating an organisation.</div>`}
    <p class="small muted">Verification of your organisation (business registration and similar) happens separately and is shown publicly with exactly what was checked.</p>`,
);
root.removeAttribute("aria-busy");

const form = document.getElementById("org-form");
if (form) {
  let slugTouched = false;
  form.slug.addEventListener("input", () => (slugTouched = true));
  form.name.addEventListener("input", () => !slugTouched && (form.slug.value = slugify(form.name.value)));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const { values, errors } = check(new FormData(form), {
      name: (v) => text(v, { label: "Organisation name", min: 2, max: 120 }),
      slug: slugRule,
      type: (v) => (v ? { value: v } : { error: "Choose an organisation type." }),
      description: (v) => text(v, { optional: true, max: 2000 }),
    });
    if (!showErrors(form, errors)) return;
    await busy(form, "Creating…", async () => {
      const { error } = await sb.rpc("create_organization", { p_name: values.name, p_slug: values.slug, p_type: values.type, p_description: values.description ?? "" });
      if (error) return error.code === "23505" ? showErrors(form, { slug: "That web address is already taken." }) : formMessage(form, "error", friendlyDbError(error));
      location.href = `/portal/${values.slug}?created=1`;
    });
  });
}
