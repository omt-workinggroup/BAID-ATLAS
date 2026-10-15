# Product requirements

Source: *BAID Atlas Full Platform Blueprint*, working specification, 15 October 2026. Only pages 7, 8 and
13–15 were supplied for Phase 0. Requirements that live on the other pages (vision, market, personas,
page-level UX, etc.) are **not yet captured here** and are listed as open questions at the end.

## Product summary

BAID Atlas is a **mobile-first** property platform for Ghana (other countries later). It lets people
discover properties for sale, rent, lease and short stay; lets providers (agencies, developers, landlords,
property managers) publish moderated listings and manage leads; adds a scoped, honest verification layer;
and sells marketing services (Atlas Studio) and clearly labelled sponsored placement (Atlas Campaigns).

## Product areas

| # | Area | Summary | Phase |
| --- | --- | --- | --- |
| 1 | Public discovery | Home, explore/search, map, property detail, category hubs (commercial, land, rentals, short stays) | 2 |
| 2 | Accounts and workspace | Sign-up/in, email verification, profile, saved properties, collections, compare | 1–2, 5 |
| 3 | Provider portal | Listings and media, leads, viewings, team, organisation settings | 2–3 |
| 4 | Inquiries and messaging | Idempotent inquiries, viewing requests, conversations, notifications | 3 |
| 5 | Trust and verification | Scoped verification cases for users, organisations and listings; private evidence | 4 |
| 6 | Developments | Projects, unit inventory, availability, developer lead management | 4 |
| 7 | Atlas Studio | Photo, video, lawful drone, virtual tours, listing design, campaign services | 5 |
| 8 | Atlas Campaigns | Clearly labelled sponsored placement, schedules, approvals, budgets, reporting | 5 |
| 9 | Atlas Intelligence | Calculators/insights with transparent assumptions, sources, disclaimers | 7 |
| 10 | Operations | Moderation, verification assignment, provider review, reports, audit, billing, country settings | 2–8 |

## User types

Visitor · registered user · owner/landlord · agency or property-manager member · developer · marketing
specialist · moderator · verification reviewer · platform administrator.

Key rules:

- Organisation owner is **not** a platform administrator.
- Marketing specialists see only campaigns and assets assigned to them.
- Verification reviewers see only cases assigned to them.
- Moderators cannot silently alter verification evidence.
- Suspended accounts lose protected privileges.
- Privileged and state-changing operations are audited.

## Non-functional requirements

- **Mobile first.** Every screen is designed at 360–430 px width first, then scaled up. Touch targets are at
  least 44×44 px. The app must work on mid-range Android phones over slow or metered connections
  (lazy-loaded media, small JS bundles, responsive images, offline-tolerant forms).
- **Installable.** Ship as a Progressive Web App (manifest, icons, service worker for static assets) so it
  can be added to the home screen. Native apps are out of scope until the web product is proven.
- **Accessibility.** WCAG 2.2 AA target: keyboard operable, screen-reader sensible, reduced-motion support,
  sufficient contrast, alt text on media.
- **Internationalisation.** Locale-aware formatting; translated labels are never stored as IDs. Money always
  carries an ISO currency (default GHS). Areas always carry a unit. Country-specific address, phone and
  measurement fields are configurable.
- **Privacy and security.** RLS on every exposed table; exact addresses, contact details, evidence and
  moderation notes never leave public-safe views. See [threat model](../security/threat-model.md).
- **Honesty.** No fake listings, reviews, verification badges or misleading sample data. Paid status is
  never verification. Renders and virtual staging are labelled.

## Out of scope (without separate legal/compliance review)

Escrow, custody of funds, lending, and any regulated transaction services.

## Open questions (blocking or shaping later phases)

1. Blueprint pages 1–6 and 9–12 were not supplied. Please share them so vision, personas, page UX and any
   further rules can be captured.
2. Brand assets: logo, brand colours and typeface. The [design system](../design/design-system.md) uses
   provisional tokens until these are supplied.
3. Supabase project: use the connected Supabase account, or a new dedicated project? Which region?
4. Hosting target: Vercel, Netlify (connected) or other?
5. Launch languages beyond English (e.g. Twi, Ga, Ewe, French for later markets)?
6. Ghana legal review contact for data protection (Data Protection Act 2012, Act 843) and real-estate
   advertising rules.
7. Payment provider shortlist for Phase 6 (e.g. Paystack, Hubtel, Flutterwave) — must be checked for Ghana
   support, fees, settlement and compliance before selection.
