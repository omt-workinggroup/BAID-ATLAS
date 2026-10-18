// The public trust panel. Every line is worked out from a recorded fact (a dated check, a label on a
// photo, a confirmation by the advertiser) and says what it does NOT prove. Nothing here is a single
// "verified property" badge, and paid promotion never appears as a check.
import { html } from "./core.js";

export const STALE_AFTER_DAYS = 30;
const DAY = 86_400_000;

const dateText = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const daysAgo = (iso, now) => Math.floor((now - new Date(iso).getTime()) / DAY);
const agoText = (days) => (days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`);

// Availability: when the advertiser (or, later, Propertiq) last confirmed the property is still on offer.
export function availabilityState(confirmedAt, now = Date.now()) {
  if (!confirmedAt) return { state: "none", days: null };
  const days = daysAgo(confirmedAt, now);
  return { state: days > STALE_AFTER_DAYS ? "stale" : "fresh", days };
}

const METHOD_TEXT = { advertiser: "by the advertiser", staff: "by Propertiq staff", property_visit: "during a Propertiq visit" };

/**
 * @param l   listing row (listing_cards) with availability_confirmed_at / availability_method / is_sponsored
 * @param org { verification_status, verification_scope, verified_at, verification_expires_at }
 * @param photos [{ is_render, is_virtually_staged }]
 * Returns rows: { key, title, status: "checked" | "attention" | "none", value, detail, limits }
 */
export function trustItems(l, org, photos, now = Date.now()) {
  const rows = [];

  // 1. Advertiser identity
  const expired = org?.verification_expires_at && new Date(org.verification_expires_at).getTime() <= now;
  if (org?.verification_status === "verified" && !expired) {
    rows.push({
      key: "identity", title: "Advertiser identity", status: "checked", value: "Checked",
      detail: [org.verification_scope, org.verified_at && `Checked ${dateText(org.verified_at)}`, org.verification_expires_at && `valid until ${dateText(org.verification_expires_at)}`].filter(Boolean).join(" · "),
      limits: "Confirms who the advertiser is, within the scope shown. It does not prove they own this property or have the right to sell or rent it.",
    });
  } else {
    rows.push({
      key: "identity", title: "Advertiser identity", status: expired ? "attention" : "none", value: expired ? "Check expired" : "Not checked",
      detail: expired ? `The last check expired on ${dateText(org.verification_expires_at)}.` : "Propertiq has not recorded an identity check for this advertiser.",
      limits: "Ask for identification and proof of authority before paying anything.",
    });
  }

  // 2. Property visit (no visits are recorded yet; this line will read real visit records when they exist)
  rows.push({
    key: "visit", title: "Property visit", status: "none", value: "Not recorded",
    detail: "No Propertiq visit has been recorded for this listing.",
    limits: "When a visit is recorded, it shows the date and what was looked at. A visit is not a structural survey or a valuation.",
  });

  // 3. Documents
  rows.push({
    key: "documents", title: "Documents", status: "none", value: "Not reviewed",
    detail: "Propertiq has not reviewed documents for this listing.",
    limits: "A document review, when shown, lists the documents looked at. It is not a legal title certification — confirm title at the Lands Commission or with a lawyer.",
  });

  // 4. Photos
  const labelled = (photos ?? []).filter((p) => p.is_render || p.is_virtually_staged).length;
  rows.push({
    key: "photos", title: "Photos", status: "none", value: photos?.length ? "Uploaded by the advertiser" : "No photos yet",
    detail: photos?.length
      ? `${photos.length} photo${photos.length === 1 ? "" : "s"}${labelled ? `, ${labelled} labelled as render or virtually staged` : ""}. Not checked against the property by Propertiq.`
      : "The advertiser hasn't added photos.",
    limits: "Photos may not show the property's current condition. View in person before deciding.",
  });

  // 5. Availability
  const a = availabilityState(l.availability_confirmed_at, now);
  const by = METHOD_TEXT[l.availability_method] ?? "";
  rows.push(
    a.state === "fresh"
      ? { key: "availability", title: "Availability", status: "checked", value: `Confirmed ${agoText(a.days)}`,
          detail: `Last confirmed ${by} on ${dateText(l.availability_confirmed_at)}.`,
          limits: "Availability can change quickly. Ask the advertiser before arranging a visit." }
      : a.state === "stale"
        ? { key: "availability", title: "Availability", status: "attention", value: "Needs reconfirming",
            detail: `Last confirmed ${by} on ${dateText(l.availability_confirmed_at)} — more than ${STALE_AFTER_DAYS} days ago.`,
            limits: "It may no longer be available. Ask the advertiser before arranging a visit." }
        : { key: "availability", title: "Availability", status: "none", value: "Not confirmed",
            detail: "The advertiser hasn't confirmed availability on Propertiq yet.",
            limits: "Ask the advertiser whether it is still available." },
  );
  return rows;
}

const MARK = { checked: "✓", attention: "!", none: "–" };

export function trustPanel(rows, { sponsored = false } = {}) {
  return html`<section class="trust-panel" aria-labelledby="trust-h">
    <div class="row-between"><h2 id="trust-h">Trust and verification</h2><a class="small" href="/trust-and-verification">How checks work</a></div>
    <ul class="trust-list">
      ${rows.map(
        (r) => html`<li class="trust-item trust-item--${r.status}">
          <span class="trust-mark" aria-hidden="true">${MARK[r.status]}</span>
          <div class="trust-body">
            <p class="row-between"><span class="bold">${r.title}</span><span class="trust-value">${r.value}</span></p>
            <p class="small muted">${r.detail}</p>
            <details class="trust-more"><summary>What does this mean?</summary><p class="small">${r.limits}</p></details>
          </div>
        </li>`,
      )}
    </ul>
    ${sponsored ? html`<p class="tiny muted">This listing has a paid, sponsored placement. Payment never changes any of the checks above.</p>` : ""}
  </section>`;
}
