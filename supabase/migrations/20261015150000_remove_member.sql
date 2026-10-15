-- Phase 1: leaving or removing an organisation member (audited, last-owner protected).
-- Kept separate because it contains a DELETE statement, which needs explicit approval to apply remotely.

create function public.remove_member(p_org uuid, p_user uuid) returns void
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

  -- Members may leave; owners remove anyone; admins remove non-owner, non-admin members.
  if p_user = auth.uid() and private.is_org_member(p_org) then
    null;
  elsif private.has_org_role(p_org, array['owner']::public.org_role[]) then
    null;
  elsif private.has_org_role(p_org, array['admin']::public.org_role[]) and v_current not in ('owner', 'admin') then
    null;
  else
    raise exception 'not permitted' using errcode = '42501';
  end if;

  if v_current = 'owner' and (
    select count(*) from public.organization_members where organization_id = p_org and role = 'owner'
  ) = 1 then
    raise exception 'an organisation must keep at least one owner' using errcode = '23514';
  end if;

  delete from public.organization_members where organization_id = p_org and user_id = p_user;
  perform private.audit('member.remove', 'organization_member', p_user, p_org,
    jsonb_build_object('role', v_current), null);
end;
$$;

revoke all on function public.remove_member(uuid, uuid) from public, anon;
grant execute on function public.remove_member(uuid, uuid) to authenticated;
