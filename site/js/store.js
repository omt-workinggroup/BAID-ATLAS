// Saved properties (the heart), kept in this browser only. No account needed.
// Pages listen for "pq:store" to update hearts when the list changes.
const KEY = "pq-saved";

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
let memory = read();
function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable: the change lasts until the page closes */
  }
  memory = list;
  dispatchEvent(new CustomEvent("pq:store", { detail: { key: "saved" } }));
}
// Another tab changed the list: pick it up here too.
addEventListener("storage", (e) => {
  if (e.key !== KEY) return;
  memory = read();
  dispatchEvent(new CustomEvent("pq:store", { detail: { key: "saved" } }));
});

export const saved = () => [...memory];
export const isSaved = (slug) => memory.includes(slug);
export function toggleSaved(slug) {
  const on = !isSaved(slug);
  write(on ? [slug, ...memory] : memory.filter((s) => s !== slug));
  return on;
}
