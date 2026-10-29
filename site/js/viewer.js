// Full-screen viewer for photos and floor plans: arrows, swipe, keyboard, and tap to zoom.
import { html, icon, render } from "./core.js";

const dialog = () => document.getElementById("viewer");

export function openViewer(items, start = 0, { plan = false } = {}) {
  const d = dialog();
  if (!d || !items.length) return;
  let i = Math.max(0, Math.min(start, items.length - 1));
  const stage = d.querySelector("#viewer-stage");
  stage.classList.toggle("viewer__stage--plan", plan);

  const draw = () => {
    const it = items[i];
    render(
      stage,
      html`<img src="${it.src}" alt="${it.alt ?? ""}" />
        ${items.length > 1
          ? html`<button type="button" class="round-btn viewer__nav viewer__nav--prev" data-step="-1" aria-label="Previous">${icon("back", 20, 2)}</button>
              <button type="button" class="round-btn viewer__nav viewer__nav--next" data-step="1" aria-label="Next">${icon("next", 20, 2)}</button>`
          : ""}`,
    );
    d.querySelector("#viewer-count").textContent = items.length > 1 ? `${i + 1} / ${items.length}` : "";
    d.querySelector("#viewer-caption").textContent = it.caption ?? "";
  };
  const step = (n) => {
    i = (i + n + items.length) % items.length;
    draw();
  };

  const onClick = (e) => {
    const b = e.target.closest("[data-step]");
    if (b) return step(Number(b.dataset.step));
    if (e.target.closest("[data-close-viewer]")) return d.close();
    if (e.target.tagName === "IMG") e.target.classList.toggle("is-zoomed");
  };
  const onKey = (e) => {
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  };
  let x0 = null;
  const onTouchStart = (e) => (x0 = e.touches.length === 1 ? e.touches[0].clientX : null);
  const onTouchEnd = (e) => {
    if (x0 === null || stage.querySelector("img.is-zoomed")) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    x0 = null;
  };

  d.addEventListener("click", onClick);
  d.addEventListener("keydown", onKey);
  stage.addEventListener("touchstart", onTouchStart, { passive: true });
  stage.addEventListener("touchend", onTouchEnd);
  d.addEventListener(
    "close",
    () => {
      d.removeEventListener("click", onClick);
      d.removeEventListener("keydown", onKey);
      stage.removeEventListener("touchstart", onTouchStart);
      stage.removeEventListener("touchend", onTouchEnd);
    },
    { once: true },
  );
  draw();
  d.showModal();
}
