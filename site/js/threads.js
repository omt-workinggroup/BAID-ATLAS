// Conversation lists, used by the Inbox (buyers) and Leads (providers).
import { html } from "./core.js";
import { INQUIRY_STATUS_LABELS, timeAgo } from "./format.js";

export function threadList(rows, hrefFor, { provider = false } = {}) {
  return html`<ul class="list-divided card" style="padding: 0.25rem 1.25rem">
    ${rows.map(
      (r) => html`<li>
        <a href="${hrefFor(r)}" class="row" style="align-items: flex-start; gap: 0.875rem; padding: 0.5rem 0">
          <span class="monogram" style="width: 2.75rem; height: 2.75rem; font-size: 1.1rem">${(r.counterpart ?? "?").slice(0, 1)}</span>
          <span class="stack-sm" style="flex: 1; min-width: 0; gap: 0.125rem">
            <span class="row-between" style="gap: 0.5rem"><span class="truncate ${r.unread ? "bold" : ""}">${r.counterpart}</span><span class="tiny muted" style="flex: none">${timeAgo(r.last_message_at)}</span></span>
            <span class="tiny muted truncate">${r.listing_title}</span>
            <span class="small truncate ${r.unread ? "" : "muted"}">${r.last_side === "system" ? "" : r.last_side === (provider ? "provider" : "requester") ? "You: " : ""}${r.last_message ?? ""}</span>
            <span class="row wrap" style="gap: 0.375rem; margin-top: 0.25rem">
              ${provider || r.status !== "new" ? html`<span class="status status--${r.status}">${INQUIRY_STATUS_LABELS[r.status]}</span>` : ""}
              ${r.has_active_viewing && r.status !== "viewing_requested" ? html`<span class="status status--requested">Viewing in progress</span>` : ""}
            </span>
          </span>
          ${r.unread ? html`<span class="unread-dot" style="margin-top: 0.5rem" aria-label="Unread"></span>` : ""}
        </a>
      </li>`,
    )}
  </ul>`;
}
