// The heart and share buttons on cards and property pages. Call wireCollect() once on any page that shows them.
import { toast } from "./core.js";
import { isSaved, toggleSaved } from "./store.js";

function refresh() {
  document.querySelectorAll("[data-save]").forEach((b) => b.setAttribute("aria-pressed", String(isSaved(b.dataset.save))));
}

export function wireCollect() {
  document.addEventListener("click", async (e) => {
    const save = e.target.closest("[data-save]");
    if (save) {
      e.preventDefault();
      toast(toggleSaved(save.dataset.save) ? "Saved. Find it under Profile." : "Removed from saved");
      return;
    }
    const share = e.target.closest("[data-share]");
    if (share) {
      const url = new URL(share.dataset.share, location.origin).href;
      if (navigator.share) return navigator.share({ title: share.dataset.title, url }).catch(() => {});
      try {
        await navigator.clipboard.writeText(url);
        toast("Link copied");
      } catch {
        toast(url);
      }
    }
  });
  addEventListener("pq:store", refresh);
}
