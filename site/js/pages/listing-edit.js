// Listing editor: status and next action, photos (upload, cover, remove) and the details form.
import { boot, busy, formMessage, html, params, raw, render, sb, setTitle, showErrors, signedUrls, toast } from "../core.js";
import { LISTING_STATUS_LABELS, reviewReason } from "../format.js";
import { MEDIA_BUCKET } from "../config.js";
import { loadCatalogue } from "../catalogue.js";
import { listingDbMessage, listingFormView, readListingForm, wireListingForm, wirePinPicker } from "../listingform.js";
import { STALE_AFTER_DAYS, availabilityState } from "../trust.js";
import { prepareImage, randomName } from "../media.js";
import { canEditListings, requireMembership } from "../portal.js";

boot();
const { org, role } = await requireMembership();
const listingId = location.pathname.split("/").filter(Boolean).pop();
const root = document.getElementById("root");
const catalogue = await loadCatalogue();
const canEdit = canEditListings(role);
const EDITABLE = ["draft", "changes_requested"];
const DONE = {
  created: "Draft saved. Now add a few great photos.",
  submitted: "Submitted! Submitting also confirms it is available today. Our moderators usually review listings within one working day.",
  published: "Your listing is live.",
  paused: "Listing paused — it's hidden from search.",
  sold: "Marked as sold. Congratulations!",
  rented: "Marked as rented. Congratulations!",
  availability: "Availability confirmed. The new date now shows on the listing.",
  archived: "Listing archived.",
};
let notice = params().get("created") ? DONE.created : null;

async function draw() {
  const { data: l, error } = await sb.rpc("get_listing_for_edit", { p_listing: listingId });
  if (error || !l || l.organization_id !== org.id) {
    render(root, html`<div class="empty"><h1>Listing not found</h1><a class="btn" href="/portal/${org.slug}/listings">All listings</a></div>`);
    root.removeAttribute("aria-busy");
    return;
  }
  setTitle(l.title);
  const [{ data: media }, { data: reviews }] = await Promise.all([
    sb.from("property_media").select("id, storage_path, alt_text, is_render, is_virtually_staged, sort_order").eq("listing_id", listingId).is("hidden_at", null).order("sort_order").order("created_at"),
    sb.from("listing_reviews").select("status, reason_code, provider_message").eq("listing_id", listingId).order("submitted_at", { ascending: false }).limit(1),
  ]);
  const photos = media ?? [];
  const urls = await signedUrls(photos.map((m) => m.storage_path));
  const editable = canEdit && EDITABLE.includes(l.status);
  const review = reviews?.[0];
  const descriptionOk = (l.description ?? "").length >= 40;
  const check = (ok, label) => html`<li class="row small"><span class="status ${ok ? "status--live" : ""}" style="padding: 0.1rem 0.45rem">${ok ? "✓" : "–"}</span><span class="${ok ? "" : "muted"}">${label}</span></li>`;

  render(
    root,
    html`<a class="back-link" href="/portal/${org.slug}/listings">← All listings</a>
      <div class="row-between" style="align-items: flex-start"><h1 style="font-size: 1.75rem">${l.title}</h1><span class="status status--${l.status}">${LISTING_STATUS_LABELS[l.status]}</span></div>
      ${l.reference ? html`<p class="tiny muted">Reference <span class="bold">${l.reference}</span></p>` : ""}
      ${notice ? html`<div class="alert alert--success">${notice}</div>` : ""}
      ${l.status === "changes_requested" && review
        ? html`<div class="alert alert--warning"><p class="bold">Our moderators asked for changes${review.reason_code ? `: ${reviewReason(review.reason_code)}` : ""}</p>${review.provider_message ? html`<p class="mt-1">${review.provider_message}</p>` : ""}</div>`
        : ""}
      ${l.status === "rejected" && review?.provider_message ? html`<div class="alert alert--error">${review.provider_message}</div>` : ""}
      ${editable ? html`<div class="steps"><span class="done">Details</span><span class="${photos.length ? "done" : ""}">Photos</span><span>Review</span><span>Live</span></div>` : ""}
      ${canEdit ? actionsCard(l, photos, editable, descriptionOk, check) : ""}
      <section class="card stack">
        <div class="row-between"><h2>Photos</h2><span class="small muted">${photos.length}/30</span></div>
        ${photos.length
          ? html`<div class="photo-grid">${photos.map(
              (m, i) => html`<figure>
                ${urls.get(m.storage_path) ? html`<img src="${urls.get(m.storage_path)}" alt="${m.alt_text ?? ""}" loading="lazy" />` : ""}
                <div style="position: absolute; inset: 0.25rem 0.25rem auto 0.25rem; display: flex; gap: 0.25rem; flex-wrap: wrap">
                  ${i === 0 ? html`<span class="tag tag--dark">Cover</span>` : ""}${m.is_render ? html`<span class="tag tag--warning">Render</span>` : ""}${m.is_virtually_staged ? html`<span class="tag tag--warning">Staged</span>` : ""}
                </div>
                ${editable ? html`<div class="tools">${i !== 0 ? html`<button type="button" data-cover="${m.id}">Make cover</button>` : html`<span></span>`}<button type="button" data-hide="${m.id}" aria-label="Remove photo" style="color: var(--danger)">Remove</button></div>` : ""}
              </figure>`,
            )}</div>`
          : html`<p class="small muted">No photos yet.</p>`}
        ${editable ? uploaderView(30 - photos.length) : ""}
      </section>
      ${listingFormView(l, { locked: !editable, submitLabel: "Save changes", catalogue })}`,
  );
  root.removeAttribute("aria-busy");
  const form = document.getElementById("listing-form");
  if (editable) wireListingForm(form, catalogue);
  wirePinPicker(form);
}

function actionsCard(l, photos, editable, descriptionOk, check) {
  const verified = org.verification_status === "verified";
  return html`<section class="card stack">
    ${editable
      ? html`<h2>Ready to go?</h2>
          <ul class="stack-sm">${check(true, "Details saved")}${check(photos.length > 0, "At least one photo")}${check(descriptionOk, "Description of 40+ characters")}</ul>
          <button type="button" class="btn btn--full" data-action="submit" ${raw(photos.length === 0 || !descriptionOk ? "disabled" : "")}>Submit for review</button>
          <p class="tiny muted">Submitting also confirms the property is available today. That date is shown to buyers.</p>`
      : ""}
    ${l.status === "submitted" ? html`<p class="small muted">In review. You'll be able to publish once it's approved.</p>` : ""}
    ${["approved", "paused"].includes(l.status)
      ? html`<p class="small muted">${verified ? "Approved and ready to publish." : "Approved! Publishing unlocks once your organisation is verified."}</p>
          <button type="button" class="btn btn--full" data-action="publish" ${raw(verified ? "" : "disabled")}>${l.status === "paused" ? "Resume listing" : "Publish listing"}</button>`
      : ""}
    ${l.status === "published"
      ? html`<a class="link" href="/properties/${l.slug}">View live listing ↗</a><p class="tiny muted">Live until ${new Date(l.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>`
      : ""}
    ${["approved", "published", "paused"].includes(l.status) ? availabilityView(l) : ""}
    ${["published", "paused"].includes(l.status)
      ? html`<div class="row wrap">
          ${l.status === "published" ? html`<button type="button" class="btn btn--secondary btn--small" data-status="paused">Pause</button>` : ""}
          <button type="button" class="btn btn--secondary btn--small" data-status="${l.purpose === "sale" ? "sold" : "rented"}">${l.purpose === "sale" ? "Mark sold" : "Mark rented"}</button>
          <button type="button" class="btn btn--secondary btn--small" data-status="archived">Archive</button>
        </div>`
      : ""}
  </section>`;
}

// Dated availability: shown on the public listing. Confirming records who confirmed it and when.
function availabilityView(l) {
  const a = availabilityState(l.availability_confirmed_at);
  const when = l.availability_confirmed_at
    ? new Date(l.availability_confirmed_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;
  return html`<div class="card--muted card stack-sm" style="padding: 1rem">
    <p class="row-between"><span class="bold">Availability</span>
      <span class="status ${a.state === "fresh" ? "status--live" : "status--changes_requested"}">${a.state === "fresh" ? "Confirmed" : a.state === "stale" ? "Needs reconfirming" : "Not confirmed"}</span></p>
    <p class="small muted">${when ? `Last confirmed on ${when}.` : "Not confirmed yet."} Buyers see this date. After ${STALE_AFTER_DAYS} days it shows as needing reconfirmation.</p>
    <button type="button" class="btn btn--secondary btn--small" data-action="confirm-availability">It's still available</button>
  </div>`;
}

function uploaderView(remaining) {
  return html`<div class="stack">
    <div class="card--muted card stack-sm small" style="padding: 1rem">
      <label class="row" style="align-items: flex-start"><input type="checkbox" id="rights" /><span>I own these photos or have permission to use them, and they show this property.</span></label>
      <label class="row" style="align-items: flex-start"><input type="checkbox" id="is-render" /><span>These are <strong>renders</strong> (computer-generated), not photos.</span></label>
      <label class="row" style="align-items: flex-start"><input type="checkbox" id="is-staged" /><span>These photos are <strong>virtually staged</strong> (furniture added digitally).</span></label>
    </div>
    <input type="file" id="files" class="sr-only" accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" multiple />
    <button type="button" class="dropzone" id="pick" ${raw(remaining > 0 ? "" : "disabled")}>
      <span class="bold">Add photos</span>
      <span class="tiny muted">${remaining > 0 ? `Up to ${remaining} more · resized and location data removed on your phone` : "Photo limit reached"}</span>
    </button>
    <ul class="stack-sm small" id="upload-status"></ul>
  </div>`;
}

async function upload(files) {
  const isRender = document.getElementById("is-render").checked;
  const isStaged = document.getElementById("is-staged").checked;
  const status = document.getElementById("upload-status");
  const list = [...files].slice(0, 30);
  status.innerHTML = list.map((f, i) => `<li id="up-${i}" class="muted">Preparing ${f.name.replace(/[<>&]/g, "")}…</li>`).join("");
  await Promise.all(
    list.map(async (file, i) => {
      const line = document.getElementById(`up-${i}`);
      try {
        const { blob, width, height } = await prepareImage(file);
        const path = `${org.id}/${listingId}/${randomName()}`;
        const { error } = await sb.storage.from(MEDIA_BUCKET).upload(path, blob, { contentType: "image/webp", upsert: false });
        if (error) throw new Error("Upload failed. Check your connection and try again.");
        const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 120);
        const { error: e2 } = await sb.rpc("add_listing_media", { p_listing: listingId, p_path: path, p_alt: alt, p_is_render: isRender, p_is_staged: isStaged, p_width: width, p_height: height });
        if (e2) throw new Error(listingDbMessage(e2));
        line.textContent = `✓ ${file.name}`;
      } catch (err) {
        line.textContent = `${file.name}: ${err.message}`;
        line.className = "error-text";
      }
    }),
  );
  notice = null;
  await draw();
}

root.addEventListener("click", async (e) => {
  const t = e.target.closest("button");
  if (!t) return;
  if (t.id === "pick") {
    if (!document.getElementById("rights").checked) return toast("Please confirm you have the right to use these photos.");
    return document.getElementById("files").click();
  }
  const call = async (rpc, args, done) => {
    t.disabled = true;
    const { error } = await sb.rpc(rpc, args);
    if (error) {
      t.disabled = false;
      return toast(listingDbMessage(error));
    }
    notice = done ? DONE[done] : null;
    await draw();
    window.scrollTo({ top: 0 });
  };
  if (t.dataset.cover) return call("set_listing_cover", { p_media: t.dataset.cover });
  if (t.dataset.hide) return confirm("Remove this photo?") && call("hide_listing_media", { p_media: t.dataset.hide });
  if (t.dataset.action === "submit") return call("submit_listing", { p_listing: listingId }, "submitted");
  if (t.dataset.action === "confirm-availability") return call("confirm_listing_availability", { p_listing: listingId }, "availability");
  if (t.dataset.action === "publish") return call("publish_listing", { p_listing: listingId }, "published");
  if (t.dataset.status) return call("set_listing_status", { p_listing: listingId, p_status: t.dataset.status }, t.dataset.status);
});
root.addEventListener("change", (e) => e.target.id === "files" && e.target.files.length && upload(e.target.files));
root.addEventListener("submit", async (e) => {
  if (e.target.id !== "listing-form") return;
  e.preventDefault();
  const form = e.target;
  const { payload, errors } = readListingForm(form);
  if (!showErrors(form, errors)) return;
  await busy(form, "Saving…", async () => {
    const { error } = await sb.rpc("update_listing", { p_listing: listingId, p: payload });
    formMessage(form, error ? "error" : "success", error ? listingDbMessage(error) : "Saved.");
  });
});

draw();
