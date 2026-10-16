-- Phase 2: listing workflow functions. Every state change is validated here and audited.

create function private.require_listing_editor(p_listing uuid, p_statuses public.listing_status[])
returns public.property_listings
language plpgsql stable security definer set search_path = '' as $$
declare
  v public.property_listings;
begin
  perform private.require_active_verified_user();
  select * into v from public.property_listings where id = p_listing;
  if not found or not private.has_org_role(v.organization_id, array['owner', 'admin', 'listing_manager']::public.org_role[]) then
    raise exception 'not permitted' using errcode = '42501';
  end if;
  if p_statuses is not null and not (v.status = any (p_statuses)) then
    raise exception 'listing is %, which does not allow this action', v.status using errcode = '55000';
  end if;
  return v;
end;
$$;

create function private.slugify(p text) returns text
language sql immutable set search_path = '' as $$
  select left(trim(both '-' from regexp_replace(lower(p), '[^a-z0-9]+', '-', 'g')), 70);
$$;

-- Applies the editable fields from a JSON payload to a listing and its property.
create function private.apply_listing_payload(p_listing uuid, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_property uuid;
begin
  select property_id into v_property from public.property_listings where id = p_listing;

  update public.properties set
    type = (p ->> 'property_type')::public.property_type,
    region = p ->> 'region',
    city = p ->> 'city',
    locality = nullif(p ->> 'locality', ''),
    address_private = nullif(p ->> 'address_private', ''),
    latitude = nullif(p ->> 'latitude', '')::numeric,
    longitude = nullif(p ->> 'longitude', '')::numeric,
    bedrooms = nullif(p ->> 'bedrooms', '')::smallint,
    bathrooms = nullif(p ->> 'bathrooms', '')::smallint,
    floor_area = nullif(p ->> 'floor_area', '')::numeric,
    floor_area_unit = nullif(p ->> 'floor_area_unit', '')::public.area_unit,
    land_area = nullif(p ->> 'land_area', '')::numeric,
    land_area_unit = nullif(p ->> 'land_area_unit', '')::public.area_unit
  where id = v_property;

  update public.property_listings set
    title = p ->> 'title',
    description = nullif(p ->> 'description', ''),
    purpose = (p ->> 'purpose')::public.listing_purpose,
    asking_price = (p ->> 'asking_price')::numeric,
    currency = upper(coalesce(nullif(p ->> 'currency', ''), 'GHS')),
    price_period = coalesce(nullif(p ->> 'price_period', ''), 'total')::public.price_period
  where id = p_listing;
end;
$$;

create function public.create_listing(p_org uuid, p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_property uuid;
  v_listing uuid;
  v_slug text;
begin
  perform private.require_active_verified_user();
  if not private.has_org_role(p_org, array['owner', 'admin', 'listing_manager']::public.org_role[]) then
    raise exception 'not permitted' using errcode = '42501';
  end if;
  if not public.check_rate_limit('listing.create', 50, 86400) then
    raise exception 'rate limit exceeded' using errcode = '54000';
  end if;

  v_slug := coalesce(nullif(private.slugify(p ->> 'title'), ''), 'listing') || '-'
            || substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 6);

  insert into public.properties (organization_id, type, region, city)
  values (p_org, (p ->> 'property_type')::public.property_type, p ->> 'region', p ->> 'city')
  returning id into v_property;

  insert into public.property_listings (property_id, organization_id, slug, title, purpose, asking_price, currency, price_period, created_by)
  values (v_property, p_org, v_slug, p ->> 'title', (p ->> 'purpose')::public.listing_purpose,
          (p ->> 'asking_price')::numeric, upper(coalesce(nullif(p ->> 'currency', ''), 'GHS')),
          coalesce(nullif(p ->> 'price_period', ''), 'total')::public.price_period, auth.uid())
  returning id into v_listing;

  perform private.apply_listing_payload(v_listing, p);
  perform private.audit('listing.create', 'property_listing', v_listing, p_org, null, p - 'address_private');
  return v_listing;
end;
$$;

create function public.update_listing(p_listing uuid, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v public.property_listings;
begin
  v := private.require_listing_editor(p_listing, array['draft', 'changes_requested']::public.listing_status[]);
  perform private.apply_listing_payload(p_listing, p);
  perform private.audit('listing.update', 'property_listing', p_listing, v.organization_id, null, p - 'address_private');
end;
$$;

-- Full editable view of a listing (including the private address) for its organisation.
create function public.get_listing_for_edit(p_listing uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v jsonb;
begin
  select jsonb_build_object(
           'id', l.id, 'slug', l.slug, 'status', l.status, 'organization_id', l.organization_id,
           'title', l.title, 'description', l.description, 'purpose', l.purpose,
           'asking_price', l.asking_price, 'currency', l.currency, 'price_period', l.price_period,
           'published_at', l.published_at, 'expires_at', l.expires_at, 'submitted_at', l.submitted_at,
           'property_type', p.type, 'region', p.region, 'city', p.city, 'locality', p.locality,
           'address_private', p.address_private, 'latitude', p.latitude, 'longitude', p.longitude,
           'bedrooms', p.bedrooms, 'bathrooms', p.bathrooms,
           'floor_area', p.floor_area, 'floor_area_unit', p.floor_area_unit,
           'land_area', p.land_area, 'land_area_unit', p.land_area_unit)
    into v
    from public.property_listings l join public.properties p on p.id = l.property_id
   where l.id = p_listing and private.is_org_member(l.organization_id);
  if v is null then
    raise exception 'not permitted' using errcode = '42501';
  end if;
  return v;
end;
$$;

create function public.add_listing_media(
  p_listing uuid, p_path text, p_alt text, p_is_render boolean, p_is_staged boolean,
  p_width integer default null, p_height integer default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v public.property_listings;
  v_id uuid;
  v_count integer;
begin
  v := private.require_listing_editor(p_listing, array['draft', 'changes_requested']::public.listing_status[]);
  if p_path is null or split_part(p_path, '/', 1) <> v.organization_id::text or split_part(p_path, '/', 2) <> p_listing::text then
    raise exception 'invalid media path' using errcode = '22023';
  end if;
  select count(*) into v_count from public.property_media where listing_id = p_listing and hidden_at is null;
  if v_count >= 30 then
    raise exception 'a listing can have at most 30 photos' using errcode = '54000';
  end if;
  insert into public.property_media (listing_id, organization_id, storage_path, alt_text, is_render, is_virtually_staged, width, height, sort_order)
  values (p_listing, v.organization_id, p_path, nullif(p_alt, ''), coalesce(p_is_render, false), coalesce(p_is_staged, false),
          p_width, p_height, v_count)
  returning id into v_id;
  perform private.audit('listing.media_add', 'property_media', v_id, v.organization_id, null,
    jsonb_build_object('listing_id', p_listing, 'is_render', p_is_render, 'is_virtually_staged', p_is_staged));
  return v_id;
end;
$$;

-- Hides a photo (kept for audit); editors can only do this before review.
create function public.hide_listing_media(p_media uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_listing uuid;
  v public.property_listings;
begin
  select listing_id into v_listing from public.property_media where id = p_media and hidden_at is null;
  if v_listing is null then
    raise exception 'not found' using errcode = 'P0002';
  end if;
  v := private.require_listing_editor(v_listing, array['draft', 'changes_requested']::public.listing_status[]);
  update public.property_media set hidden_at = now() where id = p_media;
  perform private.audit('listing.media_hide', 'property_media', p_media, v.organization_id, null, null);
end;
$$;

create function public.set_listing_cover(p_media uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_listing uuid;
  v public.property_listings;
begin
  select listing_id into v_listing from public.property_media where id = p_media and hidden_at is null;
  if v_listing is null then
    raise exception 'not found' using errcode = 'P0002';
  end if;
  v := private.require_listing_editor(v_listing, array['draft', 'changes_requested']::public.listing_status[]);
  update public.property_media
     set sort_order = case when id = p_media then 0 else sort_order + 1 end
   where listing_id = v_listing and hidden_at is null;
  perform private.audit('listing.media_cover', 'property_media', p_media, v.organization_id, null, null);
end;
$$;

create function public.submit_listing(p_listing uuid) returns void
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
  perform private.audit('listing.submit', 'property_listing', p_listing, v.organization_id,
    jsonb_build_object('status', v.status), jsonb_build_object('status', 'submitted'));
end;
$$;

-- Moderators decide on submitted listings. They may not review their own organisation's listings.
create function public.review_listing(
  p_listing uuid, p_decision public.review_status, p_reason_code text, p_provider_message text, p_internal_notes text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v public.property_listings;
  v_next public.listing_status;
begin
  if not private.is_staff(array['moderator', 'platform_admin']::public.staff_role[]) then
    raise exception 'not permitted' using errcode = '42501';
  end if;
  select * into v from public.property_listings where id = p_listing for update;
  if not found then
    raise exception 'not found' using errcode = 'P0002';
  end if;
  if v.status <> 'submitted' then
    raise exception 'only submitted listings can be reviewed' using errcode = '55000';
  end if;
  if exists (select 1 from public.organization_members where organization_id = v.organization_id and user_id = auth.uid()) then
    raise exception 'you cannot review your own organisation''s listing' using errcode = '42501';
  end if;
  if p_decision = 'pending' then
    raise exception 'choose a decision' using errcode = '22023';
  end if;
  if p_decision <> 'approved' and coalesce(trim(p_provider_message), '') = '' then
    raise exception 'tell the provider what to change' using errcode = '22023';
  end if;

  v_next := case p_decision when 'approved' then 'approved' when 'changes_requested' then 'changes_requested' else 'rejected' end;
  update public.property_listings
     set status = v_next, approved_at = case when v_next = 'approved' then now() else approved_at end
   where id = p_listing;
  update public.listing_reviews
     set status = p_decision, reviewer_id = auth.uid(), reason_code = nullif(p_reason_code, ''),
         provider_message = nullif(p_provider_message, ''), internal_notes = nullif(p_internal_notes, ''),
         reviewed_at = now()
   where listing_id = p_listing and status = 'pending';
  perform private.audit('listing.review', 'property_listing', p_listing, v.organization_id,
    jsonb_build_object('status', v.status),
    jsonb_build_object('status', v_next, 'decision', p_decision, 'reason_code', p_reason_code));
end;
$$;

-- Staff-only review history including internal notes.
create function public.get_listing_review_history(p_listing uuid)
returns table (id uuid, status public.review_status, reason_code text, provider_message text, internal_notes text,
               reviewer_name text, submitted_at timestamptz, reviewed_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_staff(array['moderator', 'platform_admin']::public.staff_role[]) then
    raise exception 'not permitted' using errcode = '42501';
  end if;
  return query
    select r.id, r.status, r.reason_code, r.provider_message, r.internal_notes, pr.display_name, r.submitted_at, r.reviewed_at
      from public.listing_reviews r left join public.profiles pr on pr.id = r.reviewer_id
     where r.listing_id = p_listing
     order by r.submitted_at desc;
end;
$$;

-- Publishing requires an approved listing AND a verified organisation (paid status never counts).
create function public.publish_listing(p_listing uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v public.property_listings;
  v_verified boolean;
begin
  v := private.require_listing_editor(p_listing, array['approved', 'paused']::public.listing_status[]);
  select verification_status = 'verified' and (verification_expires_at is null or verification_expires_at > now())
    into v_verified from public.organizations where id = v.organization_id;
  if not coalesce(v_verified, false) then
    raise exception 'your organisation must be verified before listings can be published' using errcode = '42501';
  end if;
  update public.property_listings
     set status = 'published',
         published_at = coalesce(published_at, now()),
         expires_at = greatest(coalesce(expires_at, now()), now()) + interval '90 days'
   where id = p_listing;
  perform private.audit('listing.publish', 'property_listing', p_listing, v.organization_id,
    jsonb_build_object('status', v.status), jsonb_build_object('status', 'published'));
end;
$$;

create function public.set_listing_status(p_listing uuid, p_status public.listing_status) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v public.property_listings;
begin
  v := private.require_listing_editor(p_listing, null);
  if not (
       (v.status = 'published' and p_status in ('paused', 'sold', 'rented', 'archived'))
    or (v.status = 'paused' and p_status in ('sold', 'rented', 'archived'))
    or (v.status in ('draft', 'changes_requested', 'rejected', 'expired', 'approved') and p_status = 'archived')
  ) then
    raise exception 'cannot change a % listing to %', v.status, p_status using errcode = '55000';
  end if;
  update public.property_listings set status = p_status where id = p_listing;
  perform private.audit('listing.status', 'property_listing', p_listing, v.organization_id,
    jsonb_build_object('status', v.status), jsonb_build_object('status', p_status));
end;
$$;

-- Platform admins record a scoped organisation verification decision.
create function public.set_organization_verification(
  p_org uuid, p_status public.verification_status, p_scope text, p_expires_at timestamptz
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v public.organizations;
begin
  if not private.is_staff(array['platform_admin']::public.staff_role[]) then
    raise exception 'not permitted' using errcode = '42501';
  end if;
  select * into v from public.organizations where id = p_org for update;
  if not found then
    raise exception 'not found' using errcode = 'P0002';
  end if;
  if p_status = 'verified' and coalesce(trim(p_scope), '') = '' then
    raise exception 'describe what was verified' using errcode = '22023';
  end if;
  update public.organizations
     set verification_status = p_status,
         verification_scope = case when p_status = 'verified' then p_scope else verification_scope end,
         verified_at = case when p_status = 'verified' then now() else verified_at end,
         verification_expires_at = case when p_status = 'verified' then p_expires_at else verification_expires_at end
   where id = p_org;
  perform private.audit('organization.verification', 'organization', p_org, p_org,
    jsonb_build_object('status', v.verification_status),
    jsonb_build_object('status', p_status, 'scope', p_scope, 'expires_at', p_expires_at));
end;
$$;

-- Marks published listings past their expiry as expired (run on a schedule).
create function public.expire_listings() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
begin
  update public.property_listings set status = 'expired'
   where status = 'published' and expires_at is not null and expires_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Privileges ----------------------------------------------------------------
revoke all on function public.create_listing(uuid, jsonb) from public, anon;
grant execute on function public.create_listing(uuid, jsonb) to authenticated;
revoke all on function public.update_listing(uuid, jsonb) from public, anon;
grant execute on function public.update_listing(uuid, jsonb) to authenticated;
revoke all on function public.get_listing_for_edit(uuid) from public, anon;
grant execute on function public.get_listing_for_edit(uuid) to authenticated;
revoke all on function public.add_listing_media(uuid, text, text, boolean, boolean, integer, integer) from public, anon;
grant execute on function public.add_listing_media(uuid, text, text, boolean, boolean, integer, integer) to authenticated;
revoke all on function public.hide_listing_media(uuid) from public, anon;
grant execute on function public.hide_listing_media(uuid) to authenticated;
revoke all on function public.set_listing_cover(uuid) from public, anon;
grant execute on function public.set_listing_cover(uuid) to authenticated;
revoke all on function public.submit_listing(uuid) from public, anon;
grant execute on function public.submit_listing(uuid) to authenticated;
revoke all on function public.review_listing(uuid, public.review_status, text, text, text) from public, anon;
grant execute on function public.review_listing(uuid, public.review_status, text, text, text) to authenticated;
revoke all on function public.get_listing_review_history(uuid) from public, anon;
grant execute on function public.get_listing_review_history(uuid) to authenticated;
revoke all on function public.publish_listing(uuid) from public, anon;
grant execute on function public.publish_listing(uuid) to authenticated;
revoke all on function public.set_listing_status(uuid, public.listing_status) from public, anon;
grant execute on function public.set_listing_status(uuid, public.listing_status) to authenticated;
revoke all on function public.set_organization_verification(uuid, public.verification_status, text, timestamptz) from public, anon;
grant execute on function public.set_organization_verification(uuid, public.verification_status, text, timestamptz) to authenticated;
revoke all on function public.expire_listings() from public, anon, authenticated;
revoke all on function private.apply_listing_payload(uuid, jsonb) from public, anon, authenticated;
revoke all on function private.require_listing_editor(uuid, public.listing_status[]) from public, anon, authenticated;
