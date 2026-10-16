-- Phase 2: properties, listings, media, reviews and saved listings.

create type public.listing_purpose as enum ('sale', 'long_term_rent', 'short_stay', 'lease');
create type public.property_type as enum
  ('house', 'apartment', 'land', 'commercial', 'office', 'retail', 'industrial', 'warehouse', 'mixed_use', 'other');
create type public.listing_status as enum
  ('draft', 'submitted', 'changes_requested', 'approved', 'published', 'paused', 'rejected', 'expired', 'sold', 'rented', 'archived');
create type public.review_status as enum ('pending', 'approved', 'changes_requested', 'rejected');
create type public.area_unit as enum ('sqm', 'sqft', 'acre', 'hectare', 'plot');
create type public.media_type as enum ('image', 'video', 'floor_plan', 'virtual_tour', 'document');
create type public.price_period as enum ('total', 'per_month', 'per_year', 'per_week', 'per_night');

-- Organisation verification details (decided by platform admins; see set_organization_verification).
alter table public.organizations
  add column verification_scope text check (verification_scope is null or char_length(verification_scope) <= 200),
  add column verified_at timestamptz,
  add column verification_expires_at timestamptz;
grant select (verification_scope, verified_at, verification_expires_at) on public.organizations to anon, authenticated;

-- ---------------------------------------------------------------------------
-- properties: the physical asset. Exact address and coordinates are private.
-- ---------------------------------------------------------------------------
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  type public.property_type not null,
  country_code char(2) not null default 'GH' check (country_code ~ '^[A-Z]{2}$'),
  region text not null check (char_length(region) between 2 and 80),
  city text not null check (char_length(city) between 2 and 80),
  locality text check (locality is null or char_length(locality) <= 80),
  address_private text check (address_private is null or char_length(address_private) <= 300),
  latitude numeric(9, 6) check (latitude between -90 and 90),
  longitude numeric(9, 6) check (longitude between -180 and 180),
  -- Rounded to ~1 km so maps never reveal the exact plot.
  public_latitude numeric(6, 2) generated always as (round(latitude, 2)) stored,
  public_longitude numeric(6, 2) generated always as (round(longitude, 2)) stored,
  bedrooms smallint check (bedrooms between 0 and 50),
  bathrooms smallint check (bathrooms between 0 and 50),
  floor_area numeric(12, 2) check (floor_area > 0),
  floor_area_unit public.area_unit,
  land_area numeric(14, 2) check (land_area > 0),
  land_area_unit public.area_unit,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((floor_area is null) = (floor_area_unit is null)),
  check ((land_area is null) = (land_area_unit is null)),
  check ((latitude is null) = (longitude is null))
);
create index properties_org_idx on public.properties (organization_id);
create index properties_location_idx on public.properties (country_code, region, city);
create trigger properties_set_updated_at before update on public.properties
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- property_listings: an offer (sale, rent, stay, lease) for a property.
-- ---------------------------------------------------------------------------
create table public.property_listings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  slug extensions.citext not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 90),
  title text not null check (char_length(title) between 5 and 120),
  description text check (description is null or char_length(description) <= 5000),
  purpose public.listing_purpose not null,
  asking_price numeric(18, 2) not null check (asking_price >= 0),
  currency char(3) not null default 'GHS' check (currency ~ '^[A-Z]{3}$'),
  price_period public.price_period not null default 'total',
  status public.listing_status not null default 'draft',
  submitted_at timestamptz,
  approved_at timestamptz,
  published_at timestamptz,
  expires_at timestamptz,
  is_sponsored boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((purpose = 'sale') = (price_period = 'total') or purpose = 'lease')
);
create unique index property_listings_slug_key on public.property_listings (slug);
create index property_listings_org_idx on public.property_listings (organization_id, status, updated_at desc);
create index property_listings_public_idx on public.property_listings (published_at desc, id desc)
  where status = 'published';
create index property_listings_search_idx on public.property_listings (purpose, currency, asking_price)
  where status = 'published';
create trigger property_listings_set_updated_at before update on public.property_listings
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- property_media: photos and other media, labelled honestly.
-- ---------------------------------------------------------------------------
create table public.property_media (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.property_listings (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  media_type public.media_type not null default 'image',
  storage_path text check (storage_path is null or storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,100}$'),
  external_url text check (
    external_url is null
    or external_url ~ '^https://(www\.)?(youtube\.com|youtu\.be|vimeo\.com|my\.matterport\.com|kuula\.co)/'
  ),
  alt_text text check (alt_text is null or char_length(alt_text) <= 200),
  is_render boolean not null default false,
  is_virtually_staged boolean not null default false,
  rights_confirmed_at timestamptz not null default now(),
  width integer check (width between 1 and 10000),
  height integer check (height between 1 and 10000),
  sort_order smallint not null default 0,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  check (num_nonnulls(storage_path, external_url) = 1)
);
create index property_media_listing_idx on public.property_media (listing_id, sort_order) where hidden_at is null;

-- ---------------------------------------------------------------------------
-- listing_reviews: moderation decisions. Internal notes are staff-only.
-- ---------------------------------------------------------------------------
create table public.listing_reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.property_listings (id) on delete cascade,
  reviewer_id uuid references public.profiles (id) on delete set null,
  status public.review_status not null default 'pending',
  reason_code text check (reason_code is null or reason_code ~ '^[a-z_]{3,40}$'),
  provider_message text check (provider_message is null or char_length(provider_message) <= 1000),
  internal_notes text check (internal_notes is null or char_length(internal_notes) <= 2000),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index listing_reviews_queue_idx on public.listing_reviews (status, submitted_at) where status = 'pending';
create index listing_reviews_listing_idx on public.listing_reviews (listing_id, submitted_at desc);

-- ---------------------------------------------------------------------------
-- saved_listings: a user's saved properties.
-- ---------------------------------------------------------------------------
create table public.saved_listings (
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.property_listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
create index saved_listings_listing_idx on public.saved_listings (listing_id);
