-- Propertiq slice 1, part 1 of 3: listing reference numbers, category-specific property details, amenities,
-- and dated availability confirmations (the data behind the public trust panel).
--
-- Additive only: new types, columns, tables and functions. Existing rows keep their values; the only
-- backfill (part 3) gives every existing listing a reference number. Nothing is dropped.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.furnishing as enum ('unfurnished', 'semi_furnished', 'furnished');
create type public.property_condition as enum ('new', 'excellent', 'good', 'fair', 'needs_renovation');
create type public.completion_status as enum ('completed', 'under_construction', 'off_plan');
-- How availability was confirmed. Only 'advertiser' is recorded today; staff and visit confirmations
-- arrive with the verification workflow.
create type public.availability_method as enum ('advertiser', 'staff', 'property_visit');

-- ---------------------------------------------------------------------------
-- Reference data (configuration, not listings): subtypes and amenities per property type
-- ---------------------------------------------------------------------------
create table public.property_subtypes (
  type public.property_type not null,
  code text not null check (code ~ '^[a-z_]{2,40}$'),
  label text not null,
  sort smallint not null default 0,
  primary key (type, code)
);

create table public.amenity_definitions (
  code text primary key check (code ~ '^[a-z_]{2,40}$'),
  label text not null,
  category text not null check (category in ('utilities', 'security', 'comfort', 'facilities', 'access')),
  applies_to public.property_type[] not null,
  sort smallint not null default 0
);

insert into public.property_subtypes (type, code, label, sort) values
  ('house', 'detached', 'Detached house', 1),
  ('house', 'semi_detached', 'Semi-detached house', 2),
  ('house', 'townhouse', 'Townhouse', 3),
  ('house', 'villa', 'Villa', 4),
  ('house', 'bungalow', 'Bungalow', 5),
  ('house', 'compound_house', 'Compound house', 6),
  ('apartment', 'flat', 'Flat', 1),
  ('apartment', 'studio', 'Studio', 2),
  ('apartment', 'serviced_apartment', 'Serviced apartment', 3),
  ('apartment', 'penthouse', 'Penthouse', 4),
  ('apartment', 'chamber_and_hall', 'Chamber and hall', 5),
  ('apartment', 'single_room', 'Single room', 6),
  ('apartment', 'shared_room', 'Room in shared accommodation', 7),
  ('land', 'residential', 'Residential land', 1),
  ('land', 'commercial', 'Commercial land', 2),
  ('land', 'agricultural', 'Agricultural land', 3),
  ('land', 'industrial', 'Industrial land', 4),
  ('land', 'development', 'Development land', 5),
  ('land', 'mixed_use', 'Mixed-use land', 6),
  ('commercial', 'hotel', 'Hotel or guest house', 1),
  ('commercial', 'event_space', 'Event space', 2),
  ('commercial', 'restaurant', 'Restaurant or bar', 3),
  ('commercial', 'other_commercial', 'Other commercial premises', 4),
  ('office', 'office_space', 'Office space', 1),
  ('office', 'office_building', 'Whole office building', 2),
  ('office', 'shared_office', 'Shared or co-working office', 3),
  ('retail', 'shop', 'Shop', 1),
  ('retail', 'showroom', 'Showroom', 2),
  ('retail', 'mall_unit', 'Mall unit', 3),
  ('industrial', 'factory', 'Factory', 1),
  ('industrial', 'workshop', 'Workshop', 2),
  ('warehouse', 'warehouse', 'Warehouse', 1),
  ('warehouse', 'cold_storage', 'Cold storage', 2),
  ('mixed_use', 'mixed_use_building', 'Mixed-use building', 1);

insert into public.amenity_definitions (code, label, category, applies_to, sort) values
  ('pipe_borne_water', 'Pipe-borne water', 'utilities', '{house,apartment,commercial,office,retail,industrial,warehouse,mixed_use,land}', 1),
  ('borehole', 'Borehole', 'utilities', '{house,apartment,commercial,office,industrial,warehouse,mixed_use,land}', 2),
  ('water_storage', 'Water storage tank', 'utilities', '{house,apartment,commercial,office,retail,industrial,warehouse,mixed_use}', 3),
  ('electricity', 'Electricity connection', 'utilities', '{house,apartment,commercial,office,retail,industrial,warehouse,mixed_use,land}', 4),
  ('prepaid_meter', 'Own prepaid meter', 'utilities', '{house,apartment,commercial,office,retail,mixed_use}', 5),
  ('three_phase_power', 'Three-phase power', 'utilities', '{commercial,office,industrial,warehouse,mixed_use}', 6),
  ('backup_generator', 'Backup generator', 'utilities', '{house,apartment,commercial,office,retail,industrial,warehouse,mixed_use}', 7),
  ('solar_power', 'Solar power', 'utilities', '{house,apartment,commercial,office,industrial,warehouse,mixed_use}', 8),
  ('internet_ready', 'Internet ready (fibre or cable)', 'utilities', '{house,apartment,commercial,office,retail,mixed_use}', 9),
  ('security_guard', 'Security guard', 'security', '{house,apartment,commercial,office,retail,industrial,warehouse,mixed_use}', 1),
  ('cctv', 'CCTV', 'security', '{house,apartment,commercial,office,retail,industrial,warehouse,mixed_use}', 2),
  ('gated_community', 'Gated community', 'security', '{house,apartment,land}', 3),
  ('perimeter_wall', 'Perimeter wall or fence', 'security', '{house,commercial,industrial,warehouse,mixed_use,land}', 4),
  ('air_conditioning', 'Air conditioning', 'comfort', '{house,apartment,commercial,office,retail,mixed_use}', 1),
  ('fitted_kitchen', 'Fitted kitchen', 'comfort', '{house,apartment}', 2),
  ('wardrobes', 'Built-in wardrobes', 'comfort', '{house,apartment}', 3),
  ('balcony', 'Balcony', 'comfort', '{house,apartment,office}', 4),
  ('garden', 'Garden', 'comfort', '{house,apartment}', 5),
  ('boys_quarters', 'Boys'' quarters', 'comfort', '{house}', 6),
  ('swimming_pool', 'Swimming pool', 'facilities', '{house,apartment,commercial}', 1),
  ('gym', 'Gym', 'facilities', '{house,apartment,commercial,office}', 2),
  ('elevator', 'Lift', 'facilities', '{apartment,commercial,office,retail,mixed_use}', 3),
  ('conference_room', 'Conference room', 'facilities', '{office,commercial}', 4),
  ('loading_bay', 'Loading bay', 'facilities', '{industrial,warehouse,retail,commercial}', 5),
  ('tarred_road_access', 'Tarred road access', 'access', '{house,apartment,land,commercial,office,retail,industrial,warehouse,mixed_use}', 1),
  ('wheelchair_access', 'Step-free access', 'access', '{house,apartment,commercial,office,retail,mixed_use}', 2),
  ('truck_access', 'Truck access', 'access', '{land,industrial,warehouse,commercial}', 3);

alter table public.property_subtypes enable row level security;
alter table public.amenity_definitions enable row level security;
create policy "subtypes: readable" on public.property_subtypes for select to anon, authenticated using (true);
create policy "amenities: readable" on public.amenity_definitions for select to anon, authenticated using (true);
revoke all on public.property_subtypes, public.amenity_definitions from anon, authenticated;
grant select on public.property_subtypes, public.amenity_definitions to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Property details
-- ---------------------------------------------------------------------------
alter table public.properties
  add column subtype text,
  add column furnishing public.furnishing,
  add column condition public.property_condition,
  add column completion_status public.completion_status,
  add column parking_spaces smallint check (parking_spaces between 0 and 500),
  add constraint properties_subtype_fkey foreign key (type, subtype) references public.property_subtypes (type, code);

grant select (subtype, furnishing, condition, completion_status, parking_spaces) on public.properties to anon, authenticated;

create table public.property_amenities (
  property_id uuid not null references public.properties (id) on delete cascade,
  amenity_code text not null references public.amenity_definitions (code),
  primary key (property_id, amenity_code)
);
alter table public.property_amenities enable row level security;
create policy "property amenities: visible with property" on public.property_amenities
  for select to anon, authenticated
  using (exists (select 1 from public.properties p where p.id = property_amenities.property_id));
revoke all on public.property_amenities from anon, authenticated;
grant select on public.property_amenities to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Listing reference numbers and availability
-- ---------------------------------------------------------------------------
-- Short, readable and unambiguous (no 0/O, 1/I/L): e.g. PQ-7K3M2X.
create function private.new_listing_reference() returns text
language plpgsql volatile set search_path = '' as $$
declare
  v_alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  v_ref text;
  v_bytes bytea;
begin
  loop
    v_bytes := extensions.gen_random_bytes(6);
    v_ref := 'PQ-';
    for i in 0..5 loop
      v_ref := v_ref || substr(v_alphabet, (get_byte(v_bytes, i) % 31) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.property_listings where reference = v_ref);
  end loop;
  return v_ref;
end;
$$;

alter table public.property_listings
  add column reference text,
  add column negotiable boolean not null default false,
  add column availability_confirmed_at timestamptz,
  add column availability_method public.availability_method,
  add constraint property_listings_availability_pair check ((availability_confirmed_at is null) = (availability_method is null));


grant select (reference, negotiable, availability_confirmed_at, availability_method) on public.property_listings to anon, authenticated;

-- Every availability confirmation is kept, so the public date can be traced to who confirmed it and how.
create table public.availability_checks (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.property_listings (id) on delete cascade,
  method public.availability_method not null,
  confirmed_by uuid references public.profiles (id) on delete set null,
  confirmed_at timestamptz not null default now(),
  note text check (note is null or char_length(note) <= 300)
);
create index availability_checks_listing_idx on public.availability_checks (listing_id, confirmed_at desc);
alter table public.availability_checks enable row level security;
create policy "availability checks: members read" on public.availability_checks
  for select to authenticated
  using (exists (select 1 from public.property_listings l where l.id = availability_checks.listing_id and private.is_org_member(l.organization_id)));
create policy "availability checks: staff read" on public.availability_checks
  for select to authenticated
  using (private.is_staff(array['moderator', 'verification_reviewer', 'platform_admin']::public.staff_role[]));
revoke all on public.availability_checks from anon, authenticated;
grant select on public.availability_checks to authenticated;

-- ---------------------------------------------------------------------------
-- listing_cards: new columns appended (existing columns unchanged, so existing queries keep working)
-- ---------------------------------------------------------------------------
create or replace view public.listing_cards with (security_invoker = true) as
  select l.id, l.slug, l.title, l.purpose, l.asking_price, l.currency, l.price_period, l.status,
         l.published_at, l.expires_at, l.is_sponsored, l.organization_id,
         p.type as property_type, p.region, p.city, p.locality, p.bedrooms, p.bathrooms,
         p.floor_area, p.floor_area_unit, p.land_area, p.land_area_unit,
         o.name as organization_name, o.slug as organization_slug,
         o.verification_status as organization_verification_status,
         o.verification_scope as organization_verification_scope,
         cover.storage_path as cover_path, cover.alt_text as cover_alt,
         cover.is_render as cover_is_render, cover.is_virtually_staged as cover_is_staged,
         (select count(*) from public.property_media m where m.listing_id = l.id and m.hidden_at is null and m.media_type = 'image') as image_count,
         l.reference, l.negotiable, l.availability_confirmed_at, l.availability_method,
         p.subtype, p.furnishing, p.completion_status
    from public.property_listings l
    join public.properties p on p.id = l.property_id
    join public.organizations o on o.id = l.organization_id
    left join lateral (
      select m.storage_path, m.alt_text, m.is_render, m.is_virtually_staged
        from public.property_media m
       where m.listing_id = l.id and m.hidden_at is null and m.media_type = 'image'
       order by m.sort_order, m.created_at
       limit 1
    ) cover on true;
