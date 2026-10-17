// Inbox: the signed-in person's conversations with providers.
import { boot, friendlyDbError, html, render, requireProfile, sb } from "../core.js";
import { threadList } from "../threads.js";

boot();
await requireProfile();
const root = document.getElementById("root");
const { data, error } = await sb.rpc("get_inbox");
render(
  root,
  html`<div class="page-head"><h1>Inbox</h1><p>Your messages and viewing requests with providers.</p></div>
    ${error ? html`<div class="alert alert--error">${friendlyDbError(error)}</div>` : ""}
    ${(data ?? []).length
      ? threadList(data, (r) => `/inbox/${r.id}`)
      : html`<div class="empty"><h2>No conversations yet</h2><p>When you message a provider or request a viewing, the conversation appears here.</p><a class="btn" href="/explore">Explore property</a></div>`}
    <p class="tiny muted">Looking for leads for your organisation? They're in the <a class="link" href="/portal">provider portal</a>.</p>`,
);
root.removeAttribute("aria-busy");
