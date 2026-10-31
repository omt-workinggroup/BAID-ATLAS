// Saved properties (the heart) and the compare list, kept in this browser only. No account needed.
// Pages listen for "pq:store" to update hearts and the compare bar when either list changes.
const KEYS = { saved: "pq-saved", compare: "pq-compare" };
export const COMPARE_MAX = 3;

function read(key) {
  try {
    const v = JSON.parse(localStorage.getItem(KEYS[key]));
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function write(key, list) {
  try {
    localStorage.setItem(KEYS[key], JSON.stringify(list));
  } catch {
    /* storage unavailable: the change lasts until the page closes */
  }
  memory[key] = list;
  dispatchEvent(new CustomEvent("pq:store", { detail: { key } }));
}
const memory = { saved: read("saved"), compare: read("compare") };
// Another tab changed a list: pick it up here too.
addEventListener("storage", (e) => {
  const key = Object.keys(KEYS).find((k) => KEYS[k] === e.key);
  if (!key) return;
  memory[key] = read(key);
  dispatchEvent(new CustomEvent("pq:store", { detail: { key } }));
});

export const saved = () => [...memory.saved];
export const compared = () => [...memory.compare];
export const isSaved = (slug) => memory.saved.includes(slug);
export const isCompared = (slug) => memory.compare.includes(slug);

export function toggleSaved(slug) {
  const on = !isSaved(slug);
  write("saved", on ? [slug, ...memory.saved] : memory.saved.filter((s) => s !== slug));
  return on;
}
// Returns true when added, false when removed, null when the list is already full.
export function toggleCompare(slug) {
  if (isCompared(slug)) {
    write("compare", memory.compare.filter((s) => s !== slug));
    return false;
  }
  if (memory.compare.length >= COMPARE_MAX) return null;
  write("compare", [...memory.compare, slug]);
  return true;
}
export const clearCompare = () => write("compare", []);
