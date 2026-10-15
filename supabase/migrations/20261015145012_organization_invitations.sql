-- Phase 1: organisation creation and invitation workflow functions.

-- ---------------------------------------------------------------------------
-- Workflow functions (all state changes go through these)
-- ---------------------------------------------------------------------------
create function public.create_organization(
  p_name text, p_slug text, p_type public.organization_type, p_description text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  perform private.require_active_verified_user();
  if not public.check_rate_limit('org.create', 5, 86400) then
    raise exception 'rate limit exceeded' using errcode = '54000';
  end if;

  insert into public.organizations (name, slug, type, description, created_by)
  values (p_name, lower(p_slug), p_type, nullif(p_description, ''), auth.uid())
  returning id into v_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_id, auth.uid(), 'owner');

  perform private.audit('organization.create', 'organization', v_id, v_id, null,
    jsonb_build_object('name', p_name, 'slug', lower(p_slug), 'type', p_type));
  return v_id;
end;
$$;

-- Creates an invitation and returns the raw token once; only its hash is stored.
create function public.invite_member(p_org uuid, p_email text, p_role public.org_role)
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
  if not public.check_rate_limit('org.invite', 30, 3600) then
    raise exception 'rate limit exceeded' using errcode = '54000';
  end if;
  if exists (
    select 1 from public.organization_members m join public.profiles p on p.id = m.user_id
     where m.organization_id = p_org and p.email = p_email::extensions.citext
  ) then
    raise exception 'already a member' using errcode = '23505';
  end if;

  insert into public.organization_invitations (organization_id, email, role, token_hash, invited_by)
  values (p_org, p_email, p_role, encode(extensions.digest(v_token, 'sha256'), 'hex'), auth.uid())
  returning id into v_id;

  perform private.audit('member.invite', 'organization_invitation', v_id, p_org, null,
    jsonb_build_object('email', p_email, 'role', p_role));
  return v_token;
end;
$$;

create function public.accept_invitation(p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.organization_invitations;
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
  if v_inv.email <> (select email from public.profiles where id = auth.uid()) then
    raise exception 'invitation was sent to a different email' using errcode = '42501';
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

create function public.revoke_invitation(p_invitation uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
begin
  select organization_id into v_org from public.organization_invitations
   where id = p_invitation and accepted_at is null and revoked_at is null;
  if v_org is null or not private.has_org_role(v_org, array['owner', 'admin']::public.org_role[]) then
    raise exception 'not permitted' using errcode = '42501';
  end if;
  update public.organization_invitations set revoked_at = now() where id = p_invitation;
  perform private.audit('member.invite_revoke', 'organization_invitation', p_invitation, v_org, null, null);
end;
$$;
