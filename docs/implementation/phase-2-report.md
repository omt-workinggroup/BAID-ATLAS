# Phase 2 report: listings and discovery

Date: 16 October 2026 · Branch: `claude/dazzling-pasteur-kqzrut`

## What was built

**Public**

| Route | What it does |
| --- | --- |
| `/explore` | Search by place/title, purpose chips, bottom-sheet filters (type, price + currency, bedrooms, sort), stable keyset "Load more", skeleton loading, honest empty states |
| `/rentals`, `/land`, `/short-stays`, `/commercial` | Shareable category links into Explore |
| `/properties/[slug]` | Swipeable gallery with thumbnails and render/staging labels, price with ISO currency and period, key facts with units, approximate location only, provider trust card with scoped verification, safety tips, Save and Share, sticky mobile action bar, JSON-LD for search engines |
| `/providers/[slug]` | Provider profile with verification scope and live listings |
| `/account/saved` | Hearted properties; sold or paused ones drop out automatically |
| `/` | Live search box and category links; "Fresh on BAID Atlas" rail shows real listings once published (labelled illustrations until then) |

**Providers** (`/portal/[org]/listings`): stats, list with status chips, new-listing form (offer type, price basis that adapts to sale/rent, region, private address, rooms, areas with units), photo uploader that resizes on the phone and strips EXIF/GPS by re-encoding to WebP, cover selection, photo removal, a submission checklist, publish/pause/sold/rented/archive.

**Staff** (`/ops`): review queue (oldest first, ageing badge), review screen with photos, facts, decision (approve / request changes / reject), reason codes, message to provider, staff-only internal notes and history; platform-admin organisation verification with a public scope and expiry.

## Trust rules enforced in the database

- Only published, unexpired listings of active organisations are public (RLS + `listing_cards` view).
- Exact address and coordinates are never selectable; public coordinates are rounded to ~1 km.
- Status can't be written directly; every transition is a validated, audited function.
- Unverified organisations cannot publish, even when a listing is approved. Verification needs a written scope.
- Moderators can't review their own organisation's listings; internal notes are staff-only.
- Photos live in a private bucket; a file is readable only when its listing is.

## Tests actually run

| Suite | Result |
| --- | --- |
| pgTAP (local Postgres 16 + auth/storage stub) | **89/89 passed** (40 new) |
| Unit (Vitest) | **41/41 passed** (15 new) |
| Lint, typecheck, production build | clean |
| E2E mobile (Pixel 7, iPhone 14, desktop) | **65 passed**, 5 skipped (signed-in suite needs QA secrets) |

The signed-in flows (creating a listing, uploading, moderating, publishing) are covered by database tests but could
not be clicked through end-to-end here: this sandbox cannot reach Supabase. Screenshots of listing cards come from
the design gallery (`/design`, sample data, disabled in production unless `NEXT_PUBLIC_DESIGN_GALLERY=1`).

## Applied to Supabase

`listings_schema`, `listings_security`, `listings_workflow` are live. Pending (contain `DELETE`, need your
approval or a CI migration token): `remove_member`, `saved_listings_removal` (un-saving a property).

## Deviations from the blueprint

- Media and saves attach to listings rather than properties (the public unit is a listing).
- A minimal admin verification control was pulled forward from Phase 4 so the "verified to publish" rule can work.
- No map tiles yet: the location card shows the approximate area. A map provider is still to be chosen.
- Contact/inquiries are visibly marked "coming in the next release" (Phase 3).
