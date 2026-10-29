// Checks site/data/properties.json before it goes live: required fields, allowed values, unique slugs,
// that every photo, plan, brochure and 360° image file exists, and that tour hotspots lead to real rooms.
// Run: pnpm check:properties   (also part of pnpm test)
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const PURPOSES = ["sale", "rent", "short_stay", "lease"];
const TYPES = ["house", "townhouse", "apartment", "land", "commercial", "office", "retail", "warehouse", "mixed_use"];
const STATUSES = ["available", "under_offer", "sold", "let"];
const PERIODS = ["total", "month", "year", "week", "night"];
const UNITS = ["sqm", "sqft", "acre", "hectare", "plot"];
const STAGES = ["off_plan", "under_construction", "completed"];

// Returns a list of problems (empty when the file is good). siteRoot is where /media/... paths point.
export function checkPortfolio(data, siteRoot) {
  const errors = [];
  const fileOk = (src, what) => {
    if (typeof src !== "string" || !src.startsWith("/")) return errors.push(`${what}: "${src}" should be a path starting with /media/`);
    if (siteRoot && !existsSync(`${siteRoot}${decodeURI(src)}`)) errors.push(`${what}: file ${src} is missing`);
  };
  if (!data || typeof data !== "object") return ["The file is not a JSON object."];
  if (!Array.isArray(data.properties)) errors.push('"properties" must be a list.');
  const slugs = new Set();
  (data.properties ?? []).forEach((p, i) => {
    const at = `Property ${i + 1}${p?.slug ? ` (${p.slug})` : ""}`;
    if (!p.slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug)) errors.push(`${at}: "slug" must be lower-case words joined by hyphens, e.g. "east-legon-villa".`);
    if (slugs.has(p.slug)) errors.push(`${at}: the slug is used twice.`);
    slugs.add(p.slug);
    if (!p.title) errors.push(`${at}: "title" is missing.`);
    if (!PURPOSES.includes(p.purpose)) errors.push(`${at}: "purpose" must be one of ${PURPOSES.join(", ")}.`);
    if (!TYPES.includes(p.type)) errors.push(`${at}: "type" must be one of ${TYPES.join(", ")}.`);
    if (p.status && !STATUSES.includes(p.status)) errors.push(`${at}: "status" must be one of ${STATUSES.join(", ")}.`);
    const pr = p.price ?? {};
    if (!pr.on_request && !(typeof pr.amount === "number" && pr.amount >= 0)) errors.push(`${at}: give "price.amount" as a number, or set "price.on_request": true.`);
    if (!pr.on_request && !/^[A-Z]{3}$/.test(pr.currency ?? "")) errors.push(`${at}: "price.currency" must be a code like GHS or USD.`);
    if (pr.period && !PERIODS.includes(pr.period)) errors.push(`${at}: "price.period" must be one of ${PERIODS.join(", ")}.`);
    if (p.stage && !STAGES.includes(p.stage)) errors.push(`${at}: "stage" must be one of ${STAGES.join(", ")}.`);
    const area = (a) => UNITS.includes(a.unit) && (typeof a.value === "number" || (typeof a.min === "number" && typeof a.max === "number"));
    for (const k of ["size", "land"]) if (p[k] && !area(p[k])) errors.push(`${at}: "${k}" needs a number "value" (or "min" and "max") and a "unit" (${UNITS.join(", ")}).`);
    if (p.bedrooms != null && typeof p.bedrooms !== "number" && typeof p.bedrooms !== "string") errors.push(`${at}: "bedrooms" must be a number, or text such as "Studio–2".`);
    if (p.website && !/^https:\/\//.test(p.website)) errors.push(`${at}: "website" must start with https://`);
    (p.unit_types ?? []).forEach((u, j) => !u?.name && errors.push(`${at}, unit type ${j + 1}: needs a "name".`));
    const loc = p.location ?? {};
    if ((loc.lat === undefined) !== (loc.lng === undefined) || (loc.lat !== undefined && (typeof loc.lat !== "number" || typeof loc.lng !== "number"))) errors.push(`${at}: "location.lat" and "location.lng" must both be numbers (or both left out).`);
    (p.photos ?? []).forEach((ph, j) => fileOk(ph?.src, `${at}, photo ${j + 1}`));
    (p.floorplans ?? []).forEach((pl, j) => fileOk(pl?.src, `${at}, floor plan ${j + 1}`));
    if (p.brochure) fileOk(p.brochure.src, `${at}, brochure`);
    const scenes = p.tour?.scenes ?? [];
    const ids = new Set(scenes.map((s) => s.id));
    scenes.forEach((s, j) => {
      if (!s.id || !s.title) errors.push(`${at}, tour room ${j + 1}: needs an "id" and a "title".`);
      fileOk(s.image, `${at}, tour room ${s.id ?? j + 1}`);
      (s.hotspots ?? []).forEach((h) => !ids.has(h.to) && errors.push(`${at}, tour room ${s.id}: a hotspot leads to "${h.to}", which is not a room in this tour.`));
    });
  });
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const site = fileURLToPath(new URL("../site", import.meta.url));
  let data;
  try {
    data = JSON.parse(readFileSync(`${site}/data/properties.json`, "utf8"));
  } catch (e) {
    console.error(`site/data/properties.json is not valid JSON: ${e.message}`);
    process.exit(1);
  }
  const errors = checkPortfolio(data, site);
  if (errors.length) {
    console.error(errors.map((e) => `✗ ${e}`).join("\n"));
    process.exit(1);
  }
  console.log(`✓ ${data.properties.length} ${data.properties.length === 1 ? "property" : "properties"} checked, all files present.`);
}
