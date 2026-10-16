-- Phase 2: row level security, column grants and public-safe card view for listings.

create function private.is_staff(p_roles public.staff_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_active_user() and exists (
    select 1 from public.staff_roles where user_id = auth.uid() and role = any (p_roles)
  );
$$;

-- A listing is publicly visible when published, unexpired and its organisation is active.
create function private.listing_is_public(p_listing uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
      from public.property_listings l
      join public.organizations o on o.id = l.organization_id
     where l.id = p_listing
       and l.status = 'published'
       and (l.expires_at is null or l.expires_at > now())
       and o.status = 'active'
  );
$$;

alter table public.properties enable row level security;
alter table public.property_listings enable row level security;
alter table public.property_media enable row level security;
alter table public.listing_reviews enable row level security;
alter table public.saved_listings enable row level security;

-- properties ---------------------------------------------------------------
create policy "properties: public when listed" on public.properties
  for select to anon, authenticated
  using (exists (select 1 from public.property_listings l where l.property_id = properties.id and private.listing_is_public(l.id)));
create policy "properties: members read" on public.properties
  for select to authenticated using (private.is_org_member(organization_id));
create policy "properties: moderators read" on public.properties
  for select to authenticated using (private.is_staff(array['moderator', 'platform_admin']::public.staff_role[]));

revoke all on public.properties from anon, authenticated;
-- Exact address and coordinates are never selectable through the API.
grant select (id, organization_id, type, country_code, region, city, locality, public_latitude, public_longitude,
              bedrooms, bathrooms, floor_area, floor_area_unit, land_area, land_area_unit, created_at, updated_at)
  on public.properties to anon, authenticated;

-- property_listings --------------------------------------------------------
create policy "listings: public when published" on public.property_listings
  for select to anon, authenticated using (private.listing_is_public(id));
create policy "listings: members read" on public.property_listings
  for select to authenticated using (private.is_org_member(organization_id));
create policy "listings: moderators read" on public.property_listings
  for select to authenticated using (private.is_staff(array['moderator', 'platform_admin']::public.staff_role[]));

revoke all on public.property_listings from anon, authenticated;
grant select (id, property_id, organization_id, slug, title, description, purpose, asking_price, currency,
              price_period, status, submitted_at, approved_at, published_at, expires_at, is_sponsored,
              created_at, updated_at)
  on public.property_listings to anon, authenticated;

-- property_media -----------------------------------------------------------
create policy "media: visible with listing" on public.property_media
  for select to anon, authenticated
  using (
    (hidden_at is null and private.listing_is_public(listing_id))
    or private.is_org_member(organization_id)
    or private.is_staff(array['moderator', 'platform_admin']::public.staff_role[])
  );
revoke all on public.property_media from anon, authenticated;
grant select on public.property_media to anon, authenticated;

-- listing_reviews ----------------------------------------------------------
create policy "reviews: members read outcome" on public.listing_reviews
  for select to authenticated
  using (exists (select 1 from public.property_listings l
                  where l.id = listing_id and private.is_org_member(l.organization_id)));
create policy "reviews: moderators read" on public.listing_reviews
  for select to authenticated using (private.is_staff(array['moderator', 'platform_admin']::public.staff_role[]));
revoke all on public.listing_reviews from anon, authenticated;
-- internal_notes is deliberately not granted; staff read it through review functions.
grant select (id, listing_id, status, reason_code, provider_message, submitted_at, reviewed_at)
  on public.listing_reviews to authenticated;

-- saved_listings -----------------------------------------------------------
create policy "saved: own rows" on public.saved_listings
  for select to authenticated using (user_id = auth.uid());
create policy "saved: add visible listings" on public.saved_listings
  for insert to authenticated
  with check (user_id = auth.uid() and private.is_active_user() and private.listing_is_public(listing_id));
revoke all on public.saved_listings from anon, authenticated;
grant select, insert on public.saved_listings to authenticated;

-- Public listing cards: one row per visible listing with display-ready fields.
create view public.listing_cards with (security_invoker = true) as
  select l.id, l.slug, l.title, l.purpose, l.asking_price, l.currency, l.price_period, l.status,
         l.published_at, l.expires_at, l.is_sponsored, l.organization_id,
         p.type as property_type, p.region, p.city, p.locality, p.bedrooms, p.bathrooms,
         p.floor_area, p.floor_area_unit, p.land_area, p.land_area_unit,
         o.name as organization_name, o.slug as organization_slug,
         o.verification_status as organization_verification_status,
         o.verification_scope as organization_verification_scope,
         cover.storage_path as cover_path, cover.alt_text as cover_alt,
         cover.is_render as cover_is_render, cover.is_virtually_staged as cover_is_staged,
         (select count(*) from public.property_media m where m.listing_id = l.id and m.hidden_at is null and m.media_type = 'image') as image_count
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
revoke all on public.listing_cards from anon, authenticated;
grant select on public.listing_cards to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private bucket; objects readable when their listing is readable.
-- Path layout: <organization_id>/<listing_id>/<file>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-media', 'listing-media', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

create function private.try_uuid(p text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  return p::uuid;
exception when others then
  return null;
end;
$$;

create function private.can_edit_listing(p_listing uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.property_listings l
     where l.id = p_listing
       and l.status in ('draft', 'changes_requested')
       and private.has_org_role(l.organization_id, array['owner', 'admin', 'listing_manager']::public.org_role[])
  );
$$;

create policy "listing media: editors upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'listing-media'
    and private.can_edit_listing(private.try_uuid((storage.foldername(name))[2]))
    and exists (
      select 1 from public.property_listings l
       where l.id = private.try_uuid((storage.foldername(name))[2])
         and l.organization_id = private.try_uuid((storage.foldername(name))[1])
    )
  );

create policy "listing media: read with listing" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'listing-media'
    and exists (select 1 from public.property_media m where m.storage_path = name)
  );

-- Function privileges for helpers used inside policies.
revoke all on function private.try_uuid(text) from public;
grant execute on function private.try_uuid(text) to anon, authenticated;
