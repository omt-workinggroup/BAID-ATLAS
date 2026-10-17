-- Phone-number accounts with SMS one-time codes.
-- Accounts may now have a verified phone instead of an email; either one counts as verified.
-- The phone on a profile is the verified sign-in number, synced from auth.users, so clients can no
-- longer edit it. Invitations can be addressed to a phone number.

-- Profiles ------------------------------------------------------------------
alter table public.profiles alter column email drop not null;
alter table public.profiles add column phone_verified_at timestamptz;
create unique index profiles_phone_key on public.profiles (phone) where phone is not null;
alter table public.profiles add constraint profiles_has_contact check (email is not null or phone is not null);

revoke update (phone) on public.profiles from authenticated;

-- auth.users stores phone numbers without the leading "+"; profiles use E.164.
create or replace function private.handle_auth_user_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_phone text := case when coalesce(new.phone, '') = '' then null else '+' || ltrim(new.phone, '+') end;
begin
  if tg_op = 'INSERT' then
    insert into public.profiles (id, email, email_verified_at, phone, phone_verified_at)
    values (new.id, nullif(new.email, ''), new.email_confirmed_at, v_phone, new.phone_confirmed_at);
  else
    update public.profiles
       set email = nullif(new.email, ''),
           email_verified_at = new.email_confirmed_at,
           phone = v_phone,
           phone_verified_at = new.phone_confirmed_at
     where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_phone_updated after update of phone, phone_confirmed_at on auth.users
  for each row execute function private.handle_auth_user_change();

create or replace function private.require_active_verified_user() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.profiles
     where id = auth.uid() and account_status = 'active'
       and (email_verified_at is not null or phone_verified_at is not null)
  ) then
    raise exception 'account not active or not verified' using errcode = '42501';
  end if;
end;
$$;

-- Invitations ---------------------------------------------------------------
alter table public.organization_invitations alter column email drop not null;
alter table public.organization_invitations
  add column phone text check (phone is null or phone ~ '^\+[1-9][0-9]{6,14}$');
alter table public.organization_invitations
  add constraint organization_invitations_has_contact check (email is not null or phone is not null);
create unique index organization_invitations_open_phone_key
  on public.organization_invitations (organization_id, phone)
  where phone is not null and accepted_at is null and revoked_at is null;
grant select (phone) on public.organization_invitations to authenticated;

-- Same rules as invite_member, addressed to a phone number. Returns the raw token once.
create function public.invite_member_by_phone(p_org uuid, p_phone text, p_role public.org_role)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
  v_id uuid;
begin
  perform private.require_active_verified_user();
  if not private.has_org_role(p_org, array['owner', 'admin']::public.org_role[]) then
    raise exception 'not permitted' using errcode = '42501';
  end if;
  if p_role = 'owner' then
    raise exception 'ownership is transferred, not invited' using errcode = '22023';
  end if;
  if p_role = 'admin' and not private.has_org_role(p_org, array['owner']::public.org_role[]) then
    raise exception 'only owners can invite admins' using errcode = '42501';
  end if;
  if p_phone is null or p_phone !~ '^\+[1-9][0-9]{6,14}$' then
    raise exception 'invalid phone number' using errcode = '22023';
  end if;
  if not public.check_rate_limit('org.invite', 30, 3600) then
    raise exception 'rate limit exceeded' using errcode = '54000';
  end if;
  if exists (
    select 1 from public.organization_members m join public.profiles p on p.id = m.user_id
     where m.organization_id = p_org and p.phone = p_phone
  ) then
    raise exception 'already a member' using errcode = '23505';
  end if;

  insert into public.organization_invitations (organization_id, phone, role, token_hash, invited_by)
  values (p_org, p_phone, p_role, encode(extensions.digest(v_token, 'sha256'), 'hex'), auth.uid())
  returning id into v_id;

  perform private.audit('member.invite', 'organization_invitation', v_id, p_org, null,
    jsonb_build_object('phone', p_phone, 'role', p_role));
  return v_token;
end;
$$;

revoke all on function public.invite_member_by_phone(uuid, text, public.org_role) from public, anon;
grant execute on function public.invite_member_by_phone(uuid, text, public.org_role) to authenticated;

-- An invitation is accepted only by the account it was addressed to (email or phone).
create or replace function public.accept_invitation(p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.organization_invitations;
  v_me public.profiles;
begin
  perform private.require_active_verified_user();
  if not public.check_rate_limit('org.accept_invite', 20, 3600) then
    raise exception 'rate limit exceeded' using errcode = '54000';
  end if;

  select * into v_inv from public.organization_invitations
   where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
     and accepted_at is null and revoked_at is null and expires_at > now()
   for update;
  if not found then
    raise exception 'invitation invalid or expired' using errcode = 'P0002';
  end if;
  select * into v_me from public.profiles where id = auth.uid();
  if not (
    (v_inv.email is not null and v_inv.email = v_me.email and v_me.email_verified_at is not null)
    or (v_inv.phone is not null and v_inv.phone = v_me.phone and v_me.phone_verified_at is not null)
  ) then
    raise exception 'invitation was sent to a different email or phone' using errcode = '42501';
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_inv.organization_id, auth.uid(), v_inv.role)
  on conflict (organization_id, user_id) do nothing;
  update public.organization_invitations set accepted_at = now() where id = v_inv.id;

  perform private.audit('member.join', 'organization_member', auth.uid(), v_inv.organization_id, null,
    jsonb_build_object('role', v_inv.role, 'invitation_id', v_inv.id));
  return v_inv.organization_id;
end;
$$;

-- Members list: the contact column shows the email, or the phone for phone-only accounts.
create or replace function public.list_organization_members(p_org uuid)
returns table (user_id uuid, display_name text, email text, role public.org_role, joined_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_org_member(p_org) then
    raise exception 'not permitted' using errcode = '42501';
  end if;
  return query
    select m.user_id, p.display_name, coalesce(p.email::text, p.phone), m.role, m.created_at
      from public.organization_members m join public.profiles p on p.id = m.user_id
     where m.organization_id = p_org
     order by m.created_at;
end;
$$;
