// One listing under review: photos, facts, the decision form and the review history.
import { boot, busy, formMessage, html, raw, render, sb, setTitle, signedUrls } from "../core.js";
import { LISTING_STATUS_LABELS, PROPERTY_TYPE_LABELS, PURPOSE_LABELS, REVIEW_REASONS, formatArea, formatDateTime, formatLocation, formatPrice, reviewReason } from "../format.js";
import { opsHeader, requireStaff } from "../ops.js";

boot();
const { roles } = await requireStaff();
const listingId = location.pathname.split("/").filter(Boolean).pop();
const root = document.getElementById("root");
const REVIEW_STATUS = { pending: "Waiting for review", approved: "Approved", changes_requested: "Changes requested", rejected: "Rejected" };

const [{ data: l }, { data: media }, { data: history }] = await Promise.all([
  sb
    .from("property_listings")
    .select("id, title, description, purpose, asking_price, currency, price_period, status, organizations(name, slug, verification_status), properties(type, region, city, locality, bedrooms, bathrooms, floor_area, floor_area_unit, land_area, land_area_unit)")
    .eq("id", listingId)
    .maybeSingle(),
  sb.from("property_media").select("id, storage_path, alt_text, is_render, is_virtually_staged").eq("listing_id", listingId).is("hidden_at", null).order("sort_order"),
  sb.rpc("get_listing_review_history", { p_listing: listingId }),
]);

if (!l) {
  render(root, html`${opsHeader(roles, "/ops")}<div class="empty"><h1>Listing not found</h1><a class="btn" href="/ops">Back to the queue</a></div>`);
} else {
  setTitle(`Review · ${l.title}`);
  const p = l.properties ?? {};
  const photos = media ?? [];
  const urls = await signedUrls(photos.map((m) => m.storage_path));
  const fact = (k, v) => (v ? html`<div class="row-between small"><span class="muted">${k}</span><span class="bold" style="text-align: right">${v}</span></div>` : "");
  const decision = (value, label, checked) =>
    html`<label class="choice"><input type="radio" name="decision" value="${value}" ${raw(checked ? "checked" : "")} /><span>${label}</span></label>`;

  render(
    root,
    html`${opsHeader(roles, "/ops")}
      <a class="back-link" href="/ops">← Review queue</a>
      <div class="row-between" style="align-items: flex-start"><h1 style="font-size: 1.75rem">${l.title}</h1><span class="status status--${l.status}">${LISTING_STATUS_LABELS[l.status]}</span></div>
      <p class="small muted">${l.organizations?.name} · ${l.organizations?.verification_status === "verified" ? "verified organisation" : "unverified organisation"}</p>
      ${photos.length
        ? html`<div class="photo-grid">
            ${photos.map(
              (m, i) => html`<figure>${urls[i] ? html`<img src="${urls[i]}" alt="${m.alt_text ?? ""}" loading="lazy" />` : ""}${m.is_render || m.is_virtually_staged ? html`<span class="photo-tag">${m.is_render ? "Render" : "Staged"}</span>` : ""}</figure>`,
            )}
          </div>`
        : html`<div class="alert alert--warning">No photos.</div>`}
      <section class="card stack-sm">
        ${fact("Offer", `${PURPOSE_LABELS[l.purpose]} · ${formatPrice(l.asking_price, l.currency, l.price_period)}`)}
        ${fact("Property", PROPERTY_TYPE_LABELS[p.type])}
        ${fact("Area", formatLocation(p.locality, p.city, p.region))}
        ${p.bedrooms != null || p.bathrooms != null ? fact("Rooms", `${p.bedrooms ?? "–"} bed · ${p.bathrooms ?? "–"} bath`) : ""}
        ${fact("Floor", formatArea(p.floor_area, p.floor_area_unit))}
        ${fact("Land", formatArea(p.land_area, p.land_area_unit))}
        ${l.description ? html`<p class="quote">${l.description}</p>` : ""}
      </section>
      ${l.status === "submitted"
        ? html`<section class="card">
            <form id="decide" class="stack" novalidate>
              <h2>Decision</h2>
              <fieldset class="choices"><legend class="sr-only">Decision</legend>
                ${decision("approved", "Approve", true)}${decision("changes_requested", "Request changes")}${decision("rejected", "Reject")}
              </fieldset>
              <div class="field"><label for="f-reason">Reason (if not approving)</label>
                <select class="select" id="f-reason" name="reason_code"><option value="">—</option>${Object.entries(REVIEW_REASONS).map(([k, v]) => html`<option value="${k}">${v}</option>`)}</select></div>
              <div class="field"><label for="f-message">Message to the provider</label>
                <textarea class="textarea" id="f-message" name="provider_message" rows="3" maxlength="1000" placeholder="Required when requesting changes or rejecting."></textarea></div>
              <div class="field"><label for="f-notes">Internal notes (staff only)</label>
                <textarea class="textarea" id="f-notes" name="internal_notes" rows="2" maxlength="2000"></textarea></div>
              <button class="btn btn--full" type="submit">Record decision</button>
            </form>
          </section>`
        : ""}
      ${(history ?? []).length
        ? html`<section class="card stack-sm"><h2>History</h2>
            <ul class="stack-sm">
              ${history.map(
                (h) => html`<li class="note small">
                  <p class="bold">${REVIEW_STATUS[h.status] ?? h.status}${h.reviewer_name ? ` · ${h.reviewer_name}` : ""} · ${formatDateTime(h.reviewed_at ?? h.submitted_at)}</p>
                  ${h.reason_code ? html`<p>Reason: ${reviewReason(h.reason_code)}</p>` : ""}
                  ${h.provider_message ? html`<p>To provider: ${h.provider_message}</p>` : ""}
                  ${h.internal_notes ? html`<p class="muted">Internal: ${h.internal_notes}</p>` : ""}
                </li>`,
              )}
            </ul></section>`
        : ""}`,
  );

  document.getElementById("decide")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const decision = f.get("decision");
    const message = String(f.get("provider_message") ?? "").trim();
    if (decision !== "approved" && message.length < 3) return formMessage(form, "error", "Tell the provider what to change or why it was rejected.");
    await busy(form, "Recording…", async () => {
      const { error } = await sb.rpc("review_listing", {
        p_listing: listingId,
        p_decision: decision,
        p_reason_code: decision === "approved" ? "" : f.get("reason_code"),
        p_provider_message: message,
        p_internal_notes: String(f.get("internal_notes") ?? "").trim(),
      });
      if (!error) return location.assign("/ops?done=1");
      const m = error.message ?? "";
      formMessage(
        form,
        "error",
        m.includes("own organisation") ? "You can't review your own organisation's listing."
        : m.includes("tell the provider") ? "Add a message telling the provider what to change."
        : error.code === "55000" ? "This listing is no longer waiting for review."
        : "Couldn't record the decision.",
      );
    });
  });
}
root.removeAttribute("aria-busy");
