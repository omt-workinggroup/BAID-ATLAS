// Public settings for the browser. Never put a secret here.
export const SITE_NAME = "Propertiq";
export const SITE_URL = "https://propertiq-gh.vercel.app";
// MapTiler map tiles. This key is public by design (every visitor's browser uses it); it is restricted in the
// MapTiler dashboard to Propertiq's own web addresses, so it cannot be used from other sites.
export const MAPTILER_KEY = "9g1fE8seqYv83q0AINcI";
export const MAP_STYLE = "dataviz-light";
// Map of all properties: a dark style with strong road and area labels, so prices and places stay easy to read.
export const MAP_STYLE_DARK = "streets-v2-dark";
