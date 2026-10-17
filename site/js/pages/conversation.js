// One conversation, for both sides: the buyer at /inbox/<id> and the provider at /portal/<org>/leads/<id>.
// Messages, viewing requests and (for providers) lead status and the buyer's shared phone.
import { $, boot, busy, friendlyDbError, html, icon, raw, refreshUnread, render, requireProfile, sb, setTitle, showErrors, toast } from "../core.js";
import { INQUIRY_STATUS_LABELS, VIEWING_STATUS_LABELS, formatDateTime } from "../format.js";

boot();
await requireProfile();
const parts = location.pathname.split("/").filter(Boolean);
const id = parts[parts.length - 1];
const isLeadPage = parts[0] === "portal";
const backHref = isLeadPage ? `/portal/${parts[1]}/leads` : "/inbox";
const root = document.getElementById("root");
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Accra";
let convo = null;
let replyKey = crypto.randomUUID();

async function load() {
  const { data, error } = await sb.rpc("get_conversation", { p_inquiry: id });
  if (error || !data) {
    render(root, html`<div class="empty"><h1>Conversation not found</h1><p>It may have been removed, or you don't have access to it.</p><a class="btn" href="${backHref}">Back</a></div>`);
    root.removeAttribute("aria-busy");
    return false;
  }
  const changed = !convo || convo.messages.length !== data.messages.length || JSON.stringify(convo.viewings) !== JSON.stringify(data.viewings) || convo.inquiry.status !== data.inquiry.status;
  convo = data;
  if (changed) draw();
  await sb.rpc("mark_inquiry_read", { p_inquiry: id });
  refreshUnread();
  return true;
}

function draw() {
  const q = convo.inquiry;
  const provider = q.my_side === "provider";
  setTitle(provider ? `${q.requester_name} · ${q.listing_title}` : q.organization_name);
  const draft = $("#composer textarea")?.value ?? "";
  render(
    root,
    html`<div class="stack-sm">
        <a class="back-link" href="${backHref}">← ${provider ? "All leads" : "Inbox"}</a>
        <div class="row-between" style="align-items: flex-start">
          <div class="stack-sm" style="gap: 0.25rem; min-width: 0">
            <h1 style="font-size: 1.75rem">${provider ? q.requester_name : q.organization_name}</h1>
            <p class="small muted truncate">About ${q.listing_public ? html`<a class="link" href="/properties/${q.listing_slug}">${q.listing_title}</a>` : q.listing_title}</p>
          </div>
          <span class="status status--${q.status}">${INQUIRY_STATUS_LABELS[q.status]}</span>
        </div>
      </div>
      ${provider ? providerPanel(q) : ""}
      ${viewingPanel(provider)}
      <section class="thread" aria-label="Messages" aria-live="polite">
        ${convo.messages.map((m) =>
          m.side === "system"
            ? html`<p class="bubble bubble--system">${m.body}</p>`
            : html`<div class="bubble ${m.mine ? "bubble--mine" : "bubble--theirs"}">${m.body}<span class="bubble__meta">${m.mine ? "You" : m.sender} · ${formatDateTime(m.created_at, tz)}</span></div>`,
        )}
      </section>
      ${q.can_reply
        ? html`<form class="composer" id="composer" novalidate>
            <label for="f-body" class="sr-only">Write a message</label>
            <textarea id="f-body" name="body" rows="1" maxlength="2000" placeholder="Write a message…" aria-describedby="f-body-msg"></textarea>
            <button type="submit" class="btn" aria-label="Send">${icon("send", 20)}</button>
          </form>
          <p class="hint" id="f-body-msg" data-hint=""></p>`
        : html`<p class="alert alert--info">${q.status === "spam" || q.status === "closed" ? "This conversation is closed." : "You can read this conversation, but only owners, admins and lead managers can reply."}</p>`}`,
  );
  root.removeAttribute("aria-busy");
  const ta = $("#composer textarea");
  if (ta) {
    ta.value = draft;
    ta.addEventListener("input", () => {
      ta.style.height = "auto";
      ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
    });
  }
  (document.getElementById("composer") ?? root.lastElementChild)?.scrollIntoView({ block: "end" });
}

function providerPanel(q) {
  return html`<section class="card stack">
    <div class="row-between wrap">
      <div class="stack-sm" style="gap: 0.125rem">
        <span class="tiny muted">Contact</span>
        ${q.contact_phone
          ? html`<span class="row wrap"><a class="link" href="tel:${q.contact_phone}">${q.contact_phone}</a><a class="btn btn--secondary btn--small" href="https://wa.me/${q.contact_phone.replace("+", "")}" rel="noopener" target="_blank">WhatsApp</a></span>`
          : html`<span class="small muted">Not shared. Reply here — they'll be notified.</span>`}
      </div>
      ${q.can_manage
        ? html`<label class="field" style="min-width: 12rem"><span class="label">Lead status</span>
            <select class="select" id="lead-status">${Object.entries(INQUIRY_STATUS_LABELS).map(([v, l]) => html`<option value="${v}" ${raw(v === q.status ? "selected" : "")}>${l}</option>`)}</select></label>`
        : ""}
    </div>
  </section>`;
}

function viewingPanel(provider) {
  const v = convo.viewings[0];
  const active = v && ["requested", "proposed", "confirmed"].includes(v.status);
  const q = convo.inquiry;
  if (!v || !active) {
    return !provider && q.can_reply ? html`<button type="button" class="btn btn--secondary" data-viewing="request">${icon("calendar", 18)} Request a viewing</button>` : "";
  }
  const when = `${formatDateTime(v.start, v.timezone)} – ${new Date(v.end).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: v.timezone })} (${v.timezone.replace("_", " ")})`;
  const actions = [];
  if (provider && q.can_manage) {
    if (v.status === "requested") actions.push(["confirm", "Confirm", ""], ["propose", "Suggest another time", "btn--secondary"], ["decline", "Decline", "btn--danger"]);
    if (v.status === "confirmed") actions.push(["complete", "Mark as done", ""], ["propose", "Change time", "btn--secondary"], ["cancel", "Cancel", "btn--danger"]);
    if (v.status === "proposed") actions.push(["decline", "Withdraw", "btn--secondary"]);
  }
  if (!provider) {
    if (v.status === "proposed") actions.push(["confirm", "Accept this time", ""]);
    actions.push(["cancel", "Cancel viewing", "btn--secondary"]);
  }
  const caption = {
    requested: provider ? "Viewing requested — confirm or suggest another time." : "Viewing requested — waiting for the provider to confirm.",
    proposed: provider ? "You suggested this time — waiting for them to accept." : "The provider suggested this time instead.",
    confirmed: "Viewing confirmed.",
  }[v.status];
  return html`<section class="card stack" style="border-color: var(--text)">
    <div class="row-between"><span class="row bold">${icon("calendar", 20)} ${when}</span><span class="status status--${v.status}">${VIEWING_STATUS_LABELS[v.status]}</span></div>
    <p class="small muted">${caption}</p>
    ${v.note ? html`<p class="small">“${v.note}”</p>` : ""}
    ${actions.length ? html`<div class="row wrap">${actions.map(([a, label, cls]) => html`<button type="button" class="btn btn--small ${cls}" data-viewing="${a}" data-id="${v.id}">${label}</button>`)}</div>` : ""}
  </section>`;
}

// ---- Actions ---------------------------------------------------------------------------------------------
root.addEventListener("submit", async (e) => {
  if (e.target.id !== "composer") return;
  e.preventDefault();
  const form = e.target;
  const body = form.body.value.trim();
  if (!body) return;
  await busy(form, "…", async () => {
    const { error } = await sb.rpc("send_message", { p_inquiry: id, p_body: body, p_key: replyKey });
    if (error) return showErrors(form, { body: error.code === "55000" ? "This conversation is closed." : friendlyDbError(error) });
    replyKey = crypto.randomUUID();
    form.body.value = "";
    await load();
  });
});

root.addEventListener("change", async (e) => {
  if (e.target.id !== "lead-status") return;
  const { error } = await sb.rpc("set_inquiry_status", { p_inquiry: id, p_status: e.target.value });
  toast(error ? friendlyDbError(error) : "Status updated");
  await load();
});

root.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-viewing]");
  if (!btn) return;
  const action = btn.dataset.viewing;
  if (action === "request" || action === "propose") return openSlotSheet(action, btn.dataset.id);
  if (action === "cancel" && !confirm("Cancel this viewing?")) return;
  btn.disabled = true;
  const { error } = await sb.rpc("respond_viewing", { p_viewing: btn.dataset.id, p_action: action, p_start: null, p_end: null, p_note: null });
  if (error) toast(error.code === "55000" ? "That change isn't possible any more. Refreshing…" : friendlyDbError(error));
  await load();
});

// Date/time sheet for requesting (buyer) or proposing another time (provider).
function openSlotSheet(action, viewingId) {
  document.getElementById("slot-sheet")?.remove();
  const pad = (n) => String(n).padStart(2, "0");
  const d = new Date();
  const min = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  document.body.insertAdjacentHTML(
    "beforeend",
    `<dialog class="sheet" id="slot-sheet" aria-labelledby="slot-title"><form class="sheet__body" novalidate>
      <span class="sheet__grab" aria-hidden="true"></span>
      <div class="row-between"><h2 id="slot-title" style="font-size:1.4rem">${action === "request" ? "Request a viewing" : "Suggest another time"}</h2><button type="button" class="btn btn--ghost btn--small" data-close>Close</button></div>
      <div class="grid-2">
        <div class="field"><label for="f-date">Date</label><input class="input" id="f-date" name="date" type="date" min="${min}" required aria-describedby="f-date-msg" /><p class="hint" id="f-date-msg" data-hint=""></p></div>
        <div class="field"><label for="f-time">Time</label><select class="select" id="f-time" name="time">${Array.from({ length: 21 }, (_, i) => 480 + i * 30).map((m) => `<option ${m === 600 ? "selected" : ""}>${pad(Math.floor(m / 60))}:${pad(m % 60)}</option>`).join("")}</select></div>
      </div>
      <div class="field"><label for="f-length">How long</label><select class="select" id="f-length" name="length"><option value="30">30 minutes</option><option value="60" selected>1 hour</option><option value="90">1 hour 30 minutes</option></select></div>
      <div class="field"><label for="f-note">Note (optional)</label><textarea class="textarea" id="f-note" name="note" maxlength="500" style="min-height:4.5rem"></textarea></div>
      <p class="small muted">Times are in ${tz.replace("_", " ")}.</p>
      <button type="submit" class="btn btn--full">${action === "request" ? "Send request" : "Suggest this time"}</button>
    </form></dialog>`,
  );
  const dialog = document.getElementById("slot-sheet");
  const form = dialog.querySelector("form");
  dialog.addEventListener("click", (e) => (e.target === dialog || e.target.closest("[data-close]")) && dialog.close());
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.date.value) return showErrors(form, { date: "Choose a date." });
    const start = new Date(`${form.date.value}T${form.time.value}:00`);
    const end = new Date(start.getTime() + Number(form.length.value) * 60000);
    if (start.getTime() < Date.now() + 3600000) return showErrors(form, { date: "Choose a time at least an hour from now." });
    await busy(form, "Sending…", async () => {
      const note = form.note.value.trim() || null;
      const { error } =
        action === "request"
          ? await sb.rpc("request_viewing", { p_inquiry: id, p_start: start.toISOString(), p_end: end.toISOString(), p_timezone: tz, p_note: note })
          : await sb.rpc("respond_viewing", { p_viewing: viewingId, p_action: "propose", p_start: start.toISOString(), p_end: end.toISOString(), p_note: note });
      if (error) return showErrors(form, { date: error.code === "22023" ? error.message.charAt(0).toUpperCase() + error.message.slice(1) + "." : friendlyDbError(error) });
      dialog.close();
      await load();
    });
  });
  dialog.showModal();
}

if (await load()) setInterval(() => document.visibilityState === "visible" && load(), 15000);
