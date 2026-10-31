// Amenities: a property's features (from the data file) matched to icons. Only what a property lists is
// shown; anything that matches no icon is listed underneath as text, so nothing is lost or invented.
// To show an amenity, add it to that property's "features" in site/data/properties.json.
export const AMENITIES = [
  ["wifi", "WiFi", /wi-?fi|internet|fibre|fiber/i],
  ["kitchen", "Fully Fitted Kitchen", /kitchen/i],
  ["ac", "Air Conditioning", /air[- ]?cond|\bac\b/i],
  ["generator", "Standby Generator", /generator|backup power|standby power/i],
  ["bolt", "Solar Power", /solar/i],
  ["water", "Backup Water Supply", /water|borehole/i],
  ["pool", "Swimming Pool", /pool/i],
  ["gym", "Gymnasium", /\bgym/i],
  ["lift", "Elevator", /elevator|\blift\b/i],
  ["car", "Parking", /parking|car ?port|garage/i],
  ["cctv", "24/7 Security & CCTV", /security|cctv|guard/i],
  ["gate", "Gated Community", /gated/i],
  ["balcony", "Balconies & Terraces", /balcon|terrace/i],
  ["garden", "Garden", /garden|landscap/i],
  ["smart", "Smart Home", /smart/i],
  ["window", "Floor-to-ceiling Glazing", /glazing|floor-to-ceiling/i],
  ["floor", "Premium Floors", /floor(s|ing)\b(?!-)|timber|porcelain/i],
  ["paint", "Custom Finishes", /finishes|customi[sz]/i],
  ["people2", "Communal Areas", /communal|clubhouse|lounge|play ?area/i],
  ["shop", "Retail on Site", /retail|shops?\b|stores?\b/i],
  ["keys", "Property Management", /management/i],
];

// { found: [[icon, label, original text]], other: [text] }. One icon per amenity, in catalogue order.
export function amenitiesOf(p) {
  const features = p.features ?? [];
  const used = new Set();
  const found = [];
  for (const [icon, label, re] of AMENITIES) {
    const hit = features.find((f) => re.test(f));
    if (!hit) continue;
    found.push([icon, label, hit]);
    used.add(hit);
  }
  return { found, other: features.filter((f) => !used.has(f)) };
}
