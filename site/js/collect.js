// The heart, compare and share buttons on cards and property pages, and the compare bar that appears once
// something is picked. Call wireCollect() once on any page that shows them.
import { html, icon, render, toast } from "./core.js";
import { COMPARE_MAX, clearCompare, compared, isCompared, isSaved, toggleCompare, toggleSaved } from "./store.js";

function refresh() {
  document.querySelectorAll("[data-save]").forEach((b) => b.setAttribute("aria-pressed", String(isSaved(b.dataset.save))));
  document.querySelectorAll("[data-compare]").forEach((b) => b.setAttribute("aria-pressed", String(isCompared(b.dataset.compare))));
  drawBar();
}

let bar;
function drawBar() {
  const n = compared().length;
  bar ??= document.body.appendChild(Object.assign(document.createElement("div"), { className: "cmpbar" }));
  bar.hidden = n === 0 || location.pathname === "/compare";
  document.body.classList.toggle("has-cmpbar", !bar.hidden);
  render(
    bar,
    html`<span class="cmpbar__n">${icon("compare", 17)}${n} of ${COMPARE_MAX} picked</span>
      <button type="button" class="cmpbar__clear" data-compare-clear>Clear</button>
      <a class="btn btn--dark" href="/compare">Compare${n > 1 ? "" : " (pick 2+)"}</a>`,
  );
}

export function wireCollect() {
  document.addEventListener("click", async (e) => {
    const save = e.target.closest("[data-save]");
    if (save) {
      e.preventDefault();
      toast(toggleSaved(save.dataset.save) ? "Saved. Find it under Profile." : "Removed from saved");
      return;
    }
    const cmp = e.target.closest("[data-compare]");
    if (cmp) {
      e.preventDefault();
      const r = toggleCompare(cmp.dataset.compare);
      if (r === null) toast(`You can compare up to ${COMPARE_MAX}. Remove one first.`);
      return;
    }
    if (e.target.closest("[data-compare-clear]")) return clearCompare();
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
  drawBar();
}
