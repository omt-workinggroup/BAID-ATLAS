// Public settings for the browser. Never put a secret here. The Supabase publishable key is public by design:
// it only allows what row-level security and the auth settings allow. Never put a service-role key here.
export const SUPABASE_URL = "https://ecikayrsbjzgdjkehnhl.supabase.co";
export const SUPABASE_KEY = "sb_publishable_PvFo2yR2L05I89ToXMBp0A_U3HzZ8l0";
export const SITE_NAME = "Propertiq";
export const SITE_URL = "https://propertiq-gh.vercel.app";
// Street map: OpenFreeMap (free, open, no key). https://openfreemap.org
export const STREET_STYLE = "https://tiles.openfreemap.org/styles/liberty";
// Aerial imagery, used by the Satellite and Hybrid looks. Esri World Imagery; its use is governed by Esri's
// terms (an ArcGIS account is expected for commercial sites). To use another licensed provider, change
// "tiles" and "attribution" here; a keyed URL (e.g. "...?token=...") also works, as such keys are public.
export const IMAGERY = {
  tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
  attribution: "Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community",
  maxzoom: 19,
};
