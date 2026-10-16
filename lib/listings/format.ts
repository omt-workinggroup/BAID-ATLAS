// Display helpers for listings. Stored values are never mutated for display.

export const PURPOSES = ["sale", "long_term_rent", "short_stay", "lease"] as const;
export const PROPERTY_TYPES = [
  "house",
  "apartment",
  "land",
  "commercial",
  "office",
  "retail",
  "industrial",
  "warehouse",
  "mixed_use",
  "other",
] as const;
export const AREA_UNITS = ["sqm", "sqft", "acre", "hectare", "plot"] as const;
export const PRICE_PERIODS = ["total", "per_month", "per_year", "per_week", "per_night"] as const;
export const LISTING_CURRENCIES = ["GHS", "USD", "EUR", "GBP"] as const;

export type Purpose = (typeof PURPOSES)[number];
export type PropertyType = (typeof PROPERTY_TYPES)[number];
export type AreaUnit = (typeof AREA_UNITS)[number];
export type PricePeriod = (typeof PRICE_PERIODS)[number];

export const PURPOSE_LABELS: Record<Purpose, string> = {
  sale: "For sale",
  long_term_rent: "For rent",
  short_stay: "Short stay",
  lease: "For lease",
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  house: "House",
  apartment: "Apartment",
  land: "Land",
  commercial: "Commercial",
  office: "Office",
  retail: "Retail",
  industrial: "Industrial",
  warehouse: "Warehouse",
  mixed_use: "Mixed use",
  other: "Other",
};

export const AREA_UNIT_LABELS: Record<AreaUnit, string> = {
  sqm: "m²",
  sqft: "sq ft",
  acre: "acres",
  hectare: "ha",
  plot: "plots",
};

export const PERIOD_SUFFIX: Record<PricePeriod, string> = {
  total: "",
  per_month: "/month",
  per_year: "/year",
  per_week: "/week",
  per_night: "/night",
};

export const LISTING_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "In review",
  changes_requested: "Changes requested",
  approved: "Approved",
  published: "Live",
  paused: "Paused",
  rejected: "Not approved",
  expired: "Expired",
  sold: "Sold",
  rented: "Rented",
  archived: "Archived",
};

export const GHANA_REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Central",
  "Eastern",
  "Western",
  "Western North",
  "Volta",
  "Oti",
  "Northern",
  "Savannah",
  "North East",
  "Upper East",
  "Upper West",
  "Bono",
  "Bono East",
  "Ahafo",
] as const;

// Amount is a decimal string or number from numeric(18,2); always shown with its ISO currency.
export function formatPrice(amount: number | string, currency: string, period: PricePeriod = "total", locale = "en-GH") {
  const value = typeof amount === "string" ? Number(amount) : amount;
  let formatted: string;
  try {
    formatted = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "code",
      maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  } catch {
    formatted = `${currency} ${value.toLocaleString(locale)}`;
  }
  // Normalise non-breaking space for consistent rendering.
  return `${formatted.replace(/ /g, " ")}${PERIOD_SUFFIX[period] ?? ""}`;
}

export function formatCompactPrice(amount: number | string, currency: string, locale = "en-GH") {
  const value = typeof amount === "string" ? Number(amount) : amount;
  const compact = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value);
  return `${currency} ${compact}`;
}

export function formatArea(value: number | string | null, unit: AreaUnit | null) {
  if (value === null || value === undefined || !unit) return null;
  const n = typeof value === "string" ? Number(value) : value;
  return `${n.toLocaleString("en-GH", { maximumFractionDigits: 2 })} ${AREA_UNIT_LABELS[unit]}`;
}

export function formatLocation(locality: string | null, city: string, region?: string | null) {
  return [locality, city, region].filter(Boolean).join(", ");
}

export function listedAgo(iso: string | null, now = new Date()) {
  if (!iso) return null;
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Listed today";
  if (days === 1) return "Listed yesterday";
  if (days < 30) return `Listed ${days} days ago`;
  const months = Math.floor(days / 30);
  return `Listed ${months} month${months === 1 ? "" : "s"} ago`;
}
