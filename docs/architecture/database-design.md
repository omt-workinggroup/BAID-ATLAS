# Database design

Postgres (Supabase). All tables live in `public` unless noted; RLS is enabled on every table exposed through
the API. Migrations are explicit SQL in `supabase/migrations`.

## Global rules

- UUID primary keys (`gen_random_uuid()`), foreign keys with explicit `on delete` behaviour.
- `created_at timestamptz not null default now()`, `updated_at` maintained by a shared trigger.
- Money: `numeric(18,2)` amount **plus** `char(3)` ISO currency (check `~ '^[A-Z]{3}$'`, FK to
  `currencies` once that table exists). Never float. Display conversion never writes back.
- Areas: value `numeric(14,2)` **plus** unit enum (`sqm`, `sqft`, `acre`, `hectare`, `plot`). No implied unit.
- Timestamps in UTC (`timestamptz`); scheduled local events also store an IANA `timezone` text validated
  against `pg_timezone_names`.
- Status columns are **not** writable by clients; transitions happen in `security definer` RPC functions that
  check the caller, the current state and the allowed next state, then write `audit_log`.
- Nullable idempotency keys use **partial unique indexes** (`where idempotency_key is not null`).
- Public reads go through views (`security_invoker = true`) that drop private columns.

## Enums

```
account_status       active | suspended | closed
organization_type    agency | developer | landlord | property_manager | marketing_partner | enterprise
org_role             owner | admin | listing_manager | marketing_manager | lead_manager | viewer
staff_role           moderator | verification_reviewer | marketing_specialist | platform_admin
listing_purpose      sale | long_term_rent | short_stay | lease
property_type        house | apartment | land | commercial | office | retail | industrial | warehouse | mixed_use | other
listing_status       draft | submitted | changes_requested | approved | published | paused | rejected | expired | sold | rented | archived
review_status        pending | approved | changes_requested | rejected
inquiry_status       new | assigned | contacted | qualified | viewing_requested | converted | closed | spam
verification_status  not_started | pending | in_review | verified | rejected | expired
media_type           image | video | floor_plan | virtual_tour | document
area_unit            sqm | sqft | acre | hectare | plot
```

`staff_role` is an addition to the blueprint's vocabularies: platform roles are kept separate from
organisation roles so that an organisation owner is never a platform admin.

## Core tables (Phases 1–4)

| Table | Key columns | Constraints / notes |
| --- | --- | --- |
| `profiles` | `id` (= `auth.users.id`), `display_name`, `email citext`, `phone`, `avatar_path`, `preferred_locale`, `preferred_currency char(3) default 'GHS'`, `account_status`, `email_verified_at` | Created by trigger on `auth.users` insert. `account_status` only changeable by staff RPC |
| `staff_roles` | `user_id`, `role staff_role`, `granted_by`, `granted_at` | PK (`user_id`,`role`). No client writes |
| `organizations` | `name`, `slug citext unique`, `type`, `description`, `website`, `public_email`, `public_phone`, `country_code`, `status`, `verification_status` | `verification_status` only via verification RPC |
| `organization_members` | `organization_id`, `user_id`, `role org_role`, `created_at` | Unique (`organization_id`,`user_id`). At least one owner enforced in RPC |
| `organization_invitations` | `organization_id`, `email`, `role`, `token_hash`, `expires_at`, `accepted_at` | Added to support team workflow |
| `properties` | `type`, `country_code`, `region`, `city`, `locality`, `address_display`, `address_private`, `latitude`, `longitude`, `public_latitude`, `public_longitude`, `bedrooms`, `bathrooms`, `floor_area`, `floor_area_unit`, `land_area`, `land_area_unit`, `attributes jsonb`, `owner_organization_id` | Lat/long range checks; `address_private` and exact coordinates excluded from public views; public coordinates are rounded/jittered |
| `developments` | `organization_id`, `slug`, `name`, `description`, location fields, `completion_target date`, `construction_status`, `review_status`, `published_at` | Unique slug |
| `development_units` | `development_id`, `property_id?`, `unit_code`, `unit_type`, `floor`, `bedrooms`, `bathrooms`, `area`, `area_unit`, `availability`, `attributes jsonb` | Unique (`development_id`,`unit_code`) |
| `property_listings` | `property_id`, `organization_id`, `development_unit_id?`, `slug`, `title`, `description`, `purpose`, `asking_price numeric(18,2)`, `currency char(3)`, `price_period` (for rent), `status listing_status`, `published_at`, `expires_at`, `is_sponsored` | `asking_price >= 0`; unique slug; `status` only via RPC; publish requires org verification rules |
| `property_media` | `property_id`, `listing_id?`, `media_type`, `storage_path?`, `external_url?`, `alt_text`, `is_render bool`, `is_virtually_staged bool`, `rights_confirmed_at`, `sort_order`, `moderation_status` | Check: exactly one of `storage_path` / `external_url`; external URLs restricted to allow-listed hosts |
| `listing_reviews` | `listing_id`, `reviewer_id`, `status review_status`, `reason_code`, `notes` (internal), `submitted_at`, `reviewed_at` | Notes never in public views |
| `saved_properties` | `user_id`, `property_id`, `created_at` | PK (`user_id`,`property_id`) |
| `inquiries` | `listing_id`, `requester_id?`, `organization_id`, `contact_name`, `contact_email`, `contact_phone`, `message`, `status`, `consent_text`, `consent_at`, `source`, `idempotency_key` | Partial unique on (`idempotency_key`) where not null |
| `viewing_requests` | `inquiry_id`, `requested_start`, `requested_end`, `timezone`, `status`, `notes` | Check `requested_end > requested_start`; timezone validated |
| `verification_cases` | `subject_user_id?`, `subject_organization_id?`, `subject_listing_id?`, `verification_type`, `scope_description`, `status`, `evidence_path` (private bucket), `assigned_reviewer_id`, `reviewer_notes`, `decided_at`, `expires_at` | Check: exactly one subject (`num_nonnulls(...) = 1`) |
| `marketing_orders` | `organization_id`, `requester_id`, `listing_id?`, `service_type`, `status`, `quoted_amount`, `currency`, `assigned_specialist_id` | Phase 5 |
| `campaigns` | `marketing_order_id?`, `organization_id`, `name`, `objective`, `target_config jsonb`, `starts_at`, `ends_at`, `status`, `created_by` | `ends_at > starts_at`; Phase 5 |
| `subscriptions` | `organization_id`, `plan_code`, `status`, `provider`, `provider_customer_id`, `provider_subscription_id`, `currency`, `current_period_start`, `current_period_end` | No client writes; Phase 6 |
| `audit_log` | `id bigint identity`, `actor_id`, `action`, `entity_type`, `entity_id`, `before jsonb`, `after jsonb`, `ip inet?`, `created_at` | Insert only via functions; no update/delete grants. Pulled forward to Phase 1 |
| `rate_limit_buckets` | `key`, `action`, `window_start`, `count` | Phase 1 infra for auth/forms |

## Later tables

`conversations`, `conversation_members`, `messages`, `notifications` (Phase 3) · `campaign_assets`,
`campaign_approvals`, `campaign_metrics` (5) · `payment_events` / `billing_events` with unique provider event
IDs (6) · `country_config`, `currencies`, `regions`, `categories` (1–2, minimal) · `saved_searches`,
`collections`, `collection_items`, `report_cases` (2–5) · `media_processing_jobs`, retention/deletion records
(2, 8).

## Public-safe views

- `public_listings` — published, non-expired listings joined to property with **approximate** location,
  public media only, price + currency, organisation public profile and verification scope label. Excludes
  `address_private`, exact coordinates, inquiry data, review notes, evidence.
- `public_organizations` — name, slug, type, description, website, public contacts, verification label
  (scope, date, expiry).
- `public_developments`, `public_development_units` — Phase 4.

## Key indexes (tie to real queries; verify with `EXPLAIN` before adding more)

- `property_listings (status, expires_at)` partial `where status = 'published'`.
- `property_listings (purpose, currency, asking_price)` for filtered search.
- `properties (country_code, region, city)`; `properties (public_latitude, public_longitude)` (PostGIS later
  if bounding-box search requires it).
- `inquiries (organization_id, status, created_at desc)`.
- `verification_cases (assigned_reviewer_id, status)`.

## Migration path

Repository is empty, so no data migration is needed. Migrations will be created in order: extensions and
enums → profiles/staff → organisations/members/invitations → audit/rate-limit → (Phase 2) properties,
listings, media, reviews, saved → (Phase 3) inquiries, viewings, messaging → and so on.
