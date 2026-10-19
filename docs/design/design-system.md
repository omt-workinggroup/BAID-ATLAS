# Propertiq design system

Status: **18 October 2026.** Built and in use in `site/css/style.css`. The tokens at the top of that file are the
source of truth; this page explains them.

**Direction:** editorial premium + modern PropTech + discovery-first marketplace (from the UI/UX brief), in the
black-and-white Propertiq identity you approved.

**References:** the Dribbble collections in the brief were reviewed (landing pages, property pages, property
search, map search, agent dashboards, verification dashboards, UI kits). Patterns were adapted, not copied.

## Principles

1. **Mobile first.** Designed at 360–430 px, then enhanced at 640, 768, 1024 and 1200 px. Phones get their own
   layouts (tabs, sheets, cards instead of tables) rather than a shrunken desktop.
2. **Honest by default.**
   - Five separate trust lines, never one badge.
   - Sponsored always labelled.
   - Renders and off-plan marked.
   - Missing values say "Not provided".
3. **Fast on slow networks.**
   - No framework.
   - Self-hosted fonts.
   - Photos resized on the phone before upload.
   - Lazy images and skeletons.
4. **Accessible (WCAG 2.2 AA).**
   - 44 px touch targets.
   - Visible focus rings.
   - Reduced motion respected.
   - Every control labelled.

## Brand

- **Logo:** the supplied file `site/brand/propertiq-logo.jpg`, never redrawn or recoloured.
  - `propertiq-logo.png` / `.webp` (880 × 216) are the same artwork with the black background made transparent:
    each pixel keeps its colour and the black becomes see-through, so the wordmark, house and soft edges are unchanged.
    The light streak under the original is left out.
  - Used in the header (30 px tall, 34 px on desktop), footer (36 px), the landing splash (over the photo, with a soft
    shadow) and the offline page. It is white artwork, so it goes on black, dark or photo backgrounds only.
  - **Mark:** `propertiq-mark.png` is the house-Q from the same artwork, cut out unchanged. It is the favicon
    (rounded black tile, 16–64 px), the app icons (192, 512, maskable, Apple 180) and the tab icon.
  - **Social preview:** `og.jpg` (1200 × 630, under 100 KB so WhatsApp shows it): logo, "Find Your Next Property",
    one short line, the address, and the landing photo. Public pages carry full Open Graph and Twitter tags.
- **Tagline:** "Property, understood better."

## Tokens

### Colour

| Token | Value | Use |
| --- | --- | --- |
| `--text`, `--primary` | `#0b0b0b` | Text, primary buttons, active states |
| `--bg`, `--surface` | `#ffffff` | Page and cards |
| `--surface-muted` | `#f5f5f5` | Quiet panels, table row labels, skeletons |
| `--border` | `#e5e5e5` | Hairlines and card borders |
| `--muted` | `#5c5c5c` | Secondary text (7:1 on white) |
| header / hero / footer | `#000000` | Matches the logo's background exactly |

**Status colours carry meaning only.** They are never used as decoration.

| Token | Value | Meaning |
| --- | --- | --- |
| `--success` / `--success-soft` | `#1e7b45` / `#e6f4ec` | A recorded check, live, confirmed |
| `--warning` / `--warning-soft` | `#9a5b00` / `#fff6e8` | Needs attention: stale availability, renders, off-plan, changes requested |
| `--danger` / `--danger-soft` | `#b3261e` / `#fdecea` | Errors, rejected, destructive actions |
| `--verified` | `#1d6fb8` | Advertiser identity label |
| `--sponsored` | `#6b4ba1` | Paid placement label, never a check |

### Type

| Role | Font | Notes |
| --- | --- | --- |
| Display (h1–h2, numbers in tiles) | Fraunces | Italic for a single emphasised word ("*more* confidence") |
| UI and body | Plus Jakarta Sans | 400 / 500 / 600 / 700 |

**Scale:**

| Element | Size |
| --- | --- |
| Hero | 2.4–4.25 rem (fluid) |
| h1 | 2–3 rem |
| Section h2 | about 1.5–1.75 rem |
| Body | 1 rem |
| Small | 0.875 rem |
| Tiny | 0.75 rem |
| Overline | 0.75 rem, uppercase, tracked |

### Space, radius, shadow

- **Spacing steps:** 0.25 / 0.5 / 0.75 / 1 / 1.25 / 1.5 / 2 / 2.5 / 3 rem.
- **Layout helpers:** `.stack`, `.stack-sm`, `.stack-lg`.
- **Radius:** `--radius-sm` 8 px (inputs, thumbnails), `--radius` 12 px (buttons, cards), `--radius-lg` 16 px (panels, hero, tiles).
- **Shadow:** a single soft `--shadow-lift`, used only for floating elements (search card, sheets, compare bar).

### Breakpoints

| Width | What changes |
| --- | --- |
| < 640 px | Single column, bottom navigation, filter sheet, cards instead of tables, hero drawing hidden |
| 640 px | Two-column grids and forms |
| 768 px | Search card fields in one row; 4 tiles per row; 3 category columns |
| 1024 px | Top navigation; filter sidebar; property photo mosaic; sticky contact panel; portal sidebar |
| 1200 px | Category links in the header; 6 category tiles; dashboard two-column grid |

## Components

| Component | Class / file | Notes |
| --- | --- | --- |
| Buttons | `.btn`, `--secondary`, `--ghost-light`, `--inverse`, `--danger`, `--small`, `--full`; `button.link` | Primary is black. One primary button per area. |
| Inputs | `.input`, `.select`, `.textarea`, `.check` | Label above; hint and error under the field (`showErrors`). |
| Search card | `.home-search` | Overlaps the hero. Location or reference, purpose tabs, type. |
| Filter chips | `.chip` (purpose), `.filter-chip` (active filters, removable), `.pill-choice` (sheet options) | |
| Filter sheet / sidebar | `dialog.sheet`, `.sheet--inline` | One form: a bottom sheet on phones, a sticky sidebar from 1024 px. |
| Property card | `listingCard()` in `listings.js` | Price first; type, place, three facts; identity label; availability line; save and compare. No more than that. |
| Gallery | `.gallery` (phones), `.mosaic` + `.photos-dialog` (desktop) | Render and staged labels are always on the photo. |
| Key facts row | `.keyfacts` | Icons for bedrooms, bathrooms, floor, land and type. |
| Trust panel | `trustPanel()` in `trust.js` | Five dated lines, each with "What does this mean?". |
| Availability line | `availabilityLine()` | Green when confirmed in 30 days, amber after that. |
| Status pill | `.status--<status>` | Listing, lead and viewing states. |
| Tiles | `.tile-row`, `.tile` | Small numbers only (no huge stat cards). |
| Tables | `.table-card`, `.data-table` | From 900 px; `.only-narrow` card list below that. |
| Portal shell | `orgHeader()` + `.portal-root` | A sidebar on desktop, title and tabs on phones. |
| Landing (splash) | `/` (`index.html`, `.splash`) | Standalone welcome screen with no site navigation, sized to the reference: small logo top left, a two-line serif title ("Find Your Next Property"), three short lines of text and one tall white "Get Started" pill to `/home`. Nothing else. Wide screens show a black panel beside the portrait photo. |
| Map search | `/explore?view=map`, `map.js` | Dark MapTiler `streets-v2-dark` tiles (512 px, sharp labels). Overlay: "Explore Properties", Buy/Rent switch, type menu, filters. White price pills over soft approximate-area circles; the picked one turns black and shows a preview card at the bottom. Full screen on phones. |
| Compare | `compare.js`, `/compare` | Up to 4. "Not provided" and "Doesn't apply"; nothing estimated. |
| Alerts and toasts | `.alert--success/warning/error/info`, `toast()` | |
| States | `.skeleton`, `.empty` | Every page has loading, empty and error states. |

## Photography

The references depend on large architectural photos. Propertiq will only show:

1. Photos uploaded by advertisers on their own listings, with source and render labels.
2. Brand photography Propertiq owns or is licensed to use. **None has been supplied yet.**

Until brand photos exist, the hero uses an original line drawing in white on black. Stock photos must never be
presented as listings.

## Screens done in this design (18 October 2026)

- **Public:** landing splash (`/`), home (`/home`), map search, Explore (search results with filter sidebar, chips and sort), property page (mosaic, key facts, trust panel, similar properties), compare, trust and verification.
- **Advertiser:** portal overview dashboard, listings table, team, profile, leads (sidebar shell).

**Next:**

- Multi-step listing form.
- Lead pipeline statuses.
- Staff dashboard.
- Studio pages.
