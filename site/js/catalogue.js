// Property subtypes and amenities come from the database (one source of truth), cached for the visit.
import { sb } from "./core.js";

let cache = null;

export function loadCatalogue() {
  cache ??= (async () => {
    const [{ data: subtypes }, { data: amenities }] = await Promise.all([
      sb.from("property_subtypes").select("type, code, label, sort").order("sort"),
      sb.from("amenity_definitions").select("code, label, category, applies_to, sort").order("sort"),
    ]);
    return { subtypes: subtypes ?? [], amenities: amenities ?? [] };
  })();
  return cache;
}

export const subtypesFor = (cat, type) => cat.subtypes.filter((s) => s.type === type);
export const amenitiesFor = (cat, type) => cat.amenities.filter((a) => a.applies_to.includes(type));
export const subtypeLabel = (cat, type, code) => cat.subtypes.find((s) => s.type === type && s.code === code)?.label ?? null;
export const amenityLabel = (cat, code) => cat.amenities.find((a) => a.code === code)?.label ?? code;
