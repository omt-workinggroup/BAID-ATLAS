# Propertiq: Phase 0 discovery and architecture

Status: **approved 18 October 2026, with the conditions in §2A**. Written 18 October 2026 against the *Propertiq Master Build Prompt*. Nothing in this
document has been built yet unless it is marked **exists**.

Companion documents:

- [Competitor analysis](../product/competitor-analysis.md)
- Earlier specifications, still valid where not replaced here:
  - [Requirements](../product/requirements.md)
  - [Database design](../architecture/database-design.md)
  - [Permissions matrix](../security/permissions-matrix.md)
  - [Threat model](../security/threat-model.md)

---

## 1. What already exists (inspected, not assumed)

### 1.1 Platform and hosting

| Area | Current state | Evidence |
| --- | --- | --- |
| Website | Plain HTML, CSS and JavaScript in `site/`. No framework and no build step. 29 pages, one stylesheet, a shared engine (`site/js/core.js`) and one script per page. You chose this so the code is easy to edit. | `site/` |
| Hosting | Vercel project `baid-atlas`, London region. `vercel.json` provides clean URLs, rewrites, redirects and a strict Content-Security-Policy. Production deploys from branch `claude/dazzling-pasteur-kqzrut`. | `vercel.json` |
| Database | Supabase Postgres, project `ecikayrsbjzgdjkehnhl`, London. 20 migrations, all applied remotely. | `supabase/migrations` |
| Authentication | Phone number and SMS code only. Codes go through Supabase's Send SMS hook and the `send-sms` Edge Function to SasuSync. You explicitly approved replacing email and Google sign-in. **Exists and works; preserved.** | `supabase/functions/send-sms` |
| File storage | Supabase Storage bucket `listing-media`. Photos are converted to WebP and stripped of location data on the phone before upload. | `site/js/media.js` |
| Tests | <ul><li>157 pgTAP database tests (RLS, roles, workflows)</li><li>35 unit tests</li><li>65 Playwright browser tests (phone and desktop)</li><li>A signed-in journey that runs when test phone numbers are configured</li></ul> | `supabase/tests`, `tests/` |
| CI | GitHub Actions runs lint, unit and E2E tests, plus the database tests on a Supabase stack. | `.github/workflows/ci.yml` |
| Brand | Your logo, unchanged, at `site/brand/propertiq-logo.jpg`. Black-and-white palette. Header and footer are pure black so the logo sits on its own background. | `site/css/style.css` |

### 1.2 Data model today

| Domain | Tables | Notes |
| --- | --- | --- |
| Accounts | `profiles`, `staff_roles` | Staff roles: moderator, verification_reviewer, marketing_specialist, platform_admin. |
| Organisations | `organizations`, `organization_members`, `organization_invitations` | Types: agency, developer, landlord, property_manager, marketing_partner, enterprise. Member roles: owner, admin, listing_manager, marketing_manager, lead_manager, viewer. Phone-based invitations. |
| Listings | `properties`, `property_listings`, `property_media`, `listing_reviews`, `saved_listings` | Every listing is reviewed before publishing. Publishing also requires a verified organisation. Public coordinates are rounded to about 1 km. Render and virtual-staging labels exist. Sponsored is a separate flag and never counts as verification. |
| Leads | `inquiries`, `inquiry_messages`, `inquiry_reads`, `viewing_requests`, `notifications` | Idempotent, rate-limited, time-zone checked. |
| Safety | `listing_reports`, `audit_log`, `private.rate_limit_buckets` | Moderator report queue with notes. |

### 1.3 Spec features that already work

- Browsing without an account.
- Search with keyset pagination and hostile-input protection.
- Category hubs, property pages and provider profiles.
- Saved properties.
- Provider portal: listings with photo upload, team roles and invitations, leads.
- Moderation queue with reasons and history.
- Organisation verification that records the scope of what was checked and an expiry date.
- Inquiries, conversations and viewing requests (propose, confirm, decline, complete).
- Listing reports.
- PWA manifest and offline page.
- Security headers and an open-redirect guard.

---

## 1.4 What the competitor research changes

- None of the Ghana platforms studied publicly documents checks on individual listings, freshness dates, or a clear line between paid promotion and trust signals. That is where Propertiq's trust panel and availability dates add the most.
- Bayut's documented model has dated listing checks that expire, with an on-site photo check. It supports our design: every Propertiq check shows a date and the scope of what was checked.
- Property Finder publishes the criteria for its agent badge. We will publish ours on `/trust-and-verification`.
- Jiji's "Verified ID" does not say what it checks, and reviews complain of pressure to pay. Our badges must always link to a plain explanation, and promotion must stay visibly separate.

## 2. Decisions this brief raises, and my recommendations

| # | Question | Recommendation | Why |
| --- | --- | --- | --- |
| D1 | The brief suggests Next.js. | **Keep plain HTML/CSS/JS + Supabase.** | You asked for code that is easy to edit, and it works today. The one real weakness is search-engine indexing (D2), which can be fixed without a framework. |
| D2 | Property pages are drawn in the browser, so search engines may index them poorly. There is no `sitemap.xml`. | Add **one small Vercel Function in plain JavaScript**. It fills in the title, description, Open Graph tags, canonical URL and JSON-LD for `/properties/:slug` and provider pages before sending the HTML. A second function generates `sitemap.xml` from published listings. | Keeps the site framework-free while making listings indexable (brief §24). Uses the public key only, and RLS still applies. |
| D3 | The brief lists email sign-up, password reset and email verification. | **Keep phone + SMS code** (your decision). Email becomes an optional, verified contact field for alerts later. | Brief §17 says to preserve working authentication. |
| D4 | The brief suggests warm neutrals plus one accent colour. | **Keep black and white** as you specified. Greys are used only for hierarchy; status colours (green, amber, red) are used only for meaning. | Your instruction takes precedence. Documented as tokens in `style.css`. |
| D5 | URL scheme (`/buy`, `/property/[slug]`, `/dashboard`, `/admin`). | **Keep the current URLs** and add the brief's public ones as redirects to existing pages (`/buy`, `/rent`, `/properties`, `/agents`, `/agencies`, `/developers`, `/property/:slug` → `/properties/:slug`). Keep `/account`, `/portal` and `/ops` for the workspace areas. | Avoids breaking links already shared. The brief allows a better-structured equivalent (§17). |
| D6 | Owners and independent agents (brief §7.2–7.3). | Model them as **one-person organisations** with new types `owner` and `independent_agent`. | Every permission, RLS rule and test already works per organisation. One ownership model is safer than two. |
| D7 | Notifications channel (brief §12 says email first). | **In-app now, SMS for important events** (viewing confirmed, saved-search match) through the existing SasuSync account. Email only once you choose a provider. | SMS already works. Each SMS costs credit, so the frequency will be capped. |
| D8 | Payments (brief §20). | **Not until a Ghana provider is chosen** and its merchant account is approved (e.g. Paystack or Hubtel). Build quotes and orders first; payment confirmation only ever via a signed webhook. | No fake payments (brief §20, §32). |
| D9 | Maps (brief §10.2). | **Leaflet + OpenStreetMap-based tiles** from a provider with a free tier and clear terms. Show approximate locations only (already rounded in the database). | No Google, per your earlier instruction. |

**I need your yes or no on D1–D9 before Phase 1 work starts.** Each one is reversible except D6, which shapes the data model.

---


## 2A. Approved decisions and conditions (18 October 2026)

| # | Decision | Condition |
| --- | --- | --- |
| D1 | Keep HTML/CSS/JavaScript | No Next.js migration and no rebuild of working features without a documented technical reason. |
| D2 | Serverless rendering and a sitemap | Must fit the current Vercel setup. Covers crawlable property pages, dynamic sitemap entries, canonical URLs, metadata, structured data and redirects. No existing URL may break. |
| D3 | Keep phone + SMS-code sign-in | Rate limiting, secure sessions, account recovery and abuse protection. The user model must allow email sign-in to be added later without a rebuild. |
| D4 | Keep the supplied logo exactly as provided, and black and white | Accessible status colours are allowed only for verification states, warnings, errors and success. |
| D5 | Preserve current URLs | Add redirects and canonical URLs. Nothing already shared or indexed may break. |
| D6 | **Replaced, see §2B** | Owners and agents must **not** be modelled permanently as one-person organisations. |
| D7 | In-app notifications first | SMS through SasuSync only after its API, delivery reports, costs and requirements are verified. The provider must stay replaceable. |
| D8 | No payments, subscriptions, paid promotion or checkout | Not until a Ghana provider is selected, approved and tested. The architecture may be prepared, but there must be no fake transactions and no misleading success states. |
| D9 | OpenStreetMap-compatible maps | Approximate public locations only, with attribution. The tile and geocoding services must be confirmed suitable for production. |

Standing rules:

- Verification statuses are explicit and evidence-based.
- An identity check never implies ownership.
- A document review never implies legal title certification.
- Payment never buys verification.
- No mock data, fake reviews, invented verification records or buttons that don't work.
- Stop if a migration risks existing data or authentication.

## 2B. Proposal for approval: users, advertisers and organisations

**Goal:**

- A person can advertise on their own, as an owner or an independent agent.
- They can later add team members, or create or join an organisation.
- Agencies, property companies and developers can have many members and branches.

**Today:** users (`profiles`), organisations and memberships are already separate tables. However, every listing belongs to an organisation (`property_listings.organization_id`), so a person cannot list without one.

**Proposed model.** It is additive: no table is dropped and no column is removed.

| Table | Purpose | Key columns |
| --- | --- | --- |
| `profiles` (exists) | The person. Phone now, email later (a second verified contact, no rebuild). | `id` = auth user |
| `organizations` (exists) | A business: agency, property company, developer, property manager. Types gain `property_company`. | `parent_organization_id` (new, nullable) for branches |
| `organization_members` (exists) | Person ↔ organisation with a role. A person can belong to several organisations. | unchanged |
| **`advertisers`** (new) | Whoever a listing is advertised by. Either a person acting for themselves, or an organisation. | `id`, `kind` (`individual` or `organization`), `profile_id` (when individual), `organization_id` (when organisation), `advertiser_type` (owner, independent_agent, agency, property_company, developer, property_manager), `display_name`, `slug`, `status`, created/updated |
| `property_listings` / `properties` | Gain `advertiser_id`. `organization_id` stays during the transition, so every existing query keeps working. | `advertiser_id` not null after backfill |

**Rules**

- An individual advertiser is managed only by its person.
- An organisation advertiser is managed by members with the right role. This uses the existing role checks.
- One helper, `private.can_act_for_advertiser(advertiser, roles)`, replaces the direct organisation checks in RLS and functions, step by step.
- **Growing up:** a sole owner who creates an organisation moves their advertiser to it (`kind` becomes `organization`). Listings keep the same `advertiser_id`, so nothing about the listings has to move. The move is audited.
- Identity verification attaches to the advertiser: a personal ID check for individuals, a business-registration check for organisations. Both use the same scoped and dated record as today.

**Migration strategy**

1. Create `advertisers` and backfill one `organization` advertiser per existing organisation (today: 1). Add `advertiser_id` to listings and backfill it (today: 1 listing).
2. Switch the functions and RLS to the new helper one at a time, each with pgTAP tests proving existing access is unchanged.
3. Allow individual advertisers: a new "Advertise as yourself" option in onboarding.
4. Only once nothing reads it any more, consider making `organization_id` nullable. **Never drop it without a separate approval.**

**Backward compatibility**

- Every existing URL (`/portal/:org`) keeps working.
- Individuals get `/portal/me`.
- The storage path layout `<org>/<listing>/file` becomes `<advertiser>/<listing>/file` for new uploads only. Existing photos stay where they are, and the access rules accept both layouts.

**Not started.** This needs your approval because it changes ownership rules.

## 2C. Affected areas for the first Phase 1 slice (trust panel, availability, details, references)

- **Tables:**
  - `properties`: subtype, furnishing, condition, completion status, parking.
  - `property_listings`: reference, negotiable, availability date and method.
  - New: `property_subtypes`, `amenity_definitions`, `property_amenities`, `availability_checks`.
- **Functions:**
  - `create_listing` and `update_listing` (through `apply_listing_payload`)
  - `get_listing_for_edit`
  - `submit_listing`: now records an availability confirmation
  - New: `confirm_listing_availability`
- **View:** `listing_cards`, with new columns appended so existing queries are unchanged.
- **Pages:** property page (trust panel, reference, details, amenities), listing form (fields per category), listing editor (availability), explore (filters, reference search), cards (availability line), new `/trust-and-verification`, homepage copy.

**Protection**

- Working state before the change: commit `4064f30` on the branch. A git tag could not be pushed from this environment.
- Live data before the change: 4 accounts, 1 organisation, 1 property, 1 listing, 3 photos, 13 audit rows.
- The migration is additive and each part runs in its own transaction.

## 2D. Design references (Dribbble), reviewed 18 October 2026

The reference pages were opened in a browser and are reachable. Patterns we will adapt in Propertiq's own black-and-white style, without copying any design:

- **Property pages:**
  - A photo mosaic on desktop (one large and four small images) with "show all photos"
  - A row of key facts with icons
  - A sticky contact panel
  - Floor plans and the location map as their own sections
- **Search:**
  - A split list and map layout on desktop
  - Compact cards with price first
  - Filter chips that stay visible
- **Dashboards:**
  - A left sidebar on desktop
  - A small number of number tiles
  - Dense, scannable tables with status pills
  - A recent-activity list
- **Avoid:** heavy gradients, glass effects, oversized stat cards and decorative charts with no data.

## 3. Gap analysis against the brief

Status key:

- **Exists**: built and tested.
- **Partial**: built, but needs the changes listed.
- **Missing**: not built.

### Trust system (§8): the biggest gap

| Requirement | Status | What changes |
| --- | --- | --- |
| Advertiser identity checked, with a published meaning | Partial | Organisation verification exists with a scope and expiry. It needs to be renamed in the UI to "Advertiser identity: Checked" and to link to a policy page. |
| Property visit recorded (date, scope, who, what was and wasn't checked) | Missing | `property_visits` table, reviewer workflow and a public summary. |
| Documents reviewed (type, date, scope, limitations) | Missing | `document_reviews`, plus private evidence in a separate bucket that is never public. |
| Availability confirmed (last date, method, stale flag, reminders) | Missing | `property_listings.availability_confirmed_at` + `availability_checks`, a "Still available?" action for advertisers, a stale flag after N days, and auto-pause after a longer period. |
| Photo source (advertiser upload, captured on a visit, reviewed) | Partial | Render and staging labels exist. Add a `source` field to media. |
| Verification panel with "What does this mean?" on every listing | Missing | New component on the property page; the content comes from the records above. |
| Paid promotion never buys verification | Exists | Enforced in the database (separate flag, publishing requires review + verified organisation). |
| Report a listing | Exists | — |
| Report an advertiser | Missing | — |
| Duplicate detection, anomaly flags | Missing | Phase 2: same-photo hash and near-duplicate title/location checks that only *prioritise* human review. |
| Safety guidance | Missing | `/safety` page and a short notice next to the contact button. |

### Listings and discovery (§6, §9–§11)

| Requirement | Status | What changes |
| --- | --- | --- |
| Category-specific fields | Partial | Add subtype, furnishing, condition, parking, amenities (defined list), completion status, negotiable, and permitted use/utilities for commercial and land. The form shows only the fields relevant to the category. |
| Unique property reference number | Missing | Short readable code, e.g. `PQ-7K3M2`. Searchable. |
| Search filters | Partial | Add bathrooms, size, furnishing, amenities, advertiser type, verification status, "has photos", listing age and reference number. |
| Sort options | Partial | Add "recently updated" and size. |
| Sponsored label | Exists | — |
| Map view | Missing | See D9. |
| Compare | Missing | Phase 2. Missing values are shown as missing, never estimated. |
| Saved searches and alerts | Missing | Phase 2 (D7). |
| Price and status history | Missing | `property_price_history` and status history, written by triggers. |
| Listing completeness indicator | Missing | Clearly separate from verification. |
| Video, floor plan, brochure, tour | Partial | The `media_type` enum exists; the upload UI handles images only. |

### Pages (§16, §17)

| Requirement | Status |
| --- | --- |
| Homepage sections: hero, categories, listings, trust explained, how it works, marketing, developments, professionals, insights, CTA, footer | Partial: hero, categories, listings, "how a listing gets here" and the verification specimen exist. Needs the brief's headline and tagline, a marketing section, and real developments once they exist. |
| About, how it works, trust and verification, safety, help, contact, privacy, terms, advertiser guidelines, report-listing | **Missing.** Legal pages will be marked as drafts until reviewed by a lawyer. No invented address, phone number or registration number. |
| Agents, agencies and developers directories | Partial: provider profiles exist, but there is no directory page. |
| Developments, projects and units | Missing (Phase 2). |
| Marketing services (Studio) | Missing (Phase 2 catalogue and requests, Phase 3 quotes, payments and campaigns). |

### Operations and commercial (§13–§15, §20, §27–§28)

| Area | Status |
| --- | --- |
| Moderation queue and audit log | Exists |
| Verification case management (assignment, evidence, decision history) | Missing (Phase 2) |
| Lead pipeline statuses (new … not proceeding) | Partial: inquiry statuses exist. Map them to the brief's list and add private team notes and follow-up reminders. |
| Listing analytics (views, contact clicks) | Missing. Privacy-conscious first-party event table, no third-party trackers. |
| Developer portal | Missing (Phase 2) |
| Marketing studio workflow | Missing (Phase 2–3) |
| Subscriptions, promotions, payments | Missing (Phase 3, D8) |
| Admin: users, categories and locations configuration | Missing |

### SEO, performance, accessibility (§24–§25)

| Item | Status |
| --- | --- |
| Titles and descriptions per page | Partial: set in the browser. Server-rendered for listings per D2. |
| Canonical URLs, sitemap, robots | Missing |
| JSON-LD (only true facts, no ratings) | Missing |
| Noindex on private pages | Exists |
| No horizontal overflow at 360–430 px | Exists (tested) |
| Reduced motion, focus styles, labels | Exists. A full audit is due in Phase 1. |

---

## 4. Proposed sitemap

Mapped to the brief. Status: **E** = exists, **N** = new, **R** = redirect to an existing page.

| Brief route | Propertiq route | Status | Phase |
| --- | --- | --- | --- |
| `/` | `/` | E | 1 (refresh) |
| `/properties`, `/buy`, `/rent` | `/explore` (+ purpose filter) | R | 1 |
| `/land`, `/commercial`, `/short-stays` | same, redirected to filtered `/explore` | E | — |
| `/developments`, `/projects/[slug]` | `/developments`, `/developments/:slug` | N | 2 |
| `/property/[slug]` | `/properties/:slug` | E (R from the brief's form) | 1 |
| `/location/[slug]` | `/locations/:slug` (only with real inventory) | N | 2 |
| `/agents`, `/agencies`, `/developers` (+ `[slug]`) | `/providers?type=…`, `/providers/:slug` | R/E | 1 |
| `/marketing-services` (+ `[slug]`) | `/marketing-services` (+ `/:slug`) | N | 2 |
| `/about`, `/how-it-works`, `/trust-and-verification`, `/safety`, `/help`, `/contact`, `/privacy`, `/terms`, `/advertiser-guidelines`, `/report-listing` | same | N | 1 |
| `/sign-in`, `/sign-up`, `/onboarding` | same, phone + code | E | — |
| `/forgot-password`, `/reset-password`, `/verify-email` | not applicable (D3) | — | — |
| `/dashboard/favourites`, `compare`, `saved-searches`, `notifications`, `enquiries`, `viewings`, `settings` | `/saved`, `/compare`, `/account/searches`, `/account/notifications`, `/inbox`, `/account` | E/N | 1–2 |
| `/dashboard/listings…`, `leads`, `team` | `/portal/:org/listings…`, `/leads`, `/team` | E | — |
| `/dashboard/listings/[id]/analytics` | `/portal/:org/listings/:id` (stats section) | N | 2 |
| `/dashboard/marketing`, `services`, `billing` | `/portal/:org/studio`, `/portal/:org/billing` | N | 2–3 |
| `/dashboard/developments…` | `/portal/:org/developments…` | N | 2 |
| `/admin…` | `/ops…` (reviews, reports and organisations exist; add users, verifications, visits, documents, studio, payments, audit, settings) | E/N | 1–3 |

---

## 5. Data model changes (new migrations; nothing existing is dropped)

**Phase 1**

- `organization_type` gains `owner` and `independent_agent` (D6).
- `property_listings` gains:
  - `reference` (unique, generated)
  - `availability_confirmed_at`
  - `availability_method`
  - `negotiable`
  - `listing_subtype`
- `properties` gains:
  - `furnishing`
  - `condition`
  - `parking_spaces`
  - `completion_status`
  - `permitted_use`
  - `utilities`
- New tables:
  - `amenity_definitions` and `property_amenities`
  - `property_status_history` and `property_price_history` (trigger-written)
  - `availability_checks`
  - `advertiser_reports` (or a generalisation of `listing_reports` to `moderation_reports` with a subject type)
- Public view `listing_trust` exposes only the public-safe trust facts for each listing.

**Phase 2**

- Verification:
  - `verification_cases` and `verification_evidence` (private bucket, short-lived signed URLs, staff-only)
  - `property_visits` and `document_reviews`
  - `photo_checks` or `property_media.source`
  - `verification_status_history`
- Discovery:
  - `saved_searches` and `comparisons`
  - `listing_events` (views, contact clicks; no personal data)
- Developer and studio:
  - `developments` and `development_units`
  - `marketing_service_catalogue`, `marketing_service_packages`, `marketing_requests`

**Phase 3**

- Studio work:
  - `marketing_quotes`, `marketing_projects`, `marketing_deliverables`, `marketing_revisions`
  - `marketing_campaigns`, `campaign_metrics`
- Billing and promotion:
  - `subscription_plans`, `subscriptions`
  - `listing_promotions`
  - `payments`, `payment_events` (webhook-verified), `refunds`

**Rules carried forward**

- Every table has RLS.
- Writes go through checked functions.
- Every consequential action is audited.
- Private evidence never shares a bucket with public media.
- Each migration ships with pgTAP tests.

---

## 6. Permission changes

- Owners and independent agents use the existing organisation roles. In a one-person organisation that person is the owner.
- Verification reviewers (`verification_reviewer`) gain access to verification cases, visits and document reviews. Moderators do not, which keeps listing moderation separate from verification (brief §27).
- Marketing partners (`marketing_partner` organisation type) see only the studio projects assigned to them.
- No advertiser can create or edit any trust record about their own listings. The database enforces this, as it already does for reviews.

---

## 7. Security and privacy additions

- A private `verification-evidence` bucket. Only staff can read it, through signed URLs that expire in minutes. A retention period will be set once you choose one.
- Rate limits on reports, availability confirmations and studio requests (same mechanism as today).
- Account deletion and data export flow (Phase 2) and a cookie notice only if non-essential cookies are ever added. None are used today.
- Risk signals (duplicates, price outliers) only re-order the human review queue. They never change public status by themselves.

---

## 8. Roadmap

| Phase | Scope | Exit check |
| --- | --- | --- |
| **1: Trustworthy MVP** (next) | D1–D9 decisions applied, then:<ul><li>Homepage refresh with the brief's copy</li><li>Info, legal-draft and safety pages</li><li>Brief URL redirects</li><li>Category-specific listing fields, reference numbers and the new filters</li><li>Availability confirmation and staleness</li><li>Public trust panel with "What does this mean?"</li><li>Report advertiser</li><li>Provider directory</li><li>Server-rendered meta and sitemap for listings (D2)</li><li>Map view</li><li>Accessibility pass</li><li>Deployment and recovery runbook, `.env` template</li></ul> | Brief §31 criteria 1–20 tested, each one reported pass or fail. |
| **2: Trust and professional workflows** | <ul><li>Verification cases, visits, document reviews, photo source</li><li>Compare, saved searches and SMS alerts</li><li>Duplicate flags</li><li>Developments and units</li><li>Lead notes and reminders</li><li>Listing stats</li><li>Studio catalogue and requests</li><li>Account deletion</li></ul> | Journeys D and E (brief §29) automated. |
| **3: Marketing and commercial** | <ul><li>Quotes, projects, deliverables and revisions</li><li>Campaigns and metrics</li><li>Plans and promotions</li><li>Payments via the chosen provider (sandbox first)</li><li>Partner access</li></ul> | Journey F with the provider's test mode. Payment state only from verified webhooks. |
| **4: Intelligence and international** | <ul><li>Natural-language search mapped to real filters</li><li>Description assistant with mandatory review</li><li>Neighbourhood pages with sourced data</li><li>Remote-viewing workflow</li><li>Extra countries and currencies through configuration</li></ul> | Only with reliable data and human review. |

Each phase ends with a report: what changed, migrations, test results (including failures), open bugs, and the credentials or approvals still needed.

---

## 9. Risks, costs and dependencies

| Item | Impact | Plan |
| --- | --- | --- |
| Legal review of terms, privacy and verification policy | Launch blocker | Pages ship marked "Draft — under legal review". |
| Who performs property visits and document reviews | Trust features need real people | The software records only what reviewers actually did. Nothing is pre-filled. |
| SMS cost | Alerts are paid per message | Daily cap per user; in-app first. |
| Payment provider approval | Phase 3 blocker | Choose a provider during Phase 2. |
| Map tile provider terms | Phase 1 | Choose a provider with a free tier and attribution, and confirm limits. |
| Search engines and client-drawn pages | Discovery | D2. |
| No real listings yet | Empty homepage | Honest "first listings are being reviewed" state. No fake inventory. |

---

## 10. Deliverables status (brief §33)

| # | Deliverable | Status |
| --- | --- | --- |
| 1 | Product requirements document | **Implemented** (earlier `requirements.md`), to be updated for Propertiq in Phase 1 |
| 2 | Competitor analysis | Implemented ([competitor-analysis.md](../product/competitor-analysis.md)); based on search summaries because the live sites could not be opened from the build environment, so prices and details need a manual re-check |
| 3 | Brand and design-system specification | Implemented for black/white tokens in `style.css`; `design-system.md` to be updated in Phase 1 |
| 4 | Sitemap and user flows | Sitemap: this document. User-flow diagrams: planned (Phase 1). |
| 5 | Technical architecture | This document plus `system-architecture.md` (needs updating for the static site) |
| 6 | Database schema and migration plan | Existing schema implemented and tested; changes planned in §5 |
| 7 | Role and permission matrix | Implemented (`permissions-matrix.md`); additions planned in §6 |
| 8 | Security and privacy plan | Partial (`threat-model.md`); additions planned in §7 |
| 9 | Implementation roadmap | This document §8 |
| 10 | Working Phase 1 application | In progress: much exists (§1.3); Phase 1 list in §8 |
| 11 | Automated tests and results | Implemented and tested for the existing scope |
| 12–19 | Deployment instructions, env template, DB setup, admin, advertiser, verification and studio guides, known limitations | Planned (Phase 1–3) |
