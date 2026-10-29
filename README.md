# Propertiq

A listing website for a portfolio of homes, apartments, offices and stores in Accra: a plain, editorial site with a
normal header and footer (a "Menu" button on phones), no accounts and no sign-in. For each property, visitors see:

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
| `site/index.html` | Homepage: introduction, the listings (filters, search, sort, a large first property), a 3D satellite map of the locations, about, and how to arrange a viewing. |
| `site/property.html` | One property: photo hero, facts, photos, 3D tour, floor plans, brochure, location and contact. Served at `/properties/:slug`. |
| `site/contact.html` | The owner's contact details. |
| `site/js/data.js` | Reads the properties file; price, area and filter helpers. |
| `site/js/tour.js` | 3D tour: [Pannellum](https://pannellum.org) (MIT, in `site/js/vendor`) with room buttons, hotspots, auto-rotate, tilt-to-look and full screen. |
| `site/js/viewer.js` | Full-screen photo and floor-plan viewer. |
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
