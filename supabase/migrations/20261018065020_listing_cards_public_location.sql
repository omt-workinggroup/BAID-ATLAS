-- Map search: expose the rounded public position (about 1 km) on listing cards. The exact
-- coordinates and address stay private; only public_latitude/public_longitude are readable.
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
         p.subtype, p.furnishing, p.completion_status,
         p.public_latitude, p.public_longitude
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
