// 3D tour: 360° photos of each room, joined by hotspots, in the Pannellum viewer (vendored, MIT).
// Controls: drag or swipe to look around, scroll or pinch to zoom, arrow keys and +/- on a keyboard,
// room buttons, auto-rotate, tilt-to-look on phones, and full screen.
// A tour can instead be an embedded link from a tour service (Matterport, Kuula, YouTube 360).
import { html, icon, raw, render } from "./core.js";
import { embedUrl } from "./data.js";

let loading = null;
function loadPannellum() {
  loading ??= new Promise((ok, fail) => {
    document.head.append(Object.assign(document.createElement("script"), { src: "/js/vendor/pannellum.js", onload: ok, onerror: fail }));
  });
  return loading;
}

// Pannellum's configuration from the data file's scenes: [{ id, title, image, yaw, pitch, hotspots: [{ to, yaw, pitch, label }] }]
export function tourConfig(tour) {
  const scenes = {};
  for (const s of tour.scenes) {
    // No "title": the room buttons below the view name each room, so Pannellum's own label is left off.
    scenes[s.id] = {
      type: "equirectangular",
      panorama: s.image,
      yaw: s.yaw ?? 0,
      pitch: s.pitch ?? 0,
      hfov: 105,
      hotSpots: (s.hotspots ?? [])
        .filter((h) => tour.scenes.some((x) => x.id === h.to))
        .map((h) => ({ type: "scene", sceneId: h.to, yaw: h.yaw ?? 0, pitch: h.pitch ?? -10, text: h.label ?? tour.scenes.find((x) => x.id === h.to).title, cssClass: "tour-spot" })),
    };
  }
  return {
    default: {
      firstScene: tour.scenes[0].id,
      sceneFadeDuration: 900,
      autoLoad: true,
      autoRotate: -2,
      autoRotateInactivityDelay: 8000,
      showControls: false,
      compass: false,
      keyboardZoom: true,
      mouseZoom: true,
      minHfov: 45,
      maxHfov: 120,
    },
    scenes,
  };
}

export function mountTour(el, tour, { poster, title }) {
  const embed = !tour.scenes?.length && tour.embed ? embedUrl(tour.embed) : null;
  if (!tour.scenes?.length && !embed) return { start() {} };
  if (embed) {
    render(el, html`<div class="tour"><iframe class="tour__embed" src="${embed}" title="3D tour of ${title}" loading="lazy" allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer" allowfullscreen></iframe></div>`);
    return { start() {} };
  }

  render(
    el,
    html`<div class="tour" id="tour-box">
      <div class="tour__view" id="tour-view" tabindex="0" aria-label="360 degree view. Use the arrow keys to look around and plus or minus to zoom."></div>
      <button type="button" class="tour__start" id="tour-start">
        ${poster ? html`<img src="${poster}" alt="" loading="lazy" />` : ""}
        <span>${icon("tour", 22)}Start the 3D tour</span>
      </button>
      <p class="tour__hint" id="tour-hint" hidden>Drag to look around · Pinch or scroll to zoom</p>
      <div class="tour__bar" id="tour-bar" hidden>
        <div class="tour__rooms" role="group" aria-label="Rooms">
          ${tour.scenes.map((s, i) => html`<button type="button" data-room="${s.id}" aria-current="${i === 0 ? "true" : "false"}">${s.title}</button>`)}
        </div>
        <button type="button" class="tour__ctl" id="tour-rotate" aria-pressed="true" aria-label="Auto-rotate">${icon("tour", 18)}</button>
        <button type="button" class="tour__ctl" id="tour-tilt" aria-pressed="false" aria-label="Look around by moving your phone" hidden>${raw('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3h8v18H8zM11 18h2"/></svg>')}</button>
        <button type="button" class="tour__ctl" id="tour-full" aria-label="Full screen">${icon("expand", 18)}</button>
      </div>
    </div>`,
  );
  const box = el.querySelector("#tour-box");
  let viewer = null;

  async function start() {
    if (viewer) return;
    el.querySelector("#tour-start").hidden = true;
    try {
      await loadPannellum();
    } catch {
      render(el.querySelector("#tour-view"), html`<p class="empty" style="color: #fff">The tour couldn't load. Please check your connection and try again.</p>`);
      return;
    }
    viewer = window.pannellum.viewer(el.querySelector("#tour-view"), tourConfig(tour));
    el.querySelector("#tour-bar").hidden = false;
    const hint = el.querySelector("#tour-hint");
    hint.hidden = false;
    setTimeout(() => (hint.style.opacity = "0"), 4500);

    const rooms = el.querySelectorAll("[data-room]");
    viewer.on("scenechange", (id) => rooms.forEach((b) => b.setAttribute("aria-current", String(b.dataset.room === id))));
    rooms.forEach((b) => b.addEventListener("click", () => viewer.loadScene(b.dataset.room)));

    const rotate = el.querySelector("#tour-rotate");
    rotate.addEventListener("click", () => {
      const on = rotate.getAttribute("aria-pressed") !== "true";
      rotate.setAttribute("aria-pressed", String(on));
      if (on) viewer.startAutoRotate(-2);
      else viewer.stopAutoRotate();
    });

    // Tilt-to-look: only offered where the phone has the sensors (Pannellum asks iOS for permission).
    const tilt = el.querySelector("#tour-tilt");
    if (viewer.isOrientationSupported?.()) {
      tilt.hidden = false;
      tilt.addEventListener("click", () => {
        const on = tilt.getAttribute("aria-pressed") !== "true";
        tilt.setAttribute("aria-pressed", String(on));
        if (on) viewer.startOrientation();
        else viewer.stopOrientation();
      });
    }

    // Full screen: the real thing where the browser allows it, otherwise the tour fills the window.
    el.querySelector("#tour-full").addEventListener("click", () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (box.requestFullscreen) box.requestFullscreen().catch(() => box.classList.toggle("tour--full"));
      else box.classList.toggle("tour--full");
      setTimeout(() => viewer.resize(), 120);
    });
    document.addEventListener("fullscreenchange", () => setTimeout(() => viewer.resize(), 120));
    document.addEventListener("keydown", (e) => e.key === "Escape" && box.classList.remove("tour--full"));
    el.querySelector("#tour-view").focus({ preventScroll: true });
  }

  el.querySelector("#tour-start").addEventListener("click", start);
  return { start };
}
