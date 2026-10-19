-- Slice 1: reference numbers, category-specific details, amenities and dated availability confirmations.
-- Personas: vera (owner, org will be verified), uma (owner, unverified org), ada (platform admin),
-- mo (moderator), sam (signed-in, no organisation), anonymous visitor.
begin;
select plan(26);

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
  ('00000000-0000-0000-0000-0000000000c1', 'vera@example.test', now()),
  ('00000000-0000-0000-0000-0000000000c2', 'uma@example.test',  now()),
  ('00000000-0000-0000-0000-0000000000c3', 'mo@example.test',   now()),
  ('00000000-0000-0000-0000-0000000000c4', 'ada@example.test',  now()),
  ('00000000-0000-0000-0000-0000000000c5', 'sam@example.test',  now());
insert into public.staff_roles (user_id, role) values
  ('00000000-0000-0000-0000-0000000000c3', 'moderator'),
  ('00000000-0000-0000-0000-0000000000c4', 'platform_admin');

create temp table ctx (k text primary key, v uuid);
grant select, insert, update on ctx to authenticated, anon;

create function tests.payload(p_title text, p_extra jsonb default '{}') returns jsonb language sql as $$
  select jsonb_build_object(
    'title', p_title, 'description', 'A bright three-bedroom family home close to schools, shops and the main road.',
    'purpose', 'sale', 'property_type', 'house', 'subtype', 'detached', 'region', 'Greater Accra', 'city', 'Accra',
    'locality', 'East Legon', 'bedrooms', '3', 'bathrooms', '2', 'furnishing', 'unfurnished', 'condition', 'good',
    'completion_status', 'completed', 'parking_spaces', '2', 'floor_area', '180', 'floor_area_unit', 'sqm',
    'asking_price', '1250000', 'currency', 'GHS', 'price_period', 'total', 'negotiable', 'true',
    'amenities', jsonb_build_array('borehole', 'boys_quarters', 'loading_bay')) || p_extra;
$$;
grant execute on function tests.payload(text, jsonb) to authenticated;

select tests.login('00000000-0000-0000-0000-0000000000c1');
insert into ctx values ('vera_org', public.create_organization('Vera Homes', 'vera-homes', 'agency'));
select tests.login('00000000-0000-0000-0000-0000000000c2');
insert into ctx values ('uma_org', public.create_organization('Uma Estates', 'uma-estates', 'landlord'));

-- Reference numbers and details ---------------------------------------------------
select tests.login('00000000-0000-0000-0000-0000000000c1');
insert into ctx values ('h1', public.create_listing((select v from ctx where k = 'vera_org'), tests.payload('Detached house in East Legon')));
insert into ctx values ('h2', public.create_listing((select v from ctx where k = 'vera_org'), tests.payload('Second house for reference test')));

select matches((public.get_listing_for_edit((select v from ctx where k = 'h1')) ->> 'reference'), '^PQ-[2-9A-HJKMNP-Z]{6}$',
  'new listings get a readable PQ- reference');
select isnt((public.get_listing_for_edit((select v from ctx where k = 'h1')) ->> 'reference'),
            (public.get_listing_for_edit((select v from ctx where k = 'h2')) ->> 'reference'), 'references are unique');
select is((public.get_listing_for_edit((select v from ctx where k = 'h1')) ->> 'subtype'), 'detached', 'subtype is stored');
select is((public.get_listing_for_edit((select v from ctx where k = 'h1')) -> 'negotiable')::boolean, true, 'negotiable flag is stored');
select is((public.get_listing_for_edit((select v from ctx where k = 'h1')) -> 'amenities'), '["borehole", "boys_quarters"]'::jsonb,
  'amenities that do not apply to a house (loading bay) are dropped');

select throws_ok(
  format($$select public.update_listing(%L, tests.payload('Detached house in East Legon', '{"subtype": "warehouse"}'))$$, (select v from ctx where k = 'h1')),
  '23503', null, 'a subtype from another property type is rejected');

insert into ctx values ('land1', public.create_listing((select v from ctx where k = 'vera_org'),
  tests.payload('Serviced plot in Oyarifa', '{"property_type": "land", "subtype": "residential", "land_area": "1", "land_area_unit": "plot"}')));
select is((select row(bedrooms, bathrooms, furnishing, parking_spaces, floor_area)::text from public.properties
            where id = (select property_id from public.property_listings where id = (select v from ctx where k = 'land1'))),
  '(,,,,)', 'house-only fields are not stored on land');
select is((public.get_listing_for_edit((select v from ctx where k = 'land1')) -> 'amenities'), '["borehole"]'::jsonb,
  'land keeps only land amenities');

-- Direct writes are not possible ------------------------------------------------------
select throws_ok(format($$update public.property_listings set availability_confirmed_at = now() where id = %L$$, (select v from ctx where k = 'h1')),
  '42501', null, 'advertisers cannot write availability dates directly');
select throws_ok(format($$insert into public.availability_checks (listing_id, method) values (%L, 'staff')$$, (select v from ctx where k = 'h1')),
  '42501', null, 'advertisers cannot insert availability records directly');
select throws_ok(format($$update public.property_listings set reference = 'PQ-AAAAAA' where id = %L$$, (select v from ctx where k = 'h1')),
  '42501', null, 'advertisers cannot change a reference number');

-- Availability ---------------------------------------------------------------------
select throws_ok(format($$select public.confirm_listing_availability(%L)$$, (select v from ctx where k = 'h1')),
  '55000', null, 'a draft cannot be confirmed as available');

select tests.logout();
insert into public.property_media (listing_id, organization_id, storage_path, alt_text, media_type)
select v, (select v from ctx where k = 'vera_org'), (select v from ctx where k = 'vera_org') || '/' || v || '/front.webp', 'Front', 'image' from ctx where k = 'h1';
select tests.login('00000000-0000-0000-0000-0000000000c1');
select lives_ok(format($$select public.submit_listing(%L)$$, (select v from ctx where k = 'h1')), 'editor submits');
select ok((select availability_confirmed_at is not null and availability_method = 'advertiser' from public.property_listings where id = (select v from ctx where k = 'h1')),
  'submitting records an advertiser availability confirmation');
select is((select count(*)::int from public.availability_checks where listing_id = (select v from ctx where k = 'h1')), 1,
  'the confirmation is kept in the history');

select tests.login('00000000-0000-0000-0000-0000000000c3');
select lives_ok(format($$select public.review_listing(%L, 'approved', null, null, null)$$, (select v from ctx where k = 'h1')), 'moderator approves');

-- Payment never buys verification: a sponsored listing still needs a verified organisation.
select tests.logout();
update public.property_listings set is_sponsored = true where id = (select v from ctx where k = 'h1');
select tests.login('00000000-0000-0000-0000-0000000000c1');
select throws_ok(format($$select public.publish_listing(%L)$$, (select v from ctx where k = 'h1')),
  '42501', null, 'sponsored does not replace organisation verification');
select tests.login('00000000-0000-0000-0000-0000000000c4');
select lives_ok($$select public.set_organization_verification((select v from ctx where k = 'vera_org'), 'verified',
  'Business registration matches organisation name', now() + interval '1 year')$$, 'admin records a scoped identity check');
select tests.login('00000000-0000-0000-0000-0000000000c1');
select lives_ok(format($$select public.publish_listing(%L)$$, (select v from ctx where k = 'h1')), 'verified organisation publishes');

select tests.login('00000000-0000-0000-0000-0000000000c2');
select throws_ok(format($$select public.confirm_listing_availability(%L)$$, (select v from ctx where k = 'h1')),
  '42501', null, 'another organisation cannot confirm availability');

select tests.login('00000000-0000-0000-0000-0000000000c1');
select lives_ok(format($$select public.confirm_listing_availability(%L)$$, (select v from ctx where k = 'h1')), 'editor reconfirms a live listing');
select is((select count(*)::int from public.availability_checks where listing_id = (select v from ctx where k = 'h1')), 2,
  'each confirmation is a new history row');

-- Public view ------------------------------------------------------------------------
select tests.anon();
select ok((select reference ~ '^PQ-' and availability_confirmed_at is not null and subtype = 'detached'
             from public.listing_cards where id = (select v from ctx where k = 'h1')),
  'visitors see the reference, availability date and subtype of a published listing');
select throws_ok($$select count(*) from public.availability_checks$$, '42501', null, 'visitors cannot read the availability history');

-- Map: only the rounded position is public; the exact one is not readable.
select tests.logout();
update public.properties set latitude = 5.636512, longitude = -0.161234
 where id = (select property_id from public.property_listings where id = (select v from ctx where k = 'h1'));
select tests.anon();
select is((select public_latitude::text || ',' || public_longitude::text from public.listing_cards where id = (select v from ctx where k = 'h1')),
  '5.64,-0.16', 'visitors see the position rounded to about 1 km');
select throws_ok($$select latitude from public.properties$$, '42501', null, 'visitors cannot read exact coordinates');

select * from finish();
rollback;
