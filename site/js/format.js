// Labels and formatting. Stored values never change for display.

export const PURPOSES = ["sale", "long_term_rent", "short_stay", "lease"];
export const PROPERTY_TYPES = ["house", "apartment", "land", "commercial", "office", "retail", "industrial", "warehouse", "mixed_use", "other"];
export const AREA_UNITS = ["sqm", "sqft", "acre", "hectare", "plot"];
export const PRICE_PERIODS = ["total", "per_month", "per_year", "per_week", "per_night"];
export const CURRENCIES = ["GHS", "USD", "EUR", "GBP"];

export const PURPOSE_LABELS = { sale: "For sale", long_term_rent: "For rent", short_stay: "Short stay", lease: "For lease" };
export const PROPERTY_TYPE_LABELS = {
  house: "House", apartment: "Apartment", land: "Land", commercial: "Commercial", office: "Office", retail: "Retail",
  industrial: "Industrial", warehouse: "Warehouse", mixed_use: "Mixed use", other: "Other",
};
export const AREA_UNIT_LABELS = { sqm: "m²", sqft: "sq ft", acre: "acres", hectare: "ha", plot: "plots" };
export const PERIOD_LABELS = { total: "Total price", per_month: "Per month", per_year: "Per year", per_week: "Per week", per_night: "Per night" };
const PERIOD_SUFFIX = { total: "", per_month: "/month", per_year: "/year", per_week: "/week", per_night: "/night" };

export const LISTING_STATUS_LABELS = {
  draft: "Draft", submitted: "In review", changes_requested: "Changes requested", approved: "Approved", published: "Live",
  paused: "Paused", rejected: "Not approved", expired: "Expired", sold: "Sold", rented: "Rented", archived: "Archived",
};
export const ORGANIZATION_TYPE_LABELS = {
  agency: "Agency", developer: "Developer", landlord: "Landlord", property_manager: "Property manager",
  marketing_partner: "Marketing partner", enterprise: "Enterprise",
};
export const ORG_ROLE_LABELS = {
  owner: "Owner", admin: "Admin", listing_manager: "Listing manager", marketing_manager: "Marketing manager",
  lead_manager: "Lead manager", viewer: "Viewer",
};
export const ORG_ROLE_DESCRIPTIONS = {
  admin: "Manage the team and organisation profile",
  listing_manager: "Create and edit listings",
  marketing_manager: "Studio orders and campaigns",
  lead_manager: "Handle inquiries and viewings",
  viewer: "Read-only access",
};
export const VERIFICATION_LABELS = {
  not_started: "Not verified", pending: "Verification pending", in_review: "Verification in review", verified: "Verified",
  rejected: "Verification not approved", expired: "Verification expired",
};
export const INQUIRY_STATUS_LABELS = {
  new: "New", assigned: "Assigned", contacted: "Contacted", qualified: "Qualified", viewing_requested: "Viewing requested",
  converted: "Converted", closed: "Closed", spam: "Spam",
};
export const VIEWING_STATUS_LABELS = {
  requested: "Requested", proposed: "New time proposed", confirmed: "Confirmed", declined: "Declined", cancelled: "Cancelled", completed: "Completed",
};
export const REPORT_REASON_LABELS = {
  scam: "Looks like a scam or fraud",
  not_available: "Property isn't available",
  wrong_details: "Wrong price, size or location",
  misleading_photos: "Misleading or stolen photos",
  duplicate: "Duplicate listing",
  offensive: "Offensive content",
  other: "Something else",
};
// Why a moderator sent a listing back. Unknown codes read as plain words ("photos_quality" -> "Photos quality").
export const REVIEW_REASONS = {
  photos: "Photos need work", description: "Description unclear or incomplete", price: "Price looks wrong",
  location: "Location details inconsistent", misleading: "Misleading or unlabelled renders", duplicate: "Duplicate listing", prohibited: "Not allowed on Propertiq",
};
export const reviewReason = (code) => REVIEW_REASONS[code] ?? (code ? code[0].toUpperCase() + code.slice(1).replaceAll("_", " ") : "");

export const GHANA_REGIONS = [
  "Greater Accra", "Ashanti", "Central", "Eastern", "Western", "Western North", "Volta", "Oti", "Northern", "Savannah",
  "North East", "Upper East", "Upper West", "Bono", "Bono East", "Ahafo",
];

// Prices keep their own currency and always show the ISO code, e.g. "GHS 1,250,000/month".
export function formatPrice(amount, currency, period = "total", locale = "en-GH") {
  const value = Number(amount);
  let formatted;
  try {
    formatted = new Intl.NumberFormat(locale, {
      style: "currency", currency, currencyDisplay: "code", maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  } catch {
    formatted = `${currency} ${value.toLocaleString(locale)}`;
  }
  return `${formatted.replace(/\u00a0/g, " ")}${PERIOD_SUFFIX[period] ?? ""}`;
}

export function formatArea(value, unit) {
  if (value === null || value === undefined || value === "" || !unit) return null;
  return `${Number(value).toLocaleString("en-GH", { maximumFractionDigits: 2 })} ${AREA_UNIT_LABELS[unit]}`;
}

export function formatLocation(...parts) {
  return parts.filter(Boolean).join(", ");
}

export function listedAgo(iso, now = new Date()) {
  if (!iso) return null;
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Listed today";
  if (days === 1) return "Listed yesterday";
  if (days < 30) return `Listed ${days} days ago`;
  const months = Math.floor(days / 30);
  return `Listed ${months} month${months === 1 ? "" : "s"} ago`;
}

// "Just now", "5 min ago", "3 h ago", "Yesterday", then a date.
export function timeAgo(iso, now = new Date()) {
  const s = Math.floor((now.getTime() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 172800) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function formatDateTime(iso, timeZone = "Africa/Accra") {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone,
  });
}

export function listingFacts(l) {
  const area = formatArea(l.floor_area, l.floor_area_unit) ?? formatArea(l.land_area, l.land_area_unit);
  return [
    l.bedrooms !== null && l.bedrooms !== undefined && l.property_type !== "land" ? `${l.bedrooms} bed` : null,
    l.bathrooms !== null && l.bathrooms !== undefined && l.property_type !== "land" ? `${l.bathrooms} bath` : null,
    area,
  ].filter(Boolean);
}
