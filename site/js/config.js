// Public settings for the browser. These are safe to publish: the publishable key only allows what the
// database's row-level security and checked functions allow. Never put a secret or service-role key here.
export const SUPABASE_URL = "https://ecikayrsbjzgdjkehnhl.supabase.co";
export const SUPABASE_KEY = "sb_publishable_PvFo2yR2L05I89ToXMBp0A_U3HzZ8l0";
export const SITE_NAME = "Propertiq";
export const MEDIA_BUCKET = "listing-media";
// MapTiler map tiles. This key is public by design (every visitor's browser uses it); it is restricted in the
// MapTiler dashboard to Propertiq's own web addresses, so it cannot be used from other sites.
export const MAPTILER_KEY = "9g1fE8seqYv83q0AINcI";
export const MAP_STYLE = "dataviz-light";
// Search map: a dark style with strong road and area labels, so prices and places stay easy to read.
export const MAP_STYLE_DARK = "streets-v2-dark";
