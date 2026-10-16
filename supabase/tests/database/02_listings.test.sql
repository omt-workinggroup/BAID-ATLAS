-- Phase 2: listings, moderation, publishing, visibility, saved listings and media storage rules.
-- Personas: vera (owner, org will be verified), uma (owner, unverified org), mo (moderator),
-- ada (platform admin), sam (signed-in shopper), anonymous visitor.
begin;
select plan(40);

create schema tests;
grant usage on schema tests to anon, authenticated;
create function tests.login(p_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_id::text, true);
  execute 'set local role authenticated';
end;
$$;
create function tests.logout() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
end;
$$;
create function tests.anon() returns void language plpgsql as $$
begin
  perform tests.logout();
  execute 'set local role anon';
end;
$$;
grant execute on all functions in schema tests to anon, authenticated;

insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'vera@example.test', now()),
  ('00000000-0000-0000-0000-0000000000a2', 'uma@example.test',  now()),
  ('00000000-0000-0000-0000-0000000000a3', 'mo@example.test',   now()),
  ('00000000-0000-0000-0000-0000000000a4', 'ada@example.test',  now()),
  ('00000000-0000-0000-0000-0000000000a5', 'sam@example.test',  now());
insert into public.staff_roles (user_id, role) values
  ('00000000-0000-0000-0000-0000000000a3', 'moderator'),
  ('00000000-0000-0000-0000-0000000000a4', 'platform_admin');

create temp table ctx (k text primary key, v uuid);
grant select, insert, update on ctx to authenticated, anon;

create function tests.payload(p_title text) returns jsonb language sql as $$
  select jsonb_build_object(
    'title', p_title, 'description', 'A bright three-bedroom family home close to schools, shops and the main road.',
    'purpose', 'sale', 'property_type', 'house', 'region', 'Greater Accra', 'city', 'Accra', 'locality', 'East Legon',
    'address_private', '12 Private Lane', 'latitude', '5.636512', 'longitude', '-0.161234',
    'bedrooms', '3', 'bathrooms', '2', 'floor_area', '180', 'floor_area_unit', 'sqm',
    'asking_price', '1250000', 'currency', 'GHS', 'price_period', 'total');
$$;
grant execute on function tests.payload(text) to authenticated;

-- Organisations -----------------------------------------------------------------
select tests.login('00000000-0000-0000-0000-0000000000a1');
insert into ctx values ('vera_org', public.create_organization('Vera Homes', 'vera-homes', 'agency'));
select tests.login('00000000-0000-0000-0000-0000000000a2');
insert into ctx values ('uma_org', public.create_organization('Uma Estates', 'uma-estates', 'landlord'));

-- Create and edit ---------------------------------------------------------------
select tests.login('00000000-0000-0000-0000-0000000000a1');
insert into ctx values ('l1', public.create_listing((select v from ctx where k = 'vera_org'), tests.payload('Family home in East Legon')));
select is((select status::text from public.property_listings where id = (select v from ctx where k = 'l1')), 'draft',
  'new listings start as drafts');
select ok((select slug::text from public.property_listings where id = (select v from ctx where k = 'l1')) like 'family-home-in-east-legon-%',
  'slug is generated from the title');
select is((public.get_listing_for_edit((select v from ctx where k = 'l1')) ->> 'address_private'), '12 Private Lane',
  'members can read the private address through the edit function');
select throws_ok('select address_private from public.properties', '42501', null, 'private address column is never selectable');
select throws_ok('select latitude from public.properties', '42501', null, 'exact coordinates are never selectable');
select is((select public_latitude from public.properties limit 1), 5.64::numeric(6,2), 'public coordinates are rounded');
select throws_ok($$update public.property_listings set status = 'published'$$, '42501', null,
  'status cannot be written directly');
select throws_ok($$select public.submit_listing((select v from ctx where k = 'l1'))$$, '23514', null,
  'cannot submit without a photo');
select throws_ok(
  $$select public.add_listing_media((select v from ctx where k = 'l1'), 'wrong/path/photo.webp', 'x', false, false)$$,
  '22023', null, 'media path must belong to the listing');
select lives_ok(
  format($$select public.add_listing_media(%L, %L, 'Front of house', false, false, 1600, 1067)$$,
         (select v from ctx where k = 'l1'),
         (select v from ctx where k = 'vera_org') || '/' || (select v from ctx where k = 'l1') || '/front.webp'),
  'editor adds a photo');
select lives_ok($$select public.submit_listing((select v from ctx where k = 'l1'))$$, 'editor submits for review');
select throws_ok($$select public.update_listing((select v from ctx where k = 'l1'), tests.payload('Changed title here'))$$,
  '55000', null, 'submitted listings are locked for editing');

-- Visibility before publishing ------------------------------------------------------
select tests.anon();
select is((select count(*)::int from public.listing_cards), 0, 'anonymous visitors see no unpublished listings');
select is((select count(*)::int from public.property_media), 0, 'anonymous visitors see no unpublished media');
select tests.login('00000000-0000-0000-0000-0000000000a2');
select is((select count(*)::int from public.property_listings), 0, 'other organisations cannot see the draft');
select throws_ok($$select public.get_listing_for_edit((select v from ctx where k = 'l1'))$$, '42501', null,
  'other organisations cannot open the edit view');
select throws_ok($$select public.update_listing((select v from ctx where k = 'l1'), tests.payload('Hijacked title'))$$,
  '42501', null, 'other organisations cannot edit');

-- Moderation -------------------------------------------------------------------------
select throws_ok($$select public.review_listing((select v from ctx where k = 'l1'), 'approved', null, null, null)$$,
  '42501', null, 'non-moderators cannot review');
select tests.login('00000000-0000-0000-0000-0000000000a3');
select is((select count(*)::int from public.listing_reviews where status = 'pending'), 1, 'moderator sees the review queue');
select throws_ok($$select public.review_listing((select v from ctx where k = 'l1'), 'changes_requested', 'photos', '', null)$$,
  '22023', null, 'requesting changes needs a message for the provider');
select lives_ok($$select public.review_listing((select v from ctx where k = 'l1'), 'approved', null, null, 'Checked photos against street view')$$,
  'moderator approves');
select is((select count(*)::int from public.get_listing_review_history((select v from ctx where k = 'l1')) where internal_notes is not null), 1,
  'moderators can read internal notes');
select tests.login('00000000-0000-0000-0000-0000000000a1');
select throws_ok('select internal_notes from public.listing_reviews', '42501', null, 'providers cannot read internal notes');
select is((select status::text from public.listing_reviews where listing_id = (select v from ctx where k = 'l1')), 'approved',
  'providers can see the review outcome');

-- Publishing requires verification ---------------------------------------------------
select throws_ok($$select public.publish_listing((select v from ctx where k = 'l1'))$$, '42501', null,
  'unverified organisations cannot publish');
select throws_ok($$select public.set_organization_verification((select v from ctx where k = 'vera_org'), 'verified', 'Business registration', null)$$,
  '42501', null, 'organisations cannot verify themselves');
select tests.login('00000000-0000-0000-0000-0000000000a4');
select throws_ok($$select public.set_organization_verification((select v from ctx where k = 'vera_org'), 'verified', '', null)$$,
  '22023', null, 'verification requires a stated scope');
select lives_ok($$select public.set_organization_verification((select v from ctx where k = 'vera_org'), 'verified',
                  'Business registration matches organisation name', now() + interval '1 year')$$, 'admin verifies with scope');
select tests.login('00000000-0000-0000-0000-0000000000a1');
select lives_ok($$select public.publish_listing((select v from ctx where k = 'l1'))$$, 'verified organisation publishes');

select tests.anon();
select is((select count(*)::int from public.listing_cards), 1, 'published listing is public');
select is((select organization_verification_scope from public.listing_cards), 'Business registration matches organisation name',
  'public card carries the verification scope');
select is((select count(*)::int from public.property_media), 1, 'published media is public');

-- Saved listings ---------------------------------------------------------------------
select tests.login('00000000-0000-0000-0000-0000000000a5');
select lives_ok($$insert into public.saved_listings (user_id, listing_id) values (auth.uid(), (select v from ctx where k = 'l1'))$$,
  'shopper saves a published listing');
select throws_ok($$insert into public.saved_listings (user_id, listing_id) values ('00000000-0000-0000-0000-0000000000a1', (select v from ctx where k = 'l1'))$$,
  '42501', null, 'cannot save on behalf of someone else');

-- Lifecycle and expiry ---------------------------------------------------------------
select tests.login('00000000-0000-0000-0000-0000000000a1');
select throws_ok($$select public.set_listing_status((select v from ctx where k = 'l1'), 'draft')$$, '55000', null,
  'published listings cannot go back to draft');
select tests.logout();
update public.property_listings set expires_at = now() - interval '1 minute' where id = (select v from ctx where k = 'l1');
select tests.anon();
select is((select count(*)::int from public.listing_cards), 0, 'expired listings disappear from public results');
select tests.logout();
select is(public.expire_listings(), 1, 'expiry job marks expired listings');

select is((select count(*)::int from public.audit_log where action in
  ('listing.create', 'listing.submit', 'listing.review', 'listing.publish', 'organization.verification')), 5,
  'listing workflow and verification are audited');

-- Storage rules ----------------------------------------------------------------------
select tests.login('00000000-0000-0000-0000-0000000000a2');
select throws_ok(
  format($$insert into storage.objects (bucket_id, name) values ('listing-media', %L)$$,
         (select v from ctx where k = 'vera_org') || '/' || (select v from ctx where k = 'l1') || '/sneaky.webp'),
  '42501', null, 'cannot upload into another organisation''s listing folder');
select tests.login('00000000-0000-0000-0000-0000000000a1');
insert into ctx values ('l2', public.create_listing((select v from ctx where k = 'vera_org'), tests.payload('Second listing for upload')));
select lives_ok(
  format($$insert into storage.objects (bucket_id, name) values ('listing-media', %L)$$,
         (select v from ctx where k = 'vera_org') || '/' || (select v from ctx where k = 'l2') || '/photo.webp'),
  'editor can upload into their draft listing folder');
select tests.logout();

select * from finish();
rollback;
