// "Book a viewing": a sheet to pick a day and a time, then send the request on WhatsApp or by email with the
// message already written. Nothing is booked here; the office replies to confirm.
import { html, icon, render } from "./core.js";
import { cover, dayLabel, nextDays, viewingMessage, waLink, small } from "./data.js";

const TIMES = [
  ["Morning", "9am – 12pm"],
  ["Afternoon", "12pm – 3pm"],
  ["Late afternoon", "3pm – 6pm"],
];

let dialog;

export function openVisit(p, owner, url) {
  dialog ??= document.body.appendChild(Object.assign(document.createElement("dialog"), { className: "sheet", id: "visit" }));
  dialog.setAttribute("aria-labelledby", "visit-h");
  const days = nextDays(14);
  const c = cover(p);
  render(
    dialog,
    html`<form class="sheet__panel" novalidate>
      <div class="sheet__grip" aria-hidden="true"></div>
      <header class="sheet__head">
        ${c ? html`<img src="${small(c)}" alt="" />` : ""}
        <div><h2 id="visit-h">Book a viewing</h2><p>${p.title}</p></div>
        <button type="button" class="round round--soft" data-close-sheet aria-label="Close">${icon("close", 18, 2)}</button>
      </header>

      <fieldset class="pick">
        <legend>Pick a day</legend>
        <div class="pick__days">
          ${days.map((d) => {
            const part = (o) => d.toLocaleDateString("en-GB", o);
            return html`<label class="day"><input type="radio" name="day" value="${dayLabel(d)}" /><span><small>${part({ weekday: "short" })}</small><b>${d.getDate()}</b><small>${part({ month: "short" })}</small></span></label>`;
          })}
        </div>
      </fieldset>

      <fieldset class="pick">
        <legend>Pick a time</legend>
        <div class="pick__times">
          ${TIMES.map(([t, range]) => html`<label class="slot"><input type="radio" name="time" value="${t} (${range})" /><span><b>${t}</b><small>${range}</small></span></label>`)}
        </div>
      </fieldset>

      <label class="field"><span>Your name</span><input name="name" autocomplete="name" required /></label>
      <label class="field"><span>Anything we should know? <em>Optional</em></span><textarea name="note" rows="2" placeholder="E.g. I'm interested in a 3-bedroom unit"></textarea></label>

      <p class="sheet__error" role="alert" hidden></p>
      <div class="sheet__actions">
        ${owner.whatsapp ? html`<a class="btn btn--dark" data-send="wa" href="#" target="_blank" rel="noopener">${icon("chat", 18)}Send on WhatsApp</a>` : ""}
        ${owner.email ? html`<a class="btn btn--outline-tan" data-send="mail" href="#">${icon("mail", 18)}Send by email</a>` : ""}
      </div>
      <p class="fineprint">We'll reply to confirm the time. Nothing is booked until we do.</p>
    </form>`,
  );

  const form = dialog.querySelector("form");
  const error = dialog.querySelector(".sheet__error");
  const read = () => {
    const f = new FormData(form);
    return { day: f.get("day"), time: f.get("time"), name: String(f.get("name") ?? "").trim(), note: String(f.get("note") ?? "").trim() };
  };
  const missing = (v) => (!v.day ? "Pick a day for the viewing." : !v.time ? "Pick a time of day." : !v.name ? "Add your name so we know who to expect." : "");
  const update = () => {
    const v = read();
    const text = viewingMessage(p, url, v);
    const wa = dialog.querySelector('[data-send="wa"]');
    const mail = dialog.querySelector('[data-send="mail"]');
    if (wa) wa.href = waLink(owner.whatsapp, text);
    if (mail) mail.href = `mailto:${owner.email}?subject=${encodeURIComponent(`Viewing: ${p.title}`)}&body=${encodeURIComponent(text)}`;
    if (!missing(v)) error.hidden = true;
  };
  form.addEventListener("input", update);
  form.addEventListener("submit", (e) => e.preventDefault());
  dialog.querySelectorAll("[data-send]").forEach((a) =>
    a.addEventListener("click", (e) => {
      const problem = missing(read());
      if (problem) {
        e.preventDefault();
        error.textContent = problem;
        error.hidden = false;
        return;
      }
      setTimeout(() => dialog.close(), 300);
    }),
  );
  dialog.querySelector("[data-close-sheet]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => e.target === dialog && dialog.close());
  update();
  dialog.showModal();
}
