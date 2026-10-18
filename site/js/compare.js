// Compare: up to four listings, kept in this browser only. Used by listing cards and the /compare page.
import { html, render, toast } from "./core.js";

const KEY = "propertiq-compare";
export const COMPARE_MAX = 4;

export function compareIds() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string" && /^[0-9a-f-]{36}$/.test(x)).slice(0, COMPARE_MAX) : [];
  } catch {
    return [];
  }
}

function save(ids) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // Private mode or storage blocked: comparing still works for this page view.
  }
  drawCompareBar();
}

export function toggleCompare(id) {
  const ids = compareIds();
  if (ids.includes(id)) return save(ids.filter((x) => x !== id)), false;
  if (ids.length >= COMPARE_MAX) return toast(`You can compare up to ${COMPARE_MAX} properties.`), null;
  save([...ids, id]);
  return true;
}

export const removeFromCompare = (id) => save(compareIds().filter((x) => x !== id));

// Floating bar shown on listing pages while something is selected.
export function drawCompareBar() {
  let bar = document.getElementById("compare-bar");
  const ids = compareIds();
  if (!ids.length) return bar?.remove();
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "compare-bar";
    bar.className = "compare-bar";
    document.body.append(bar);
  }
  render(bar, html`<span class="small"><span class="bold">${ids.length}</span> selected to compare</span><a class="btn btn--small btn--inverse" href="/compare">Compare</a>`);
}

// One listener for all "Compare" buttons inside root.
export function wireCompareButtons(root) {
  const mark = () => {
    const ids = compareIds();
    root.querySelectorAll("[data-compare]").forEach((b) => b.setAttribute("aria-pressed", String(ids.includes(b.dataset.compare))));
  };
  root.addEventListener("click", (e) => {
    const b = e.target.closest("[data-compare]");
    if (!b) return;
    e.preventDefault();
    toggleCompare(b.dataset.compare);
    mark();
  });
  mark();
  drawCompareBar();
  return mark;
}
