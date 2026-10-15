-- Phase 1: membership management functions, audit trigger and function privileges.

create function public.change_member_role(p_org uuid, p_user uuid, p_role public.org_role)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_current public.org_role;
begin
  perform private.require_active_verified_user();
  select role into v_current from public.organization_members
   where organization_id = p_org and user_id = p_user for update;
  if v_current is null then
    raise exception 'not a member' using errcode = 'P0002';
  end if;

  -- Owners can change anyone; admins can change non-owner, non-admin members to non-owner, non-admin roles.
  if private.has_org_role(p_org, array['owner']::public.org_role[]) then
    null;
  elsif private.has_org_role(p_org, array['admin']::public.org_role[])
        and v_current not in ('owner', 'admin') and p_role not in ('owner', 'admin') then
    null;
  else
    raise exception 'not permitted' using errcode = '42501';
  end if;

  if v_current = 'owner' and p_role <> 'owner' and (
    select count(*) from public.organization_members where organization_id = p_org and role = 'owner'
  ) = 1 then
    raise exception 'an organisation must keep at least one owner' using errcode = '23514';
  end if;

  update public.organization_members set role = p_role
   where organization_id = p_org and user_id = p_user;
  perform private.audit('member.role_change', 'organization_member', p_user, p_org,
    jsonb_build_object('role', v_current), jsonb_build_object('role', p_role));
end;
$$;

-- Lists members with display names for co-members only.
create function public.list_organization_members(p_org uuid)
returns table (user_id uuid, display_name text, email text, role public.org_role, joined_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_org_member(p_org) then
    raise exception 'not permitted' using errcode = '42501';
  end if;
  return query
    select m.user_id, p.display_name, p.email::text, m.role, m.created_at
      from public.organization_members m join public.profiles p on p.id = m.user_id
     where m.organization_id = p_org
     order by m.created_at;
end;
$$;

-- Audit organisation profile edits made through the column-limited update grant.
create function private.audit_organization_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.audit('organization.update', 'organization', new.id, new.id,
    jsonb_build_object('name', old.name, 'description', old.description, 'website', old.website,
                       'public_email', old.public_email, 'public_phone', old.public_phone),
    jsonb_build_object('name', new.name, 'description', new.description, 'website', new.website,
                       'public_email', new.public_email, 'public_phone', new.public_phone));
  return new;
end;
$$;
create trigger organizations_audit_update after update on public.organizations
  for each row
  when (old.name is distinct from new.name or old.description is distinct from new.description
        or old.website is distinct from new.website or old.public_email is distinct from new.public_email
        or old.public_phone is distinct from new.public_phone)
  execute function private.audit_organization_update();

-- ---------------------------------------------------------------------------
-- Function privileges: no anonymous execution, private helpers not callable directly.
-- ---------------------------------------------------------------------------
revoke all on function public.create_organization(text, text, public.organization_type, text) from public, anon;
grant execute on function public.create_organization(text, text, public.organization_type, text) to authenticated;
revoke all on function public.invite_member(uuid, text, public.org_role) from public, anon;
grant execute on function public.invite_member(uuid, text, public.org_role) to authenticated;
revoke all on function public.accept_invitation(text) from public, anon;
grant execute on function public.accept_invitation(text) to authenticated;
revoke all on function public.revoke_invitation(uuid) from public, anon;
grant execute on function public.revoke_invitation(uuid) to authenticated;
revoke all on function public.change_member_role(uuid, uuid, public.org_role) from public, anon;
grant execute on function public.change_member_role(uuid, uuid, public.org_role) to authenticated;
revoke all on function public.list_organization_members(uuid) from public, anon;
grant execute on function public.list_organization_members(uuid) to authenticated;

revoke all on function private.audit(text, text, uuid, uuid, jsonb, jsonb) from public, anon, authenticated;
revoke all on function private.require_active_verified_user() from public, anon, authenticated;
revoke all on function private.handle_auth_user_change() from public, anon, authenticated;
