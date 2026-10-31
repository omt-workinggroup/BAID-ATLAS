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
| `site/map.html` | The map page: opens on Hybrid (Esri satellite imagery with OpenFreeMap road and area names); Satellite and the street Map are a tap away. Nearby properties form numbered clusters; filters (sale or rent, type, price, bedrooms, bathrooms) update the map and list together; the property card's main action is Get directions. Phones switch between Map and List. `/map?p=slug` opens on one property. |
| `site/agents.html` | Agents, companies, developers and home owners on the platform (the Agents tab), and the office on a satellite map. |
| `site/profile.html` | The Profile tab: Sign up and Sign in; signed in, the account's name, role, phone and email. Also the saved properties on this phone. |
| `site/sign-up.html`, `site/sign-in.html`, `site/js/account.js` | Accounts (Supabase Auth): sign up as agent, company, developer or home owner, then phone number, SMS code (sent through SasuSync by `supabase/functions/send-sms`), then name, email and password. Sign in with phone and password; "Forgot password?" resets it by SMS. |
| `api/route.mjs` | `/api/route`: road directions for the map, run on Vercel. Uses OpenRouteService when `ORS_API_KEY` is set in Vercel, otherwise the free OpenStreetMap routing servers. |
| `site/property.html` | One property: photo hero, facts, section tabs, photos, payment planner (priced sales), 3D tour, floor plans, brochure, location and contact. Printing gives a clean details sheet. Served at `/properties/:slug`. |
| `site/js/data.js` | Reads the properties file; price, area, filter, viewing-message and payment-plan helpers. |
| `site/js/tour.js` | 3D tour: [Pannellum](https://pannellum.org) (MIT, in `site/js/vendor`) with room buttons, hotspots, auto-rotate, tilt-to-look and full screen. |
| `site/js/viewer.js` | Full-screen photo and floor-plan viewer. |
| `site/js/store.js`, `site/js/collect.js` | Saved properties (the heart), kept in the browser; the save and share buttons. |
| `site/js/amenities.js` | Matches each property's features to amenity icons; only what a property lists is shown. |
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
