-- Phase 1 foundation: extensions, enums, shared helpers, profiles, staff roles,
-- audit log and rate limiting.

create extension if not exists citext with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- Private schema for helpers that must not be exposed through the Data API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Enums (blueprint vocabularies; later phases add the rest)
-- ---------------------------------------------------------------------------
create type public.account_status as enum ('active', 'suspended', 'closed');
create type public.organization_type as enum
  ('agency', 'developer', 'landlord', 'property_manager', 'marketing_partner', 'enterprise');
create type public.org_role as enum
  ('owner', 'admin', 'listing_manager', 'marketing_manager', 'lead_manager', 'viewer');
create type public.staff_role as enum
  ('moderator', 'verification_reviewer', 'marketing_specialist', 'platform_admin');
create type public.organization_status as enum ('active', 'suspended', 'closed');
create type public.verification_status as enum
  ('not_started', 'pending', 'in_review', 'verified', 'rejected', 'expired');

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 80),
  email extensions.citext not null,
  phone text check (phone is null or phone ~ '^\+[1-9][0-9]{6,14}$'),
  avatar_path text,
  preferred_locale text not null default 'en-GH' check (preferred_locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  preferred_currency char(3) not null default 'GHS' check (preferred_currency ~ '^[A-Z]{3}$'),
  account_status public.account_status not null default 'active',
  email_verified_at timestamptz,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_email_key on public.profiles (email);
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

-- Keep profiles in step with auth.users.
create function private.handle_auth_user_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.profiles (id, email, email_verified_at)
    values (new.id, new.email, new.email_confirmed_at);
  else
    update public.profiles
       set email = new.email,
           email_verified_at = new.email_confirmed_at
     where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_auth_user_change();
create trigger on_auth_user_updated after update of email, email_confirmed_at on auth.users
  for each row execute function private.handle_auth_user_change();

-- ---------------------------------------------------------------------------
-- staff roles (platform roles, separate from organisation roles)
-- ---------------------------------------------------------------------------
create table public.staff_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.staff_role not null,
  granted_by uuid references public.profiles (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- ---------------------------------------------------------------------------
-- audit log (append-only; written by security definer functions only)
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null check (action ~ '^[a-z_]+\.[a-z_]+$'),
  entity_type text not null,
  entity_id uuid,
  organization_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id, created_at desc);
create index audit_log_org_idx on public.audit_log (organization_id, created_at desc)
  where organization_id is not null;

create function private.audit(
  p_action text, p_entity_type text, p_entity_id uuid, p_org uuid, p_before jsonb, p_after jsonb
) returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_log (actor_id, action, entity_type, entity_id, organization_id, before, after)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_org, p_before, p_after);
$$;

-- ---------------------------------------------------------------------------
-- rate limiting (fixed window, keyed by subject + action)
-- ---------------------------------------------------------------------------
create table private.rate_limit_buckets (
  subject text not null,
  action text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (subject, action, window_start)
);

-- Returns true if the call is allowed and records it; false when the limit is reached.
create function public.check_rate_limit(p_action text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_subject text := coalesce(auth.uid()::text, 'anon');
  v_window timestamptz := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count integer;
begin
  if p_limit < 1 or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid rate limit parameters';
  end if;
  insert into private.rate_limit_buckets as b (subject, action, window_start, count)
  values (v_subject, p_action, v_window, 1)
  on conflict (subject, action, window_start) do update set count = b.count + 1
  returning count into v_count;
  return v_count <= p_limit;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS helper functions
-- ---------------------------------------------------------------------------
create function private.is_active_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid() and account_status = 'active'
  );
$$;

create function private.has_staff_role(p_role public.staff_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_active_user() and exists (
    select 1 from public.staff_roles where user_id = auth.uid() and role = p_role
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS: profiles, staff roles, audit
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.staff_roles enable row level security;
alter table public.audit_log enable row level security;

create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles: admins read all" on public.profiles
  for select to authenticated using (private.has_staff_role('platform_admin'));
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = auth.uid() and private.is_active_user())
  with check (id = auth.uid());

-- Clients may only change these columns; status, email and verification come from the server.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, phone, avatar_path, preferred_locale, preferred_currency)
  on public.profiles to authenticated;

create policy "staff_roles: read own" on public.staff_roles
  for select to authenticated using (user_id = auth.uid());
create policy "staff_roles: admins read all" on public.staff_roles
  for select to authenticated using (private.has_staff_role('platform_admin'));
revoke all on public.staff_roles from anon, authenticated;
grant select on public.staff_roles to authenticated;

create policy "audit_log: admins read" on public.audit_log
  for select to authenticated using (private.has_staff_role('platform_admin'));
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

-- Called only from other security definer functions, never directly by clients.
revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;

-- Onboarding completion is a server-side state change.
create function public.complete_onboarding(p_display_name text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_active_user() then
    raise exception 'account not active' using errcode = '42501';
  end if;
  update public.profiles
     set display_name = p_display_name,
         onboarded_at = coalesce(onboarded_at, now())
   where id = auth.uid();
end;
$$;
revoke all on function public.complete_onboarding(text) from public, anon;
grant execute on function public.complete_onboarding(text) to authenticated;
