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
