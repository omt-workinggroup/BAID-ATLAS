-- Phone-number accounts (SMS one-time codes) and phone invitations.
-- Personas: pat (verified phone, org owner), quin (verified phone, invitee), ray (verified phone, not invited),
-- una (phone not yet confirmed).
begin;
select plan(17);

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

-- auth.users stores numbers without "+"; confirmed numbers have phone_confirmed_at.
insert into auth.users (id, phone, phone_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000a7', '233201110001', now()),
  ('00000000-0000-0000-0000-00000000001b', '233201110002', now()),
  ('00000000-0000-0000-0000-00000000007a', '233201110003', now()),
  ('00000000-0000-0000-0000-0000000000a0', '233201110004', null);

select is((select phone from public.profiles where id = '00000000-0000-0000-0000-0000000000a7'), '+233201110001',
  'profile stores the sign-in phone in E.164');
select ok((select email is null and phone_verified_at is not null from public.profiles where id = '00000000-0000-0000-0000-0000000000a7'),
  'phone-only profile has no email and a verified phone');
select ok((select phone_verified_at is null from public.profiles where id = '00000000-0000-0000-0000-0000000000a0'),
  'unconfirmed phone is not marked verified');

select tests.login('00000000-0000-0000-0000-0000000000a7');
select throws_ok($$update public.profiles set phone = '+233209999999' where id = auth.uid()$$,
  '42501', null, 'user cannot change their verified sign-in phone');
select throws_ok($$update public.profiles set phone_verified_at = now() where id = auth.uid()$$,
  '42501', null, 'user cannot mark own phone verified');

select tests.login('00000000-0000-0000-0000-0000000000a0');
select throws_ok($$select public.create_organization('Una Homes', 'una-homes', 'agency')$$,
  '42501', null, 'unconfirmed phone cannot create an organisation');

select tests.login('00000000-0000-0000-0000-0000000000a7');
select lives_ok($$select public.create_organization('Pat Homes', 'pat-homes', 'agency')$$,
  'verified phone account can create an organisation');
select tests.logout();
create temp table ids as select id as org from public.organizations where slug = 'pat-homes';
grant select on ids to authenticated;

select tests.login('00000000-0000-0000-0000-0000000000a7');
select throws_ok($$select public.invite_member_by_phone((select org from ids), '0201110002', 'viewer')$$,
  '22023', null, 'invitation phone must be in international format');
select throws_ok($$select public.invite_member_by_phone((select org from ids), '+233201110002', 'owner')$$,
  '22023', null, 'ownership cannot be invited');
create temp table tok as select public.invite_member_by_phone((select org from ids), '+233201110002', 'viewer') as t;
grant select on tok to authenticated;
select ok((select length(t) = 48 from tok), 'phone invitation returns a one-time token');
select throws_ok($$select public.invite_member_by_phone((select org from ids), '+233201110002', 'viewer')$$,
  '23505', null, 'only one open invitation per phone');

select tests.login('00000000-0000-0000-0000-00000000007a');
select throws_ok($$select public.accept_invitation((select t from tok))$$,
  '42501', null, 'invitation cannot be accepted from a different phone');

select tests.login('00000000-0000-0000-0000-00000000001b');
select lives_ok($$select public.accept_invitation((select t from tok))$$, 'invited phone can accept');
select is((select role::text from public.organization_members where user_id = auth.uid()), 'viewer',
  'invitee joins with the invited role');
select is((select email from public.list_organization_members((select org from ids)) where user_id = auth.uid()),
  '+233201110002', 'members list shows the phone for phone-only accounts');

select tests.login('00000000-0000-0000-0000-0000000000a7');
select throws_ok($$select public.invite_member_by_phone((select org from ids), '+233201110002', 'viewer')$$,
  '23505', null, 'cannot invite an existing member by phone');
select tests.logout();

update auth.users set phone = '233201110009' where id = '00000000-0000-0000-0000-00000000007a';
select is((select phone from public.profiles where id = '00000000-0000-0000-0000-00000000007a'), '+233201110009',
  'changing the auth phone updates the profile');

select * from finish();
rollback;
