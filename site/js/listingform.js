// The listing form (new and edit), its validation and the payload the database functions expect.
import { field, html, raw, selectField, textareaField } from "./core.js";
import { AREA_UNITS, AREA_UNIT_LABELS, CURRENCIES, GHANA_REGIONS, PERIOD_LABELS, PRICE_PERIODS, PROPERTY_TYPES, PROPERTY_TYPE_LABELS, PURPOSES, PURPOSE_LABELS } from "./format.js";
import { check, decimal, money, text, wholeNumber } from "./validate.js";

const units = [["", "Unit"], ...AREA_UNITS.map((u) => [u, AREA_UNIT_LABELS[u]])];

export function listingFormView(v = {}, { locked = false, submitLabel = "Save" } = {}) {
  return html`<form class="stack-lg" id="listing-form" novalidate>
    <fieldset class="stack-lg" style="border: 0; padding: 0; margin: 0" ${raw(locked ? "disabled" : "")}>
      <section class="card stack">
        <h2>The basics</h2>
        ${field({ label: "Title", name: "title", value: v.title, hint: "e.g. Three-bedroom house with garden in East Legon", attrs: 'maxlength="120"' })}
        <div class="grid-2">
          ${selectField({ label: "Offer", name: "purpose", value: v.purpose ?? "sale", options: PURPOSES.map((p) => [p, PURPOSE_LABELS[p]]) })}
          ${selectField({ label: "Property type", name: "property_type", value: v.property_type ?? "house", options: PROPERTY_TYPES.map((t) => [t, PROPERTY_TYPE_LABELS[t]]) })}
        </div>
        ${textareaField({ label: "Description", name: "description", value: v.description, hint: "At least 40 characters before you submit. Describe rooms, condition, amenities and access.", attrs: 'maxlength="5000" rows="6"' })}
      </section>
      <section class="card stack">
        <h2>Price</h2>
        <div class="grid-2">
          ${field({ label: "Asking price", name: "asking_price", value: v.asking_price ? Number(v.asking_price).toLocaleString("en-GH") : "", attrs: 'inputmode="decimal"' })}
          ${selectField({ label: "Currency", name: "currency", value: v.currency ?? "GHS", options: CURRENCIES.map((c) => [c, c]) })}
        </div>
        ${selectField({ label: "Price basis", name: "price_period", value: v.price_period ?? "total", options: PRICE_PERIODS.map((p) => [p, PERIOD_LABELS[p]]), hint: "Sale prices are a total; rent is per month, year, week or night." })}
      </section>
      <section class="card stack">
        <h2>Location</h2>
        <div class="grid-2">
          ${selectField({ label: "Region", name: "region", value: v.region ?? "Greater Accra", options: GHANA_REGIONS.map((r) => [r, r]) })}
          ${field({ label: "Town or city", name: "city", value: v.city, attrs: 'maxlength="80"' })}
        </div>
        ${field({ label: "Area or neighbourhood (optional)", name: "locality", value: v.locality, attrs: 'maxlength="80"' })}
        ${field({ label: "Exact address (private)", name: "address_private", value: v.address_private, hint: "Never shown publicly. Only your team can see it.", attrs: 'maxlength="300"' })}
      </section>
      <section class="card stack">
        <h2>Size and rooms</h2>
        <div class="grid-2">
          ${field({ label: "Bedrooms", name: "bedrooms", value: v.bedrooms ?? "", attrs: 'inputmode="numeric"' })}
          ${field({ label: "Bathrooms", name: "bathrooms", value: v.bathrooms ?? "", attrs: 'inputmode="numeric"' })}
        </div>
        <div style="display: grid; grid-template-columns: 1fr 8rem; gap: 0.75rem; align-items: start">
          ${field({ label: "Floor area", name: "floor_area", value: v.floor_area ?? "", attrs: 'inputmode="decimal"' })}
          ${selectField({ label: "Unit", name: "floor_area_unit", value: v.floor_area_unit ?? "sqm", options: units })}
        </div>
        <div style="display: grid; grid-template-columns: 1fr 8rem; gap: 0.75rem; align-items: start">
          ${field({ label: "Land area", name: "land_area", value: v.land_area ?? "", attrs: 'inputmode="decimal"' })}
          ${selectField({ label: "Unit", name: "land_area_unit", value: v.land_area_unit ?? "plot", options: units })}
        </div>
      </section>
      ${locked ? "" : html`<button type="submit" class="btn btn--full">${submitLabel}</button>`}
    </fieldset>
  </form>`;
}

// Validates the form; returns { payload, errors }.
export function readListingForm(form) {
  const d = new FormData(form);
  const { values, errors } = check(d, {
    title: (v) => text(v, { label: "Title", min: 5, max: 120 }),
    description: (v) => text(v, { optional: true, max: 5000 }),
    purpose: (v) => (PURPOSES.includes(v) ? { value: v } : { error: "Choose what you're offering." }),
    property_type: (v) => (PROPERTY_TYPES.includes(v) ? { value: v } : { error: "Choose a property type." }),
    region: (v) => (GHANA_REGIONS.includes(v) ? { value: v } : { error: "Choose a region." }),
    city: (v) => text(v, { label: "Town or city", min: 2, max: 80 }),
    locality: (v) => text(v, { optional: true, max: 80 }),
    address_private: (v) => text(v, { optional: true, max: 300 }),
    bedrooms: (v) => wholeNumber(v, { max: 50 }),
    bathrooms: (v) => wholeNumber(v, { max: 50 }),
    floor_area: decimal,
    land_area: decimal,
    asking_price: money,
    currency: (v) => ({ value: v }),
    price_period: (v) => ({ value: v }),
  });
  if (values.purpose === "sale" && values.price_period !== "total") errors.price_period = "Sale prices are a total amount.";
  if (values.purpose && !["sale", "lease"].includes(values.purpose) && values.price_period === "total") errors.price_period = "Choose how often rent is paid.";
  // A unit on its own means "no area given".
  const floorUnit = values.floor_area ? d.get("floor_area_unit") : "";
  const landUnit = values.land_area ? d.get("land_area_unit") : "";
  if (values.floor_area && !floorUnit) errors.floor_area = "Give both the floor area and its unit.";
  if (values.land_area && !landUnit) errors.land_area = "Give both the land area and its unit.";
  const s = (x) => (x === null || x === undefined ? "" : String(x));
  return {
    errors,
    payload: {
      title: values.title, description: values.description ?? "", purpose: values.purpose, property_type: values.property_type,
      region: values.region, city: values.city, locality: values.locality ?? "", address_private: values.address_private ?? "",
      latitude: "", longitude: "", bedrooms: s(values.bedrooms), bathrooms: s(values.bathrooms),
      floor_area: s(values.floor_area), floor_area_unit: floorUnit, land_area: s(values.land_area), land_area_unit: landUnit,
      asking_price: values.asking_price, currency: values.currency, price_period: values.price_period,
    },
  };
}

// Keeps the price basis sensible when the offer changes.
export function wirePurpose(form) {
  form.purpose.addEventListener("change", () => {
    if (form.purpose.value === "sale") form.price_period.value = "total";
    else if (form.purpose.value === "short_stay") form.price_period.value = "per_night";
    else if (form.purpose.value === "long_term_rent" && form.price_period.value === "total") form.price_period.value = "per_month";
  });
}

export function listingDbMessage(error) {
  switch (error?.code) {
    case "42501":
      return error.message?.includes("verified") ? "Your organisation must be verified before listings go live. We'll let you know once verification is complete." : "You don't have permission to do that.";
    case "55000":
      return "This listing can't be changed right now — it may be in review.";
    case "23514":
      return error.message ? error.message.charAt(0).toUpperCase() + error.message.slice(1) + "." : "Some details are missing.";
    case "54000":
      return "You've hit a limit. Please try again later.";
    default:
      return "Something went wrong. Please try again.";
  }
}
