-- Phase 3: inquiries, messages, viewing requests, reports and notifications.
-- Personas: vera (owner of the listing's org), lena (lead manager), vic (viewer), mark (marketing manager),
-- bo (buyer), cy (another buyer), ada (platform admin), mo (moderator).
begin;
select plan(51);

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

insert into auth.users (id, phone, phone_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000b1', '233200000001', now()),
  ('00000000-0000-0000-0000-0000000000b2', '233200000002', now()),
  ('00000000-0000-0000-0000-0000000000b3', '233200000003', now()),
  ('00000000-0000-0000-0000-0000000000b4', '233200000004', now()),
  ('00000000-0000-0000-0000-0000000000b5', '233200000005', now()),
  ('00000000-0000-0000-0000-0000000000b6', '233200000006', now()),
  ('00000000-0000-0000-0000-0000000000b7', '233200000007', now()),
  ('00000000-0000-0000-0000-0000000000b8', '233200000008', now());
update public.profiles set display_name = case id
  when '00000000-0000-0000-0000-0000000000b1' then 'Vera Mensah' when '00000000-0000-0000-0000-0000000000b2' then 'Lena Owusu'
  when '00000000-0000-0000-0000-0000000000b5' then 'Bo Asante' when '00000000-0000-0000-0000-0000000000b6' then 'Cy Boateng'
  else 'Staff' end, onboarded_at = now();
insert into public.staff_roles (user_id, role) values
  ('00000000-0000-0000-0000-0000000000b7', 'platform_admin'),
  ('00000000-0000-0000-0000-0000000000b8', 'moderator');

create temp table ctx (k text primary key, v uuid);
grant select, insert, update on ctx to authenticated, anon;
create function tests.v(p_k text) returns uuid language sql as $$ select v from ctx where k = p_k $$;
grant execute on function tests.v(text) to authenticated, anon;
create function tests.payload(p_title text) returns jsonb language sql as $$
  select jsonb_build_object(
    'title', p_title, 'description', 'A bright three-bedroom family home close to schools, shops and the main road.',
    'purpose', 'sale', 'property_type', 'house', 'region', 'Greater Accra', 'city', 'Accra', 'locality', 'East Legon',
    'address_private', '12 Private Lane', 'latitude', '5.636512', 'longitude', '-0.161234',
    'bedrooms', '3', 'bathrooms', '2', 'floor_area', '180', 'floor_area_unit', 'sqm',
    'asking_price', '1250000', 'currency', 'GHS', 'price_period', 'total');
$$;
grant execute on function tests.payload(text) to authenticated;

-- A published listing owned by Vera's organisation, with a team.
select tests.login('00000000-0000-0000-0000-0000000000b1');
insert into ctx values ('org', public.create_organization('Vera Homes', 'vera-homes', 'agency'));
insert into ctx values ('l1', public.create_listing(tests.v('org'), tests.payload('Family home in East Legon')));
select public.add_listing_media(tests.v('l1'), tests.v('org') || '/' || tests.v('l1') || '/front.webp', 'Front', false, false, 1600, 1067);
select public.submit_listing(tests.v('l1'));
insert into ctx values ('l2', public.create_listing(tests.v('org'), tests.payload('Draft apartment')));
select tests.logout();
insert into public.organization_members (organization_id, user_id, role) values
  (tests.v('org'), '00000000-0000-0000-0000-0000000000b2', 'lead_manager'),
  (tests.v('org'), '00000000-0000-0000-0000-0000000000b3', 'viewer'),
  (tests.v('org'), '00000000-0000-0000-0000-0000000000b4', 'marketing_manager');
select tests.login('00000000-0000-0000-0000-0000000000b8');
select public.review_listing(tests.v('l1'), 'approved', null, null, null);
select tests.login('00000000-0000-0000-0000-0000000000b7');
select public.set_organization_verification(tests.v('org'), 'verified', 'Business registration matches organisation name', now() + interval '1 year');
select tests.login('00000000-0000-0000-0000-0000000000b1');
select public.publish_listing(tests.v('l1'));

-- Inquiries -----------------------------------------------------------------------------
select tests.anon();
select throws_ok($$select public.send_inquiry(tests.v('l1'), 'Hello', false, gen_random_uuid())$$, '42501', null,
  'visitors must sign in to send an inquiry');

select tests.login('00000000-0000-0000-0000-0000000000b5');
insert into ctx values ('key1', gen_random_uuid());
insert into ctx values ('q1', public.send_inquiry(tests.v('l1'), 'Is this still available? Can I view on Saturday?', true, tests.v('key1')));
select ok(tests.v('q1') is not null, 'buyer sends an inquiry');
select is(public.send_inquiry(tests.v('l1'), 'Is this still available? Can I view on Saturday?', true, tests.v('key1')), tests.v('q1'),
  'AC-07: the same request key returns the existing inquiry');
select is((select count(*)::int from public.inquiry_messages where inquiry_id = tests.v('q1')), 1,
  'a retried request does not post the message twice');
select is(public.send_inquiry(tests.v('l1'), 'Also, is parking included?', false, gen_random_uuid()), tests.v('q1'),
  'asking again about the same listing continues the open conversation');
select is((select count(*)::int from public.inquiry_messages where inquiry_id = tests.v('q1')), 2, 'the follow-up joins the thread');
select is((select contact_phone from public.inquiries where id = tests.v('q1')), '+233200000005',
  'the phone is shared only because the buyer ticked consent');
select ok((select consent_at is not null and consent_text like 'Share my phone number%' from public.inquiries where id = tests.v('q1')),
  'consent wording and time are recorded');
select throws_ok($$select public.send_inquiry(tests.v('l2'), 'Hello', false, gen_random_uuid())$$, 'P0002', null,
  'cannot inquire about a listing that is not public');
select throws_ok($$select public.send_inquiry(tests.v('l1'), '   ', false, gen_random_uuid())$$, '22023', null,
  'empty messages are rejected');
select throws_ok($$insert into public.inquiries (listing_id, organization_id, requester_id, idempotency_key)
                   values (tests.v('l1'), tests.v('org'), auth.uid(), gen_random_uuid())$$, '42501', null,
  'inquiries cannot be written directly');

select tests.login('00000000-0000-0000-0000-0000000000b6');
insert into ctx values ('q2', public.send_inquiry(tests.v('l1'), 'What is the service charge?', false, gen_random_uuid()));
select is((select contact_phone from public.inquiries where id = tests.v('q2')), null, 'without consent no phone is shared');
select is((select count(*)::int from public.inquiries), 1, 'buyers only see their own inquiries');
select throws_ok($$select public.get_conversation(tests.v('q1'))$$, 'P0002', null, 'buyers cannot open someone else''s conversation');
select throws_ok($$select public.send_message(tests.v('q1'), 'Hi', gen_random_uuid())$$, 'P0002', null,
  'buyers cannot post in someone else''s conversation');

select tests.login('00000000-0000-0000-0000-0000000000b1');
select throws_ok($$select public.send_inquiry(tests.v('l1'), 'Testing', false, gen_random_uuid())$$, '42501', null,
  'members cannot send inquiries about their own organisation''s listings');

-- Provider side -------------------------------------------------------------------------
select tests.login('00000000-0000-0000-0000-0000000000b2');
select is((select count(*)::int from public.get_inbox(tests.v('org'))), 2, 'lead manager sees both leads');
select is(public.unread_conversation_count(), 2, 'both leads count as unread for the lead manager');
select is((public.get_conversation(tests.v('q1')) -> 'inquiry' ->> 'contact_phone'), '+233200000005',
  'the provider sees the shared phone');
select lives_ok($$select public.send_message(tests.v('q1'), 'Yes, it is available. Saturday works.', gen_random_uuid())$$,
  'lead manager replies');
select is((select status::text from public.inquiries where id = tests.v('q1')), 'contacted', 'replying moves a new lead to contacted');
select is(public.unread_conversation_count(), 1, 'replying marks the conversation read');
select is((select count(*)::int from public.notifications where user_id = '00000000-0000-0000-0000-0000000000b5'), 0,
  'users cannot read other people''s notifications');

select tests.login('00000000-0000-0000-0000-0000000000b3');
select is((select count(*)::int from public.get_inbox(tests.v('org'))), 2, 'viewers can read leads');
select throws_ok($$select public.send_message(tests.v('q1'), 'Hello', gen_random_uuid())$$, '42501', null, 'viewers cannot reply');
select throws_ok($$select public.set_inquiry_status(tests.v('q1'), 'qualified')$$, '42501', null, 'viewers cannot change status');

select tests.login('00000000-0000-0000-0000-0000000000b4');
select throws_ok($$select * from public.get_inbox(tests.v('org'))$$, '42501', null, 'marketing managers cannot read leads');
select is((select count(*)::int from public.inquiries), 0, 'marketing managers see no inquiries');

select tests.login('00000000-0000-0000-0000-0000000000b5');
select is(public.unread_conversation_count(), 1, 'the buyer has an unread reply');
select ok((select count(*) = 1 from public.notifications where kind = 'message_new'), 'the buyer is notified of the reply');
select is((public.get_conversation(tests.v('q1')) -> 'inquiry' ->> 'contact_phone'), null,
  'the conversation view never echoes contact details back to the requester');
select lives_ok($$select public.mark_inquiry_read(tests.v('q1'))$$, 'buyer opens the conversation');
select is(public.unread_conversation_count(), 0, 'opening it clears the unread count');

-- Viewing requests (AC-08) ---------------------------------------------------------------
select throws_ok($$select public.request_viewing(tests.v('q1'), now() + interval '2 days', now() + interval '2 days 1 hour', 'Mars/Olympus', null)$$,
  '22023', null, 'AC-08: unknown timezones are rejected');
select throws_ok($$select public.request_viewing(tests.v('q1'), now() + interval '2 days', now() + interval '2 days' - interval '1 hour', 'Africa/Accra', null)$$,
  '22023', null, 'AC-08: the end must be after the start');
select throws_ok($$select public.request_viewing(tests.v('q1'), now() + interval '10 minutes', now() + interval '70 minutes', 'Africa/Accra', null)$$,
  '22023', null, 'viewings must be at least an hour away');
select throws_ok($$select public.request_viewing(tests.v('q1'), now() + interval '2 days', now() + interval '2 days 5 hours', 'Africa/Accra', null)$$,
  '22023', null, 'viewings last at most 4 hours');
insert into ctx values ('vw', public.request_viewing(tests.v('q1'), date_trunc('hour', now()) + interval '3 days', date_trunc('hour', now()) + interval '3 days 1 hour', 'Africa/Accra', 'I can come after work'));
select is((select status::text from public.inquiries where id = tests.v('q1')), 'viewing_requested', 'a request moves the lead to viewing requested');
select throws_ok($$select public.request_viewing(tests.v('q1'), now() + interval '4 days', now() + interval '4 days 1 hour', 'Africa/Accra', null)$$,
  '23505', null, 'only one viewing can be in progress per conversation');
select throws_ok($$select public.respond_viewing(tests.v('vw'), 'complete', null, null, null)$$, '55000', null,
  'buyers cannot mark viewings done');

select tests.login('00000000-0000-0000-0000-0000000000b2');
select lives_ok($$select public.respond_viewing(tests.v('vw'), 'propose', date_trunc('hour', now()) + interval '4 days', date_trunc('hour', now()) + interval '4 days 1 hour', 'Morning works better')$$,
  'lead manager proposes another time');
select tests.login('00000000-0000-0000-0000-0000000000b5');
select lives_ok($$select public.respond_viewing(tests.v('vw'), 'confirm', null, null, null)$$, 'buyer accepts the proposed time');
select is((select status::text from public.viewing_requests where id = tests.v('vw')), 'confirmed', 'the viewing is confirmed');
select ok((select count(*) >= 3 from public.inquiry_messages where inquiry_id = tests.v('q1') and sender_side = 'system'),
  'each viewing step is recorded in the conversation');

-- Spam and closing --------------------------------------------------------------------------
select tests.login('00000000-0000-0000-0000-0000000000b2');
select lives_ok($$select public.set_inquiry_status(tests.v('q2'), 'spam')$$, 'lead manager marks a lead as spam');
select tests.login('00000000-0000-0000-0000-0000000000b6');
select throws_ok($$select public.send_message(tests.v('q2'), 'Hello again', gen_random_uuid())$$, '55000', null,
  'no further messages on a spam conversation');

-- Reports ---------------------------------------------------------------------------------------
insert into ctx values ('r1', public.report_listing(tests.v('l1'), 'wrong_details', 'The price on the sign is different'));
select is(public.report_listing(tests.v('l1'), 'scam', null), tests.v('r1'), 'reporting again returns the open report');
select throws_ok($$select * from public.get_report_queue()$$, '42501', null, 'only moderators see the report queue');
select tests.login('00000000-0000-0000-0000-0000000000b8');
select is((select count(*)::int from public.get_report_queue()), 1, 'moderators see the report');
select throws_ok($$select public.resolve_report(tests.v('r1'), 'dismissed', '')$$, '22023', null, 'closing a report needs a note');
select lives_ok($$select public.resolve_report(tests.v('r1'), 'actioned', 'Asked the provider to correct the price')$$, 'moderator resolves the report');

select * from finish();
rollback;
