# Adding your properties

The site is a private portfolio with no accounts and no sign-in. Everything it shows comes from one file,
`site/data/properties.json`, plus each property's photos and documents in `site/media/<property>/`.

## The easy way

Send Claude the details and files for each property (see **What to send** below). Claude adds them, checks them
and publishes the update.

## What to send for each property

**The details:**

- **Name**, for example "East Legon Villa".
- **For sale or for rent** (or short stay, or lease).
- **Type:** house, townhouse, apartment, land, commercial, office, retail, warehouse or mixed use.
- **Price** and currency (GHS or USD). For rent, say whether it is per month or per year. "Price on request" is
  fine.
- **Area and city**, for example East Legon, Accra.
- **Rooms and size:** bedrooms, bathrooms, parking spaces, floor size, land size.
- **A one-line summary and a fuller description.**
- **Features**, for example pool, borehole, boys' quarters, generator.
- **Status:** available, under offer, sold or let.

**The files:**

| What | Format | Notes |
| --- | --- | --- |
| Photos | JPG, as many as you like | The first one is the cover. Landscape, at least 1600 px wide. |
| Floor plans | JPG or PNG, one per floor | A clear scan or the architect's export. |
| Brochure | PDF | Under 10 MB if possible, so it opens quickly on phones. |
| 3D tour | 360° photos, one per room (JPG) | See below. |

## The 3D tour

There are two ways to provide a tour.

### 1. 360° photos (recommended, shown by the site itself)

Take one 360° photo in the middle of each room with:

- a 360° camera (Insta360, Ricoh Theta), or
- a phone app that makes "photo sphere" panoramas.

Each photo must be **equirectangular**: twice as wide as it is tall, for example 6000 × 3000. That is what these
cameras and apps produce by default. Keep each one under about 8 MB.

Tell Claude:

- **The order of the rooms.** The first room is where the tour starts.
- **Which rooms connect**, for example "from the living room you can walk to the kitchen and the hall". Claude
  places the white circles visitors tap to move between rooms.

### 2. A link from a tour service

If you already have a Matterport, Kuula or YouTube 360 tour, send the link. Only those services are accepted.
Links from other sites are ignored for safety.

## Your contact details

At the top of `properties.json`, the `owner` section holds your WhatsApp number, phone and email. Only the ones
filled in are shown on the site. The WhatsApp button opens a chat with a message naming the property. Send
Claude the details you want shown.

## Editing the file yourself

If you prefer, edit `site/data/properties.json` on GitHub. `tests/fixtures/portfolio.json` has a complete
example of every field.

Before publishing, make the small preview images, then run the check:

```bash
python3 scripts/make-thumbs.py   # small, fast previews for cards and the map (needs Pillow)
pnpm check:properties
```

This checks:

- the spelling of every value;
- that every photo, preview, plan, brochure and 360° image exists;
- that tour rooms connect to real rooms.

It explains any mistake in plain words.

Positions on the map (`location.lat` and `location.lng`) should mark the **area**, not the gate. The exact
address is shared when someone arranges a viewing.

## Amenities

Each property page shows an icon for every amenity in its `features` list: kitchen, air conditioning,
generator, solar, water/borehole, pool, gym, elevator, parking, security/CCTV, gated, balconies, garden,
smart home, glazing, floors, finishes, communal areas, retail and property management. Write the feature in
plain words (for example `"Swimming pool"`, `"Standby generator"`); anything without an icon is listed as
text underneath. Nothing is shown for amenities a property doesn't list.

## Agents, developers and companies

The Agents page lists the owner (from `owner`, with `"kinds"`) and everyone in `"directory"`. Add a profile
only once you have checked who they are:

```json
"directory": [
  {
    "name": "Ama Mensah",
    "kinds": ["agent"],
    "company": "Mensah Realty",
    "location": "East Legon, Accra",
    "areas": ["East Legon", "Airport"],
    "services": ["Sales", "Rentals"],
    "phone": "+233 20 000 0000",
    "whatsapp": "+233 20 000 0000",
    "email": "ama@example.com",
    "website": "https://example.com",
    "socials": { "instagram": "https://instagram.com/…", "linkedin": "https://linkedin.com/in/…" },
    "experience": "8 years",
    "verified": true
  }
]
```

`kinds` can be `agent`, `developer`, `company` and `estate`. To show a property as theirs, add
`"listed_by": "Ama Mensah"` to that property. `pnpm check:properties` checks each profile has a name, a valid
kind and a way to reach them, and that links start with `https://`.

## Directions

Directions on the map come from `/api/route` (`api/route.mjs`), which runs on Vercel. It works without any
setup using the free OpenStreetMap routing servers. For OpenRouteService (free, about 2,000 routes a day),
create a key at openrouteservice.org, then in Vercel open the project, **Settings → Environment Variables**,
add `ORS_API_KEY` with the key, and redeploy. The key stays on the server; never put it in `site/`.

## Sample listings (testing only)

Properties with `"sample": true` (slugs starting `sample-`) are invented listings that show how the site looks
with a fuller list. They are marked "Sample" everywhere, have no contact or booking buttons, and use free
photos from Unsplash (unsplash.com/license) stored in `site/media/samples/`. To remove them all, delete every
property with `"sample": true` from `site/data/properties.json` and delete `site/media/samples/`.

