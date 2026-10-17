// Shared by the staff (operations) pages: who may enter, and the header with tabs.
// The database enforces every permission again; this only decides what to show.
import { getStaffRoles, html, raw, requireProfile } from "./core.js";

const MODERATION = ["moderator", "platform_admin"];

export const canModerate = (roles) => roles.some((r) => MODERATION.includes(r));
export const isPlatformAdmin = (roles) => roles.includes("platform_admin");

// Non-staff are sent home; `need` narrows it further (e.g. ["platform_admin"]).
export async function requireStaff(need = MODERATION) {
  const profile = await requireProfile();
  const roles = await getStaffRoles();
  if (!roles.some((r) => need.includes(r))) {
    location.replace(roles.length ? "/ops" : "/");
    return new Promise(() => {});
  }
  return { profile, roles };
}

const TABS = [
  ["/ops", "Review queue", canModerate],
  ["/ops/reports", "Reports", canModerate],
  ["/ops/organisations", "Organisations", isPlatformAdmin],
];

export function opsHeader(roles, active) {
  return html`<div class="ops-banner">
      <div><p class="overline">Operations</p><p class="bold">Propertiq staff</p></div>
      <span class="tiny">${roles.map((r) => r.replaceAll("_", " ")).join(" · ")}</span>
    </div>
    <nav class="tabs" aria-label="Operations">
      ${TABS.filter(([, , allowed]) => allowed(roles)).map(([href, label]) => html`<a href="${href}" ${raw(href === active ? 'aria-current="page"' : "")}>${label}</a>`)}
    </nav>`;
}
