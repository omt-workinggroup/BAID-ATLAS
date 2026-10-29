// The portfolio: every property comes from /data/properties.json (see docs/propertiq/adding-properties.md).
// These helpers are pure so they can be unit-tested; only loadPortfolio touches the network.

export const PURPOSE_LABELS = { sale: "For sale", rent: "For rent", short_stay: "Short stay", lease: "For lease" };
export const TYPE_LABELS = {
  house: "House",
  townhouse: "Townhouse",
  apartment: "Apartment",
  land: "Land",
  commercial: "Commercial",
  office: "Office",
  retail: "Retail",
  warehouse: "Warehouse",
  mixed_use: "Mixed use",
};
export const STATUS_LABELS = { available: "Available", under_offer: "Under offer", sold: "Sold", let: "Let" };
const PERIODS = { month: "/month", year: "/year", week: "/week", night: "/night" };
const UNITS = { sqm: "m²", sqft: "sq ft", acre: "acres", hectare: "ha", plot: "plots" };
const ONE = { acre: "acre", plot: "plot" };

let cache = null;
export function loadPortfolio() {
  cache ??= fetch("/data/properties.json", { cache: "no-cache" }).then((r) => {
    if (!r.ok) throw new Error(`properties.json: ${r.status}`);
    return r.json();
  });
  return cache;
}

// "GHS 1,250,000", "USD 2,500/month", or "Price on request".
export function formatPrice(price) {
  if (!price || price.on_request || price.amount == null) return "Price on request";
  const n = Number(price.amount).toLocaleString("en-GH", { maximumFractionDigits: 0 });
  return `${price.currency ?? "GHS"} ${n}${PERIODS[price.period] ?? ""}`;
}

// "GHS 1.25M": short enough for a map pin.
export function shortPrice(price) {
  if (!price || price.on_request || price.amount == null) return "On request";
  const n = Number(price.amount);
  const v = n >= 1e6 ? `${+(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)}k` : String(n);
  return `${price.currency ?? "GHS"} ${v}${PERIODS[price.period] ? PERIODS[price.period].replace("/month", "/mo").replace("/year", "/yr") : ""}`;
}

export const formatArea = (a) =>
  a && a.value != null ? `${Number(a.value).toLocaleString("en-GH")} ${(Number(a.value) === 1 && ONE[a.unit]) || UNITS[a.unit] || a.unit || ""}`.trim() : null;
export const place = (p) => [p.location?.area, p.location?.city].filter(Boolean).join(", ");
export const cover = (p) => p.photos?.[0] ?? null;
// Tours from these services can be embedded; any other link is ignored rather than framed.
const TOUR_HOSTS = ["my.matterport.com", "kuula.co", "www.youtube-nocookie.com", "www.youtube.com"];
export function embedUrl(src) {
  try {
    const u = new URL(src);
    if (u.protocol !== "https:" || !TOUR_HOSTS.includes(u.hostname)) return null;
    if (u.hostname === "www.youtube.com") u.hostname = "www.youtube-nocookie.com";
    return u.toString();
  } catch {
    return null;
  }
}
export const hasTour = (p) => Boolean(p.tour?.scenes?.length || embedUrl(p.tour?.embed));

// Bedrooms, bathrooms, parking, size and land, skipping anything not given (and rooms on land).
export function keyFacts(p) {
  const home = p.type !== "land";
  return [
    home && p.bedrooms != null && ["bed", `${p.bedrooms} ${p.bedrooms === 1 ? "Bed" : "Beds"}`],
    home && p.bathrooms != null && ["bath", `${p.bathrooms} ${p.bathrooms === 1 ? "Bath" : "Baths"}`],
    home && p.parking != null && ["car", `${p.parking} Parking`],
    formatArea(p.size) && ["area", formatArea(p.size)],
    formatArea(p.land) && ["plot", `${formatArea(p.land)} land`],
  ].filter(Boolean);
}

// Filters from the address bar: purpose, type, min, max, q (area or title), sort.
export function parseFilters(params) {
  const num = (k) => {
    const v = Number(params.get(k));
    return params.get(k) && Number.isFinite(v) && v >= 0 ? v : undefined;
  };
  const pick = (k, allowed) => (allowed.includes(params.get(k)) ? params.get(k) : undefined);
  return {
    purpose: pick("purpose", Object.keys(PURPOSE_LABELS)),
    type: pick("type", Object.keys(TYPE_LABELS)),
    min: num("min"),
    max: num("max"),
    q: (params.get("q") ?? "").trim().slice(0, 80) || undefined,
    sort: pick("sort", ["newest", "price_asc", "price_desc"]) ?? "newest",
  };
}

export function filterProperties(list, f) {
  const q = f.q?.toLowerCase();
  const out = list.filter(
    (p) =>
      (!f.purpose || p.purpose === f.purpose) &&
      (!f.type || p.type === f.type) &&
      (f.min === undefined || (p.price?.amount ?? -1) >= f.min) &&
      (f.max === undefined || (p.price?.amount != null && p.price.amount <= f.max)) &&
      (!q || [p.title, p.location?.area, p.location?.city, p.location?.region].some((v) => v?.toLowerCase().includes(q))),
  );
  const price = (p) => (p.price?.on_request ? null : p.price?.amount ?? null);
  const byPrice = (dir) => (a, b) => (price(a) === null) - (price(b) === null) || dir * ((price(a) ?? 0) - (price(b) ?? 0));
  if (f.sort === "price_asc") return out.sort(byPrice(1));
  if (f.sort === "price_desc") return out.sort(byPrice(-1));
  // Newest: featured first, then by listed date.
  return out.sort((a, b) => Boolean(b.featured) - Boolean(a.featured) || String(b.listed ?? "").localeCompare(String(a.listed ?? "")));
}

// WhatsApp link with a ready-written message naming the property.
export function whatsappLink(number, property, url) {
  if (!number) return null;
  const digits = String(number).replace(/\D/g, "");
  const text = property ? `Hello, I'm interested in "${property.title}" (${url}). Is it still available?` : "Hello, I'd like to ask about your properties.";
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function toQuery(f) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v !== undefined && v !== null && v !== "" && !(k === "sort" && v === "newest")) p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}
