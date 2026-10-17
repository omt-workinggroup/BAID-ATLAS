// Leads: an organisation's inquiries, newest activity first, with a status filter.
import { boot, friendlyDbError, html, params, raw, render, sb, setTitle } from "../core.js";
import { INQUIRY_STATUS_LABELS } from "../format.js";
import { canReadLeads, orgHeader, requireMembership } from "../portal.js";
import { threadList } from "../threads.js";

boot();
const { org, role } = await requireMembership();
setTitle(`Leads · ${org.name}`);
const root = document.getElementById("root");
if (!canReadLeads(role)) location.replace(`/portal/${org.slug}`);

const filter = params().get("status") ?? "open";
const { data, error } = await sb.rpc("get_inbox", { p_org: org.id });
const rows = (data ?? []).filter((r) => (filter === "open" ? !["closed", "spam", "converted"].includes(r.status) : filter === "all" ? true : r.status === filter));
const counts = { new: (data ?? []).filter((r) => r.status === "new").length, unread: (data ?? []).filter((r) => r.unread).length };
const chip = (value, label) => html`<a class="chip" href="?status=${value}" ${raw(filter === value ? 'aria-current="page"' : "")}>${label}</a>`;

render(
  root,
  html`${orgHeader(org, role, "/leads")}
    ${error ? html`<div class="alert alert--error">${friendlyDbError(error)}</div>` : ""}
    <div class="stats">
      <div class="stat"><b>${(data ?? []).length}</b><span>All leads</span></div>
      <div class="stat"><b>${counts.new}</b><span>New</span></div>
      <div class="stat"><b>${counts.unread}</b><span>Unread</span></div>
      <div class="stat"><b>${(data ?? []).filter((r) => r.has_active_viewing).length}</b><span>Viewings in progress</span></div>
    </div>
    <nav class="chips" aria-label="Filter leads">
      ${chip("open", "Open")}${chip("new", INQUIRY_STATUS_LABELS.new)}${chip("viewing_requested", INQUIRY_STATUS_LABELS.viewing_requested)}${chip("converted", INQUIRY_STATUS_LABELS.converted)}${chip("closed", INQUIRY_STATUS_LABELS.closed)}${chip("spam", INQUIRY_STATUS_LABELS.spam)}${chip("all", "All")}
    </nav>
    ${rows.length
      ? threadList(rows, (r) => `/portal/${org.slug}/leads/${r.id}`, { provider: true })
      : html`<div class="empty"><h2>No leads here</h2><p>When someone messages you about a listing or asks for a viewing, it shows up here and your lead managers get notified.</p></div>`}`,
);
root.removeAttribute("aria-busy");
