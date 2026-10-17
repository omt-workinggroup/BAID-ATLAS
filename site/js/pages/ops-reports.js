// Reports from the public about listings. Resolving one needs a short note for the audit log.
import { boot, busy, formMessage, html, render, sb, setTitle, toast } from "../core.js";
import { LISTING_STATUS_LABELS, REPORT_REASON_LABELS, timeAgo } from "../format.js";
import { opsHeader, requireStaff } from "../ops.js";

boot();
const { roles } = await requireStaff();
setTitle("Reports");
const root = document.getElementById("root");

async function draw() {
  const { data, error } = await sb.rpc("get_report_queue");
  const rows = data ?? [];
  render(
    root,
    html`${opsHeader(roles, "/ops/reports")}
      <div class="row-between"><h1 style="font-size: 1.75rem">Reports</h1><span class="small muted">${rows.length} open · oldest first</span></div>
      ${error ? html`<div class="alert alert--error">Couldn't load reports.</div>` : ""}
      ${rows.length
        ? html`<ul class="list">
            ${rows.map(
              (r) => html`<li class="card stack-sm">
                <div class="row-between" style="align-items: flex-start">
                  <span class="status ${r.reason === "scam" ? "status--rejected" : ""}">${REPORT_REASON_LABELS[r.reason] ?? r.reason}</span>
                  <span class="tiny muted">${timeAgo(r.created_at)}${r.status === "reviewing" ? " · reviewing" : ""}</span>
                </div>
                <a class="bold" href="/properties/${r.listing_slug}">${r.listing_title}</a>
                <p class="tiny muted">${r.organization_name} · ${LISTING_STATUS_LABELS[r.listing_status] ?? r.listing_status}${r.reports_on_listing > 1 ? ` · ${r.reports_on_listing} open reports on this listing` : ""}</p>
                ${r.details ? html`<p class="quote small">${r.details}</p>` : ""}
                <form class="stack-sm" data-report="${r.id}" novalidate>
                  <label class="sr-only" for="n-${r.id}">Note for the audit log</label>
                  <input class="input" id="n-${r.id}" name="note" maxlength="500" placeholder="What you checked or did" />
                  <div class="row wrap">
                    ${r.status === "open" ? html`<button class="btn btn--secondary btn--small" type="submit" value="reviewing">Mark reviewing</button>` : ""}
                    <button class="btn btn--small" type="submit" value="actioned">Actioned</button>
                    <button class="btn btn--secondary btn--small" type="submit" value="dismissed">Dismiss</button>
                  </div>
                </form>
              </li>`,
            )}
          </ul>`
        : html`<div class="empty"><h2>No open reports</h2><p>When someone reports a listing it lands here.</p></div>`}`,
  );
  root.removeAttribute("aria-busy");
}

root.addEventListener("submit", async (e) => {
  const form = e.target.closest("form[data-report]");
  if (!form) return;
  e.preventDefault();
  const status = e.submitter?.value;
  const note = form.note.value.trim();
  if (status !== "reviewing" && note.length < 3) return formMessage(form, "error", "Add a short note: what you checked or did.");
  await busy(form, "Saving…", async () => {
    const { error } = await sb.rpc("resolve_report", { p_report: form.dataset.report, p_status: status, p_note: note });
    if (error) return formMessage(form, "error", "Couldn't update the report.");
    toast(status === "reviewing" ? "Marked as reviewing." : "Report closed.");
    await draw();
  });
});

await draw();
