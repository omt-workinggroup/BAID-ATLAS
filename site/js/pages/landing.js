// Landing page (wide screens): the search panel opens the properties page with only the filters chosen.
// Self-contained on purpose: the landing page loads no other scripts.
const form = document.getElementById("landing-search");
form?.addEventListener("submit", (e) => {
  e.preventDefault();
  const d = new FormData(form);
  const [min, max] = String(d.get("price") ?? "").split("-");
  const q = new URLSearchParams();
  const set = (k, v) => v && q.set(k, v);
  set("purpose", d.get("purpose"));
  set("type", d.get("type"));
  if (Number(min) > 0) q.set("min", min);
  set("max", max);
  location.href = `/properties${q.size ? `?${q}` : ""}`;
});
