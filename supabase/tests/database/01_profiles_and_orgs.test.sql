-- RLS and workflow tests for profiles, organisations, memberships, invitations and audit.
-- Personas: anonymous, verified users (alice, bob, carol), unverified user (uma),
-- suspended user (sam) and a platform admin (ada).
begin;
select plan(49);

-- ---------------------------------------------------------------------------
-- Helpers (rolled back with the transaction)
-- ---------------------------------------------------------------------------
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

-- Users
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-00000000a11c', 'alice@example.test', now()),
  ('00000000-0000-0000-0000-000000000b0b', 'bob@example.test',   now()),
  ('00000000-0000-0000-0000-00000000ca01', 'carol@example.test', now()),
  ('00000000-0000-0000-0000-000000000a1a', 'uma@example.test',   null),
  ('00000000-0000-0000-0000-000000005a40', 'sam@example.test',   now()),
  ('00000000-0000-0000-0000-000000000ada', 'ada@example.test',   now());
update public.profiles set account_status = 'suspended' where id = '00000000-0000-0000-0000-000000005a40';
insert into public.staff_roles (user_id, role) values ('00000000-0000-0000-0000-000000000ada', 'platform_admin');

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
select is((select count(*)::int from public.profiles), 6, 'trigger creates a profile per auth user');
select ok((select email_verified_at is not null from public.profiles where id = '00000000-0000-0000-0000-00000000a11c'),
  'profile copies email verification time');

select tests.anon();
select throws_ok('select * from public.profiles', '42501', null, 'anon cannot read profiles');

select tests.login('00000000-0000-0000-0000-00000000a11c');
select is((select count(*)::int from public.profiles), 1, 'user sees only own profile');
select lives_ok($$update public.profiles set display_name = 'Alice' where id = auth.uid()$$,
  'user can update own display name');
select throws_ok($$update public.profiles set account_status = 'active' where id = auth.uid()$$,
  '42501', null, 'user cannot change account_status');
select throws_ok($$update public.profiles set email_verified_at = now() where id = auth.uid()$$,
  '42501', null, 'user cannot mark own email verified');
update public.profiles set display_name = 'Hacked' where id = '00000000-0000-0000-0000-000000000b0b';
select tests.logout();
select is((select display_name from public.profiles where id = '00000000-0000-0000-0000-000000000b0b'), null,
  'user cannot update another user''s profile');

-- ---------------------------------------------------------------------------
-- Organisation creation
-- ---------------------------------------------------------------------------
select tests.login('00000000-0000-0000-0000-000000000a1a');
select throws_ok($$select public.create_organization('Uma Homes', 'uma-homes', 'agency')$$,
  '42501', null, 'unverified email cannot create an organisation');

select tests.login('00000000-0000-0000-0000-000000005a40');
select throws_ok($$select public.create_organization('Sam Homes', 'sam-homes', 'agency')$$,
  '42501', null, 'suspended account cannot create an organisation');

select tests.login('00000000-0000-0000-0000-00000000a11c');
select lives_ok($$select public.create_organization('Alice Realty', 'alice-realty', 'agency', 'Test org')$$,
  'verified user creates an organisation');
select throws_ok($$select public.create_organization('Dup', 'alice-realty', 'agency')$$,
  '23505', null, 'organisation slugs are unique');
select throws_ok($$select public.create_organization('Bad', 'Bad Slug!', 'agency')$$,
  '23514', null, 'invalid slugs are rejected');
select throws_ok($$insert into public.organizations (name, slug, type) values ('X', 'x-org', 'agency')$$,
  '42501', null, 'direct organisation insert is denied');
select is((select role::text from public.organization_members m join public.organizations o on o.id = m.organization_id
            where o.slug = 'alice-realty' and m.user_id = auth.uid()), 'owner', 'creator becomes owner');
select throws_ok($$update public.organizations set verification_status = 'verified' where slug = 'alice-realty'$$,
  '42501', null, 'owner cannot self-verify the organisation');
select lives_ok($$update public.organizations set description = 'Updated' where slug = 'alice-realty'$$,
  'owner can edit organisation profile');
select tests.logout();

select is((select count(*)::int from public.audit_log where action in ('organization.create', 'organization.update')), 2,
  'organisation create and update are audited');

-- ---------------------------------------------------------------------------
-- Cross-organisation isolation
-- ---------------------------------------------------------------------------
create temp table ids as select id as alice_org from public.organizations where slug = 'alice-realty';
grant select on ids to authenticated, anon;

select tests.login('00000000-0000-0000-0000-000000000b0b');
select is((select count(*)::int from public.organizations), 1, 'non-member sees active organisation as public directory entry');
select throws_ok('select created_by from public.organizations', '42501', null, 'created_by is not readable');
select is((select count(*)::int from public.organization_members), 0, 'non-member cannot read memberships');
select throws_ok($$select public.invite_member((select alice_org from ids), 'bob2@example.test', 'viewer')$$,
  '42501', null, 'non-member cannot invite');
select throws_ok($$select * from public.list_organization_members((select alice_org from ids))$$,
  '42501', null, 'non-member cannot list members');
select throws_ok($$insert into public.organization_members (organization_id, user_id, role)
                   values ((select alice_org from ids), auth.uid(), 'owner')$$,
  '42501', null, 'user cannot insert themself as a member');
update public.organizations set name = 'Pwned' where id = (select alice_org from ids);
select tests.logout();
select is((select name from public.organizations where slug = 'alice-realty'), 'Alice Realty',
  'non-member update has no effect');

select tests.anon();
select is((select count(*)::int from public.public_organizations), 1, 'anon can read public organisation view');
select throws_ok('select * from public.organizations', '42501', null, 'anon cannot read private organisation columns');
select throws_ok($$select public.create_organization('A', 'anon-org', 'agency')$$, '42501', null,
  'anon cannot call workflow functions');
select tests.logout();

-- ---------------------------------------------------------------------------
-- Invitations and roles
-- ---------------------------------------------------------------------------
select tests.login('00000000-0000-0000-0000-00000000a11c');
create temp table tok as select public.invite_member((select alice_org from ids), 'carol@example.test', 'viewer') as t;
select ok((select length(t) = 48 from tok), 'invitation returns a one-time token');
select throws_ok('select token_hash from public.organization_invitations', '42501', null,
  'members cannot read invitation token hashes');
select throws_ok($$select public.invite_member((select alice_org from ids), 'x@example.test', 'owner')$$,
  '22023', null, 'owners cannot be invited');
select tests.logout();
select is((select count(*)::int from public.organization_invitations where token_hash = (select t from tok)), 0,
  'raw token is not stored');
grant select on tok to authenticated;

select tests.login('00000000-0000-0000-0000-000000000b0b');
select throws_ok($$select public.accept_invitation((select t from tok))$$, '42501', null,
  'invitation cannot be accepted by a different email');

select tests.login('00000000-0000-0000-0000-00000000ca01');
select lives_ok($$select public.accept_invitation((select t from tok))$$, 'invited user accepts');
select throws_ok($$select public.accept_invitation((select t from tok))$$, 'P0002', null,
  'invitation cannot be reused');
select is((select count(*)::int from public.list_organization_members((select alice_org from ids))), 2,
  'member can list co-members');
select throws_ok($$select public.invite_member((select alice_org from ids), 'd@example.test', 'viewer')$$,
  '42501', null, 'viewer cannot invite');
select throws_ok($$select public.change_member_role((select alice_org from ids), auth.uid(), 'admin')$$,
  '42501', null, 'viewer cannot promote themself');
update public.organizations set name = 'Viewer edit' where id = (select alice_org from ids);
select tests.logout();
select is((select name from public.organizations where slug = 'alice-realty'), 'Alice Realty',
  'viewer cannot edit organisation profile');

select tests.login('00000000-0000-0000-0000-00000000a11c');
select throws_ok($$select public.change_member_role((select alice_org from ids), auth.uid(), 'admin')$$,
  '23514', null, 'last owner cannot demote themself');
select throws_ok($$select public.remove_member((select alice_org from ids), auth.uid())$$,
  '23514', null, 'last owner cannot leave');
select lives_ok($$select public.change_member_role((select alice_org from ids),
                   '00000000-0000-0000-0000-00000000ca01', 'listing_manager')$$,
  'owner changes a member role');
select tests.logout();

select is((select count(*)::int from public.audit_log where action in ('member.invite', 'member.join', 'member.role_change')), 3,
  'membership changes are audited');

-- ---------------------------------------------------------------------------
-- Suspension and audit access
-- ---------------------------------------------------------------------------
update public.profiles set account_status = 'suspended' where id = '00000000-0000-0000-0000-00000000a11c';
select tests.login('00000000-0000-0000-0000-00000000a11c');
select is((select count(*)::int from public.organization_members), 0, 'suspended owner loses membership access');
select throws_ok($$select public.invite_member((select alice_org from ids), 'e@example.test', 'viewer')$$,
  '42501', null, 'suspended owner cannot invite');
select tests.logout();

update public.organizations set status = 'suspended' where slug = 'alice-realty';
select tests.anon();
select is((select count(*)::int from public.public_organizations), 0, 'suspended organisation leaves the public directory');
select tests.logout();

select tests.login('00000000-0000-0000-0000-00000000ca01');
select throws_ok($$select * from public.list_organization_members((select alice_org from ids))$$,
  '42501', null, 'members of a suspended organisation lose access');
select is((select count(*)::int from public.audit_log), 0, 'ordinary user cannot read audit log');

select tests.login('00000000-0000-0000-0000-000000000ada');
select ok((select count(*)::int from public.audit_log) >= 5, 'platform admin can read audit log');
select tests.logout();

select * from finish();
rollback;
