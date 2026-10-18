-- Propertiq: finish the trust/listing-details update (parts 2 and 3).
-- Paste all of this into Supabase -> SQL Editor -> New query, then press Run. It runs as one transaction:
-- if anything fails, nothing changes. It does not delete or overwrite any listing data; it only replaces
-- four functions and gives the existing listing a reference number.

begin;

-- Propertiq slice 1, part 2 of 3: functions for availability confirmations and category-specific listing fields.

create function private.record_availability(p_listing uuid, p_method public.availability_method, p_note text)
returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  v_at timestamptz := now();
begin
  insert into public.availability_checks (listing_id, method, confirmed_by, confirmed_at, note)
  values (p_listing, p_method, auth.uid(), v_at, nullif(btrim(coalesce(p_note, '')), ''));
  update public.property_listings set availability_confirmed_at = v_at, availability_method = p_method where id = p_listing;
  return v_at;
end;
$$;
revoke all on function private.record_availability(uuid, public.availability_method, text) from public, anon, authenticated;

-- Advertisers confirm a live (or paused/approved) listing is still available. Rate-limited per person.
create function public.confirm_listing_availability(p_listing uuid) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  v public.property_listings;
  v_at timestamptz;
begin
  v := private.require_listing_editor(p_listing, array['approved', 'published', 'paused']::public.listing_status[]);
  if not public.check_rate_limit('listing.availability', 60, 86400) then
    raise exception 'rate limit exceeded' using errcode = '54000';
  end if;
  v_at := private.record_availability(p_listing, 'advertiser', null);
  perform private.audit('listing.availability_confirmed', 'property_listing', p_listing, v.organization_id,
    jsonb_build_object('availability_confirmed_at', v.availability_confirmed_at), jsonb_build_object('availability_confirmed_at', v_at));
  return v_at;
end;
$$;
revoke all on function public.confirm_listing_availability(uuid) from public, anon;
grant execute on function public.confirm_listing_availability(uuid) to authenticated;

-- Submitting a listing also states it is available today (the submit screen says so).
create or replace function public.submit_listing(p_listing uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v public.property_listings;
begin
  v := private.require_listing_editor(p_listing, array['draft', 'changes_requested']::public.listing_status[]);
  if not exists (select 1 from public.property_media where listing_id = p_listing and hidden_at is null and media_type = 'image') then
    raise exception 'add at least one photo before submitting' using errcode = '23514';
  end if;
  if v.description is null or char_length(v.description) < 40 then
    raise exception 'add a description of at least 40 characters' using errcode = '23514';
  end if;
  update public.property_listings set status = 'submitted', submitted_at = now() where id = p_listing;
  insert into public.listing_reviews (listing_id, status) values (p_listing, 'pending');
  perform private.record_availability(p_listing, 'advertiser', 'Confirmed when submitted for review');
  perform private.audit('listing.submit', 'property_listing', p_listing, v.organization_id,
    jsonb_build_object('status', v.status), jsonb_build_object('status', 'submitted'));
end;
$$;

-- ---------------------------------------------------------------------------
-- Listing payload: category-specific fields. Fields that don't apply to the type are stored as empty.
-- ---------------------------------------------------------------------------
create or replace function private.apply_listing_payload(p_listing uuid, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_property uuid;
  v_type public.property_type := (p ->> 'property_type')::public.property_type;
  v_residential boolean := v_type in ('house', 'apartment');
  v_land boolean := v_type = 'land';
  v_amenities text[];
begin
  select property_id into v_property from public.property_listings where id = p_listing;

  update public.properties set
    type = v_type,
    subtype = nullif(p ->> 'subtype', ''),
    region = p ->> 'region',
    city = p ->> 'city',
    locality = nullif(p ->> 'locality', ''),
    address_private = nullif(p ->> 'address_private', ''),
    latitude = nullif(p ->> 'latitude', '')::numeric,
    longitude = nullif(p ->> 'longitude', '')::numeric,
    bedrooms = case when v_residential then nullif(p ->> 'bedrooms', '')::smallint end,
    bathrooms = case when v_residential then nullif(p ->> 'bathrooms', '')::smallint end,
    furnishing = case when not v_land then nullif(p ->> 'furnishing', '')::public.furnishing end,
    condition = case when not v_land then nullif(p ->> 'condition', '')::public.property_condition end,
    completion_status = case when not v_land then nullif(p ->> 'completion_status', '')::public.completion_status end,
    parking_spaces = case when not v_land then nullif(p ->> 'parking_spaces', '')::smallint end,
    floor_area = case when not v_land then nullif(p ->> 'floor_area', '')::numeric end,
    floor_area_unit = case when not v_land then nullif(p ->> 'floor_area_unit', '')::public.area_unit end,
    land_area = nullif(p ->> 'land_area', '')::numeric,
    land_area_unit = nullif(p ->> 'land_area_unit', '')::public.area_unit
  where id = v_property;

  update public.property_listings set
    title = p ->> 'title',
    description = nullif(p ->> 'description', ''),
    purpose = (p ->> 'purpose')::public.listing_purpose,
    asking_price = (p ->> 'asking_price')::numeric,
    currency = upper(coalesce(nullif(p ->> 'currency', ''), 'GHS')),
    price_period = coalesce(nullif(p ->> 'price_period', ''), 'total')::public.price_period,
    negotiable = coalesce(nullif(p ->> 'negotiable', '')::boolean, false)
  where id = p_listing;

  -- Amenities: replaced as a set; only codes that apply to this property type are kept.
  if p ? 'amenities' then
    select coalesce(array_agg(value), '{}') into v_amenities from jsonb_array_elements_text(p -> 'amenities');
    delete from public.property_amenities where property_id = v_property;
    insert into public.property_amenities (property_id, amenity_code)
    select v_property, d.code from public.amenity_definitions d
     where d.code = any (v_amenities) and v_type = any (d.applies_to);
  else
    delete from public.property_amenities a using public.amenity_definitions d
     where a.property_id = v_property and d.code = a.amenity_code and not (v_type = any (d.applies_to));
  end if;
end;
$$;

-- Editable view for the organisation, now with the new fields.
create or replace function public.get_listing_for_edit(p_listing uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v jsonb;
begin
  select jsonb_build_object(
           'id', l.id, 'slug', l.slug, 'reference', l.reference, 'status', l.status, 'organization_id', l.organization_id,
           'title', l.title, 'description', l.description, 'purpose', l.purpose,
           'asking_price', l.asking_price, 'currency', l.currency, 'price_period', l.price_period, 'negotiable', l.negotiable,
           'published_at', l.published_at, 'expires_at', l.expires_at, 'submitted_at', l.submitted_at,
           'availability_confirmed_at', l.availability_confirmed_at, 'availability_method', l.availability_method,
           'property_type', p.type, 'subtype', p.subtype, 'region', p.region, 'city', p.city, 'locality', p.locality,
           'address_private', p.address_private, 'latitude', p.latitude, 'longitude', p.longitude,
           'bedrooms', p.bedrooms, 'bathrooms', p.bathrooms,
           'furnishing', p.furnishing, 'condition', p.condition, 'completion_status', p.completion_status,
           'parking_spaces', p.parking_spaces,
           'floor_area', p.floor_area, 'floor_area_unit', p.floor_area_unit,
           'land_area', p.land_area, 'land_area_unit', p.land_area_unit,
           'amenities', coalesce((select jsonb_agg(a.amenity_code order by a.amenity_code)
                                    from public.property_amenities a where a.property_id = p.id), '[]'::jsonb))
    into v
    from public.property_listings l join public.properties p on p.id = l.property_id
   where l.id = p_listing and private.is_org_member(l.organization_id);
  if v is null then
    raise exception 'not permitted' using errcode = '42501';
  end if;
  return v;
end;
$$;

-- Propertiq slice 1, part 3 of 3: give every existing listing a reference number, then make it required.

update public.property_listings set reference = private.new_listing_reference() where reference is null;
alter table public.property_listings
  alter column reference set not null,
  alter column reference set default private.new_listing_reference(),
  add constraint property_listings_reference_format check (reference ~ '^PQ-[2-9A-HJKMNP-Z]{6}$');
create unique index property_listings_reference_key on public.property_listings (reference);

-- Record both steps in the migration history so future deploys know they ran.
insert into supabase_migrations.schema_migrations (version, name) values
  ('20261018060900', 'trust_listing_functions'),
  ('20261018060901', 'listing_reference_backfill');

commit;
