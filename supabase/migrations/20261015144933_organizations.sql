-- Phase 1: organisations, memberships, invitations and their workflow functions.

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug extensions.citext not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 60),
  type public.organization_type not null,
  description text check (description is null or char_length(description) <= 2000),
  website text check (website is null or website ~ '^https://[^\s]+$'),
  public_email extensions.citext,
  public_phone text check (public_phone is null or public_phone ~ '^\+[1-9][0-9]{6,14}$'),
  country_code char(2) not null default 'GH' check (country_code ~ '^[A-Z]{2}$'),
  status public.organization_status not null default 'active',
  verification_status public.verification_status not null default 'not_started',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index organizations_slug_key on public.organizations (slug);
create trigger organizations_set_updated_at before update on public.organizations
  for each row execute function private.set_updated_at();

create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.org_role not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index organization_members_user_idx on public.organization_members (user_id);

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email extensions.citext not null,
  role public.org_role not null check (role <> 'owner'),
  token_hash text not null unique,
  invited_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
-- One open invitation per email per organisation.
create unique index organization_invitations_open_key
  on public.organization_invitations (organization_id, email)
  where accepted_at is null and revoked_at is null;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create function private.has_org_role(p_org uuid, p_roles public.org_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_active_user() and exists (
    select 1
      from public.organization_members m
      join public.organizations o on o.id = m.organization_id
     where m.organization_id = p_org
       and m.user_id = auth.uid()
       and m.role = any (p_roles)
       and o.status = 'active'
  );
$$;

create function private.is_org_member(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.has_org_role(p_org, enum_range(null::public.org_role));
$$;

create function private.require_active_verified_user() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.profiles
     where id = auth.uid() and account_status = 'active' and email_verified_at is not null
  ) then
    raise exception 'account not active or email not verified' using errcode = '42501';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invitations enable row level security;

-- Public directory: active organisations are visible to everyone (public columns only, see view).
create policy "organizations: members read" on public.organizations
  for select to authenticated using (private.is_org_member(id));
create policy "organizations: admins read" on public.organizations
  for select to authenticated using (private.has_staff_role('platform_admin'));
create policy "organizations: owners/admins update" on public.organizations
  for update to authenticated
  using (private.has_org_role(id, array['owner', 'admin']::public.org_role[]))
  with check (private.has_org_role(id, array['owner', 'admin']::public.org_role[]));

revoke all on public.organizations from anon, authenticated;
grant select on public.organizations to authenticated;
grant update (name, description, website, public_email, public_phone)
  on public.organizations to authenticated;

create policy "members: co-members read" on public.organization_members
  for select to authenticated using (private.is_org_member(organization_id));
create policy "members: admins read" on public.organization_members
  for select to authenticated using (private.has_staff_role('platform_admin'));
revoke all on public.organization_members from anon, authenticated;
grant select on public.organization_members to authenticated;

create policy "invitations: owners/admins read" on public.organization_invitations
  for select to authenticated
  using (private.has_org_role(organization_id, array['owner', 'admin']::public.org_role[]));
revoke all on public.organization_invitations from anon, authenticated;
grant select (id, organization_id, email, role, invited_by, expires_at, accepted_at, revoked_at, created_at)
  on public.organization_invitations to authenticated;

-- Public-safe view of organisations (no internal status fields beyond what the public needs).
create view public.public_organizations with (security_invoker = false) as
  select id, name, slug, type, description, website, public_email, public_phone, country_code,
         verification_status, created_at
    from public.organizations
   where status = 'active';
revoke all on public.public_organizations from anon, authenticated;
grant select on public.public_organizations to anon, authenticated;
