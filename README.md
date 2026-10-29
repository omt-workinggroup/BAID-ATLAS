# Propertiq

A listing website for a portfolio of homes, apartments, offices and stores in Accra, with no accounts and no sign-in.
Phones follow the Homio app screens (search pill, chips, photo cards, a bottom bar, and property pages with a stats
card and a Schedule Visit / Contact Agent bar); desktop is a classic listings site (white bar, photo hero with a
floating search, feature strip, three-column cards). For each property, visitors see:

- the price and key facts
- photos
- floor plans
- a brochure to download
- a 3D tour they can walk through

Visitors contact the owner on WhatsApp, by phone or by email. The site is mobile first and is tested from
320 px phones to 1440 px desktops.

Live site: https://propertiq-gh.vercel.app. The old addresses redirect here, as do the old sign-in and portal
pages; `/properties` redirects to the homepage. Vercel project: `propertiq`.

## Adding properties

Every property comes from **`site/data/properties.json`**, with its files in `site/media/<property>/`. See
[Adding your properties](docs/propertiq/adding-properties.md) for:

- what to send;
- how to take 360° photos for the tour;
- how to check the file with `pnpm check:properties`.

## How the code is laid out

The website is plain **HTML, CSS and JavaScript**. There is no framework and no build step: edit a file,
refresh the browser.

| File | What's in it |
| --- | --- |
| `site/index.html` | Homepage: only the properties, filtered by category (`?cat=sale`, `rent`, `townhouses`, `apartments`, `commercial`, `soon`). Properties marked `"coming_soon": true` show their name on a drawn thumbnail until their photos and details are added. |
| `site/map.html` | The map page (bottom bar's Map tab): list and price-tag pins on a 3D map (dark street map or satellite), the office marked, straight-line distances from the airport, the office or the visitor (nearest first, with a line to the property picked), a fly-through, and `/map?p=slug` links that open on one property. |
| `site/property.html` | One property: photo hero, facts, section tabs, photos, payment planner (priced sales), 3D tour, floor plans, brochure, location and contact. Printing gives a clean details sheet. Served at `/properties/:slug`. |
| `site/contact.html` | How to get in touch (WhatsApp, call, email) and the office on a satellite map. |
| `site/js/data.js` | Reads the properties file; price, area, filter, viewing-message and payment-plan helpers. |
| `site/js/tour.js` | 3D tour: [Pannellum](https://pannellum.org) (MIT, in `site/js/vendor`) with room buttons, hotspots, auto-rotate, tilt-to-look and full screen. |
| `site/js/viewer.js` | Full-screen photo and floor-plan viewer. |
| `site/js/here.js` | The visitor's location, only for showing how far they are from the properties and the office. The browser asks first; the position stays in that browser tab for 10 minutes and is never sent anywhere. |
| `site/js/visit.js` | "Book a viewing": pick a day and time, then send the request on WhatsApp or by email, already written. Nothing is booked automatically; the office replies to confirm. |
| `site/js/map.js` | 3D maps: [MapLibre GL](https://maplibre.org) (BSD-3, in `site/js/vendor`) with MapTiler satellite and street styles; fly-to, tilt and a slow orbit. |
| `site/css/style.css` | Every style, starting with the colour and spacing tokens at the top. |
| `vercel.json` | Clean URLs, routes, redirects from old addresses and security headers. |

The `supabase/` folder belongs to the earlier marketplace version and is not used by the site any more. The
database and its data are untouched.

## Development

```bash
pnpm install            # test and lint tools only
pnpm dev                # http://localhost:3000, same routes as Vercel
pnpm check:properties   # checks site/data/properties.json and its files
pnpm lint               # ESLint
pnpm test               # unit tests, including the properties check
pnpm test:e2e           # browser tests on phone and desktop sizes, using the sample portfolio in tests/fixtures
```

Pushing to the branch deploys to Vercel. There is nothing to build.
