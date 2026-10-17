// Team: members and roles, phone invitations (owners and admins), leaving the organisation.
import { boot, busy, friendlyDbError, html, raw, render, sb, setTitle, showErrors, toast } from "../core.js";
import { ORG_ROLE_DESCRIPTIONS, ORG_ROLE_LABELS } from "../format.js";
import { phone as phoneRule } from "../validate.js";
import { canManageTeam, orgHeader, requireMembership } from "../portal.js";

boot();
const { org, role, profile } = await requireMembership();
setTitle(`Team · ${org.name}`);
const root = document.getElementById("root");
const manage = canManageTeam(role);
const isOwner = role === "owner";
const INVITABLE = Object.keys(ORG_ROLE_LABELS).filter((r) => r !== "owner" && (isOwner || r !== "admin"));

async function draw(notice) {
  const [{ data: members }, { data: invitations }] = await Promise.all([
    sb.rpc("list_organization_members", { p_org: org.id }),
    manage
      ? sb.from("organization_invitations").select("id, email, phone, role, expires_at").eq("organization_id", org.id).is("accepted_at", null).is("revoked_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);
  // Owners can change anyone; admins only non-owner, non-admin members.
  const assignable = (target) => (isOwner ? Object.keys(ORG_ROLE_LABELS) : role === "admin" && !["owner", "admin"].includes(target) ? Object.keys(ORG_ROLE_LABELS).filter((r) => !["owner", "admin"].includes(r)) : []);

  render(
    root,
    html`${orgHeader(org, role, "/team")}
      ${notice ? html`<div class="alert alert--success">${notice}</div>` : ""}
      <section class="card stack">
        <h2>Members</h2>
        <ul class="list-divided">
          ${(members ?? []).map((m) => {
            const self = m.user_id === profile.id;
            const options = self ? [] : assignable(m.role);
            return html`<li class="stack-sm">
              <div class="row-between"><span class="stack-sm" style="gap: 0.125rem; min-width: 0"><span class="bold truncate">${m.display_name ?? m.email} ${self ? html`<span class="small muted">(you)</span>` : ""}</span><span class="small muted truncate">${m.email}</span></span><span class="status">${ORG_ROLE_LABELS[m.role]}</span></div>
              ${options.length
                ? html`<div class="row wrap">
                    <label class="sr-only" for="role-${m.user_id}">Role for ${m.display_name ?? m.email}</label>
                    <select class="select" id="role-${m.user_id}" style="flex: 1 1 100%; min-height: 2.5rem" data-role-for="${m.user_id}">${options.map((r) => html`<option value="${r}" ${raw(r === m.role ? "selected" : "")}>${ORG_ROLE_LABELS[r]}</option>`)}</select>
                    <button type="button" class="btn btn--secondary btn--small" data-change="${m.user_id}">Change</button>
                    <button type="button" class="btn btn--danger btn--small" data-remove="${m.user_id}">Remove</button>
                  </div>`
                : ""}
              ${self && !isOwner ? html`<button type="button" class="btn btn--ghost btn--small" data-remove="${m.user_id}" data-self="1">Leave organisation</button>` : ""}
            </li>`;
          })}
        </ul>
      </section>
      ${manage
        ? html`<section class="card stack">
            <div><h2>Invite someone</h2><p class="small muted">They'll sign in with this phone number to accept. Share the link with them by SMS or WhatsApp.</p></div>
            <div id="invite-result"></div>
            <form class="stack" id="invite-form" novalidate>
              <div class="field"><label for="f-phone">Phone number</label><input class="input" id="f-phone" name="phone" type="tel" inputmode="tel" placeholder="024 123 4567" aria-describedby="f-phone-msg" /><p class="hint" id="f-phone-msg" data-hint=""></p></div>
              <div class="field"><label for="f-role">Role</label><select class="select" id="f-role" name="role">${INVITABLE.map((r) => html`<option value="${r}" ${raw(r === "viewer" ? "selected" : "")}>${ORG_ROLE_LABELS[r]}</option>`)}</select></div>
              <button type="submit" class="btn btn--full">Create invitation</button>
            </form>
            <details class="small"><summary class="bold" style="cursor: pointer; padding: 0.5rem 0">What can each role do?</summary>
              <dl class="stack-sm">${Object.entries(ORG_ROLE_DESCRIPTIONS).map(([r, d]) => html`<div><dt class="bold">${ORG_ROLE_LABELS[r]}</dt><dd class="muted">${d}</dd></div>`)}</dl>
            </details>
          </section>`
        : ""}
      ${manage && (invitations ?? []).length
        ? html`<section class="card stack"><h2>Pending invitations</h2><ul class="list-divided">${invitations.map(
            (i) => html`<li class="row-between"><span><span class="bold">${i.phone ?? i.email}</span><br /><span class="small muted">${ORG_ROLE_LABELS[i.role]} · expires ${new Date(i.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span></span><button type="button" class="btn btn--secondary btn--small" data-revoke="${i.id}">Revoke</button></li>`,
          )}</ul></section>`
        : ""}`,
  );
  root.removeAttribute("aria-busy");
}

root.addEventListener("click", async (e) => {
  const t = e.target.closest("button");
  if (!t) return;
  if (t.dataset.change) {
    const { error } = await sb.rpc("change_member_role", { p_org: org.id, p_user: t.dataset.change, p_role: root.querySelector(`[data-role-for="${t.dataset.change}"]`).value });
    return error ? toast(friendlyDbError(error)) : draw("Role updated.");
  }
  if (t.dataset.remove) {
    if (!confirm(t.dataset.self ? "Leave this organisation?" : "Remove this member?")) return;
    const { error } = await sb.rpc("remove_member", { p_org: org.id, p_user: t.dataset.remove });
    if (error) return toast(friendlyDbError(error));
    return t.dataset.self ? location.replace("/portal") : draw("Member removed.");
  }
  if (t.dataset.revoke) {
    const { error } = await sb.rpc("revoke_invitation", { p_invitation: t.dataset.revoke });
    return error ? toast(friendlyDbError(error)) : draw("Invitation revoked.");
  }
  if (t.dataset.copy) {
    await navigator.clipboard?.writeText(t.dataset.copy);
    toast("Link copied");
  }
});

root.addEventListener("submit", async (e) => {
  if (e.target.id !== "invite-form") return;
  e.preventDefault();
  const form = e.target;
  const r = phoneRule(form.phone.value);
  if (!showErrors(form, r.error ? { phone: r.error } : {})) return;
  await busy(form, "Creating invitation…", async () => {
    const { data: token, error } = await sb.rpc("invite_member_by_phone", { p_org: org.id, p_phone: r.value, p_role: form.role.value });
    if (error || !token) {
      return showErrors(form, { phone: error?.code === "23505" && !error.message.includes("already a member") ? "There's already an open invitation for this number." : friendlyDbError(error) });
    }
    // The link is shown once; only a hash of the token is stored.
    const link = `${location.origin}/invitations/accept?token=${token}`;
    await draw();
    render(
      "#invite-result",
      html`<div class="alert alert--success stack-sm"><span>Invitation created. Send this link to ${r.value}. It works once and expires in 7 days.</span><input class="input" readonly value="${link}" aria-label="Invitation link" /><button type="button" class="btn btn--secondary btn--small" data-copy="${link}">Copy link</button></div>`,
    );
  });
});

draw();
