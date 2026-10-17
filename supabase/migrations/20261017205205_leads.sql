-- Phase 3: leads. Inquiries with message threads, viewing requests, listing reports and in-app notifications.
-- Everything is written through checked functions; tables are read-only to clients and filtered by RLS.

create type public.inquiry_status as enum
  ('new', 'contacted', 'qualified', 'viewing_requested', 'converted', 'closed', 'spam');
create type public.viewing_status as enum
  ('requested', 'proposed', 'confirmed', 'declined', 'cancelled', 'completed');
create type public.report_reason as enum
  ('scam', 'not_available', 'wrong_details', 'misleading_photos', 'duplicate', 'offensive', 'other');
create type public.report_status as enum ('open', 'reviewing', 'actioned', 'dismissed');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.property_listings (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  status public.inquiry_status not null default 'new',
  -- Only filled when the requester ticked "share my phone number".
  contact_phone text check (contact_phone is null or contact_phone ~ '^\+[1-9][0-9]{6,14}$'),
  consent_text text,
  consent_at timestamptz,
  idempotency_key uuid not null,
  source text not null default 'listing' check (source in ('listing')),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester_id, idempotency_key)
);
create index inquiries_org_idx on public.inquiries (organization_id, status, last_message_at desc);
create index inquiries_requester_idx on public.inquiries (requester_id, last_message_at desc);
-- One open conversation per person per listing: asking again continues it.
create unique index inquiries_open_key on public.inquiries (requester_id, listing_id)
  where status not in ('closed', 'spam');
create trigger inquiries_set_updated_at before update on public.inquiries
  for each row execute function private.set_updated_at();

create table public.inquiry_messages (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  sender_side text not null check (sender_side in ('requester', 'provider', 'system')),
  body text not null check (char_length(body) between 1 and 2000),
  -- Client-generated key so a retried send never posts twice.
  client_key uuid,
  -- Wall-clock time (not transaction time) so messages and read markers order exactly.
  created_at timestamptz not null default clock_timestamp()
);
create index inquiry_messages_thread_idx on public.inquiry_messages (inquiry_id, created_at);
create unique index inquiry_messages_client_key on public.inquiry_messages (sender_id, client_key)
  where client_key is not null;

create table public.inquiry_reads (
  inquiry_id uuid not null references public.inquiries (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default clock_timestamp(),
  primary key (inquiry_id, user_id)
);

create table public.viewing_requests (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries (id) on delete cascade,
  requested_start timestamptz not null,
  requested_end timestamptz not null,
  timezone text not null,
  status public.viewing_status not null default 'requested',
  note text check (note is null or char_length(note) <= 500),
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint viewing_requests_end_after_start check (requested_end > requested_start),
  constraint viewing_requests_max_length check (requested_end - requested_start <= interval '4 hours')
);
-- At most one viewing in progress per conversation.
create unique index viewing_requests_active_key on public.viewing_requests (inquiry_id)
  where status in ('requested', 'proposed', 'confirmed');
create trigger viewing_requests_set_updated_at before update on public.viewing_requests
  for each row execute function private.set_updated_at();

create table public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.property_listings (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason public.report_reason not null,
  details text check (details is null or char_length(details) <= 1000),
  status public.report_status not null default 'open',
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  resolution_note text check (resolution_note is null or char_length(resolution_note) <= 1000),
  created_at timestamptz not null default now()
);
create unique index listing_reports_open_key on public.listing_reports (reporter_id, listing_id)
  where status in ('open', 'reviewing');
create index listing_reports_queue_idx on public.listing_reports (status, created_at);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind ~ '^[a-z_]+$'),
  title text not null check (char_length(title) between 1 and 160),
  body text check (body is null or char_length(body) <= 300),
  link text check (link is null or link ~ '^/[A-Za-z0-9/_?=&.-]*$'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
-- Org roles that may read leads (listing managers and viewers read only) and that may act on them.
create function private.lead_readers() returns public.org_role[]
language sql immutable set search_path = '' as $$ select array['owner', 'admin', 'lead_manager', 'listing_manager', 'viewer']::public.org_role[] $$;
create function private.lead_managers() returns public.org_role[]
language sql immutable set search_path = '' as $$ select array['owner', 'admin', 'lead_manager']::public.org_role[] $$;

create function private.can_read_inquiry(p_inquiry uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.inquiries i
     where i.id = p_inquiry
       and ((i.requester_id = auth.uid() and private.is_active_user())
            or private.has_org_role(i.organization_id, private.lead_readers()))
  );
$$;

create function private.can_manage_inquiry(p_inquiry uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.inquiries i
     where i.id = p_inquiry and private.has_org_role(i.organization_id, private.lead_managers())
  );
$$;

create function private.notify(p_user uuid, p_kind text, p_title text, p_body text, p_link text) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, title, body, link)
  values (p_user, p_kind, left(p_title, 160), left(p_body, 300), p_link);
$$;

-- Notifies everyone who handles an organisation's leads, except the person acting.
create function private.notify_lead_managers(p_org uuid, p_kind text, p_title text, p_body text, p_link text) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, title, body, link)
  select m.user_id, p_kind, left(p_title, 160), left(p_body, 300), p_link
    from public.organization_members m
   where m.organization_id = p_org
     and m.role = any (private.lead_managers())
     and m.user_id is distinct from auth.uid();
$$;

create function private.mark_read(p_inquiry uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.inquiry_reads (inquiry_id, user_id, last_read_at) values (p_inquiry, auth.uid(), clock_timestamp())
  on conflict (inquiry_id, user_id) do update set last_read_at = excluded.last_read_at;
$$;

-- Validates a viewing slot (AC-08): a real IANA timezone, end after start, at most 4 hours,
-- between one hour and 180 days from now.
create function private.check_viewing_slot(p_start timestamptz, p_end timestamptz, p_timezone text) returns void
language plpgsql stable set search_path = '' as $$
begin
  if p_timezone is null or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'invalid timezone' using errcode = '22023';
  end if;
  if p_start is null or p_end is null or p_end <= p_start then
    raise exception 'the viewing must end after it starts' using errcode = '22023';
  end if;
  if p_end - p_start > interval '4 hours' then
    raise exception 'a viewing can last at most 4 hours' using errcode = '22023';
  end if;
  if p_start < now() + interval '1 hour' then
    raise exception 'choose a time at least an hour from now' using errcode = '22023';
  end if;
  if p_start > now() + interval '180 days' then
    raise exception 'choose a time within the next 6 months' using errcode = '22023';
  end if;
end;
$$;

create function private.slot_label(p_start timestamptz, p_timezone text) returns text
language sql stable set search_path = '' as $$
  select to_char(p_start at time zone p_timezone, 'Dy DD Mon, HH24:MI') || ' (' || p_timezone || ')';
$$;

-- ---------------------------------------------------------------------------
-- Row-level security: clients read; all writes go through the functions below.
-- ---------------------------------------------------------------------------
alter table public.inquiries enable row level security;
alter table public.inquiry_messages enable row level security;
alter table public.inquiry_reads enable row level security;
alter table public.viewing_requests enable row level security;
alter table public.listing_reports enable row level security;
alter table public.notifications enable row level security;

create policy "inquiries: participants read" on public.inquiries
  for select to authenticated using (private.can_read_inquiry(id));
create policy "inquiry messages: participants read" on public.inquiry_messages
  for select to authenticated using (private.can_read_inquiry(inquiry_id));
create policy "inquiry reads: own" on public.inquiry_reads
  for select to authenticated using (user_id = auth.uid());
create policy "viewings: participants read" on public.viewing_requests
  for select to authenticated using (private.can_read_inquiry(inquiry_id));
create policy "reports: reporter or moderators read" on public.listing_reports
  for select to authenticated
  using (reporter_id = auth.uid() or private.is_staff(array['moderator', 'platform_admin']::public.staff_role[]));
create policy "notifications: own" on public.notifications
  for select to authenticated using (user_id = auth.uid());

revoke all on public.inquiries, public.inquiry_messages, public.inquiry_reads, public.viewing_requests,
  public.listing_reports, public.notifications from anon, authenticated;
grant select on public.inquiries, public.inquiry_messages, public.inquiry_reads, public.viewing_requests,
  public.listing_reports, public.notifications to authenticated;

-- ---------------------------------------------------------------------------
-- Inquiries and messages
-- ---------------------------------------------------------------------------
-- Sends an inquiry about a public listing. Idempotent per client key (AC-07): a retry returns the same
-- inquiry. If the person already has an open conversation about this listing, the message joins it.
create function public.send_inquiry(p_listing uuid, p_message text, p_share_phone boolean, p_key uuid)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_existing uuid;
  v_id uuid;
  v_org uuid;
  v_org_slug text;
  v_title text;
  v_phone text;
  v_name text;
  v_body text := btrim(coalesce(p_message, ''));
  v_consent text := 'Share my phone number with this provider so they can call or text me about this property.';
begin
  perform private.require_active_verified_user();
  if p_key is null then
    raise exception 'a request key is required' using errcode = '22023';
  end if;

  -- Same request again (e.g. a retried tap on a weak connection): return what it created.
  select inquiry_id into v_existing from public.inquiry_messages where sender_id = auth.uid() and client_key = p_key;
  if found then
    return v_existing;
  end if;

  if char_length(v_body) not between 1 and 2000 then
    raise exception 'message must be 1 to 2000 characters' using errcode = '22023';
  end if;
  if not private.listing_is_public(p_listing) then
    raise exception 'listing not available' using errcode = 'P0002';
  end if;
  select l.organization_id, l.title, o.slug into v_org, v_title, v_org_slug
    from public.property_listings l join public.organizations o on o.id = l.organization_id
   where l.id = p_listing;
  if private.is_org_member(v_org) then
    raise exception 'you cannot send an inquiry about your own organisation''s listing' using errcode = '42501';
  end if;
  if not public.check_rate_limit('inquiry.send', 10, 3600) then
    raise exception 'rate limit exceeded' using errcode = '54000';
  end if;

  select phone, coalesce(display_name, 'Someone') into v_phone, v_name from public.profiles where id = auth.uid();

  select id into v_id from public.inquiries
   where requester_id = auth.uid() and listing_id = p_listing and status not in ('closed', 'spam')
   for update;
  if v_id is null then
    insert into public.inquiries (listing_id, organization_id, requester_id, idempotency_key, contact_phone, consent_text, consent_at)
    values (p_listing, v_org, auth.uid(), p_key,
            case when p_share_phone then v_phone end,
            case when p_share_phone and v_phone is not null then v_consent end,
            case when p_share_phone and v_phone is not null then now() end)
    returning id into v_id;
    perform private.audit('inquiry.create', 'inquiry', v_id, v_org, null,
      jsonb_build_object('listing_id', p_listing, 'shared_phone', coalesce(p_share_phone, false) and v_phone is not null));
  else
    update public.inquiries
       set contact_phone = case when p_share_phone and v_phone is not null then v_phone else contact_phone end,
           consent_text = case when p_share_phone and v_phone is not null then v_consent else consent_text end,
           consent_at = case when p_share_phone and v_phone is not null then now() else consent_at end
     where id = v_id;
  end if;

  insert into public.inquiry_messages (inquiry_id, sender_id, sender_side, body, client_key)
  values (v_id, auth.uid(), 'requester', v_body, p_key);
  update public.inquiries set last_message_at = now() where id = v_id;
  perform private.mark_read(v_id);
  perform private.notify_lead_managers(v_org, 'inquiry_new', 'New inquiry: ' || v_title,
    v_name || ': ' || v_body, '/portal/' || v_org_slug || '/leads/' || v_id);
  return v_id;
end;
$$;

-- Replies in a conversation. The requester and the organisation's lead managers can write; listing
-- managers and viewers can only read. Idempotent per client key.
create function public.send_message(p_inquiry uuid, p_body text, p_key uuid)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_inq public.inquiries;
  v_side text;
  v_id uuid;
  v_body text := btrim(coalesce(p_body, ''));
  v_title text;
  v_slug text;
  v_name text;
begin
  perform private.require_active_verified_user();
  if p_key is not null then
    select id into v_id from public.inquiry_messages where sender_id = auth.uid() and client_key = p_key;
    if found then
      return v_id;
    end if;
  end if;

  select * into v_inq from public.inquiries where id = p_inquiry for update;
  if not found or not private.can_read_inquiry(p_inquiry) then
    raise exception 'conversation not found' using errcode = 'P0002';
  end if;
  if v_inq.requester_id = auth.uid() then
    v_side := 'requester';
  elsif private.can_manage_inquiry(p_inquiry) then
    v_side := 'provider';
  else
    raise exception 'not permitted' using errcode = '42501';
  end if;
  if v_inq.status in ('closed', 'spam') then
    raise exception 'this conversation is closed' using errcode = '55000';
  end if;
  if char_length(v_body) not between 1 and 2000 then
    raise exception 'message must be 1 to 2000 characters' using errcode = '22023';
  end if;
  if not public.check_rate_limit('message.send', 60, 3600) then
    raise exception 'rate limit exceeded' using errcode = '54000';
  end if;

  insert into public.inquiry_messages (inquiry_id, sender_id, sender_side, body, client_key)
  values (p_inquiry, auth.uid(), v_side, v_body, p_key)
  returning id into v_id;
  update public.inquiries
     set last_message_at = now(),
         status = case when v_side = 'provider' and status = 'new' then 'contacted'::public.inquiry_status else status end
   where id = p_inquiry;
  perform private.mark_read(p_inquiry);

  select l.title, o.slug into v_title, v_slug
    from public.property_listings l join public.organizations o on o.id = l.organization_id where l.id = v_inq.listing_id;
  select coalesce(display_name, 'Someone') into v_name from public.profiles where id = auth.uid();
  if v_side = 'requester' then
    perform private.notify_lead_managers(v_inq.organization_id, 'message_new', 'New message: ' || v_title,
      v_name || ': ' || v_body, '/portal/' || v_slug || '/leads/' || p_inquiry);
  else
    perform private.notify(v_inq.requester_id, 'message_new', 'Reply about ' || v_title, v_body, '/inbox/' || p_inquiry);
  end if;
  return v_id;
end;
$$;

create function public.set_inquiry_status(p_inquiry uuid, p_status public.inquiry_status) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_before public.inquiry_status;
  v_org uuid;
begin
  perform private.require_active_verified_user();
  if not private.can_manage_inquiry(p_inquiry) then
    raise exception 'not permitted' using errcode = '42501';
  end if;
  select status, organization_id into v_before, v_org from public.inquiries where id = p_inquiry for update;
  update public.inquiries set status = p_status where id = p_inquiry;
  perform private.audit('inquiry.status', 'inquiry', p_inquiry, v_org,
    jsonb_build_object('status', v_before), jsonb_build_object('status', p_status));
end;
$$;

create function public.mark_inquiry_read(p_inquiry uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.can_read_inquiry(p_inquiry) then
    raise exception 'conversation not found' using errcode = 'P0002';
  end if;
  perform private.mark_read(p_inquiry);
end;
$$;

-- Conversations with something new from the other side, across everything the user can read.
create function public.unread_conversation_count() returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::int
    from public.inquiries i
   where (i.requester_id = auth.uid() or private.has_org_role(i.organization_id, private.lead_readers()))
     and i.status <> 'spam'
     and exists (
       select 1 from public.inquiry_messages m
        where m.inquiry_id = i.id
          and m.sender_id is distinct from auth.uid()
          and (i.requester_id = auth.uid()) = (m.sender_side <> 'requester')
          and m.created_at > coalesce((select r.last_read_at from public.inquiry_reads r
                                        where r.inquiry_id = i.id and r.user_id = auth.uid()), '-infinity'::timestamptz)
     );
$$;

-- Inbox rows. Without p_org: the user's own inquiries. With p_org: that organisation's leads.
create function public.get_inbox(p_org uuid default null)
returns table (
  id uuid, status public.inquiry_status, listing_id uuid, listing_title text, listing_slug text,
  organization_name text, organization_slug text, counterpart text, last_message text, last_side text,
  last_message_at timestamptz, unread boolean, has_active_viewing boolean
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not private.is_active_user() then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_org is not null and not private.has_org_role(p_org, private.lead_readers()) then
    raise exception 'not permitted' using errcode = '42501';
  end if;
  return query
    select i.id, i.status, l.id, l.title, l.slug::text, o.name, o.slug::text,
           case when p_org is null then o.name else coalesce(p.display_name, 'Someone') end,
           lm.body, lm.sender_side, i.last_message_at,
           exists (
             select 1 from public.inquiry_messages m
              where m.inquiry_id = i.id and m.sender_id is distinct from auth.uid()
                and (p_org is null) = (m.sender_side <> 'requester')
                and m.created_at > coalesce((select r.last_read_at from public.inquiry_reads r
                                              where r.inquiry_id = i.id and r.user_id = auth.uid()), '-infinity'::timestamptz)
           ),
           exists (select 1 from public.viewing_requests v where v.inquiry_id = i.id and v.status in ('requested', 'proposed', 'confirmed'))
      from public.inquiries i
      join public.property_listings l on l.id = i.listing_id
      join public.organizations o on o.id = i.organization_id
      join public.profiles p on p.id = i.requester_id
      left join lateral (
        select m.body, m.sender_side from public.inquiry_messages m
         where m.inquiry_id = i.id order by m.created_at desc limit 1
      ) lm on true
     where (p_org is null and i.requester_id = auth.uid())
        or (p_org is not null and i.organization_id = p_org)
     order by i.last_message_at desc
     limit 200;
end;
$$;

-- One conversation with its messages and viewing requests. The requester's phone is only included for
-- the provider side, and only when the requester chose to share it.
create function public.get_conversation(p_inquiry uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_inq public.inquiries;
  v_side text;
  v_result jsonb;
begin
  if not private.can_read_inquiry(p_inquiry) then
    raise exception 'conversation not found' using errcode = 'P0002';
  end if;
  select * into v_inq from public.inquiries where id = p_inquiry;
  v_side := case when v_inq.requester_id = auth.uid() then 'requester' else 'provider' end;

  select jsonb_build_object(
    'inquiry', jsonb_build_object(
      'id', v_inq.id, 'status', v_inq.status, 'created_at', v_inq.created_at,
      'listing_id', l.id, 'listing_title', l.title, 'listing_slug', l.slug,
      'listing_public', private.listing_is_public(l.id),
      'organization_name', o.name, 'organization_slug', o.slug,
      'requester_name', coalesce(rp.display_name, 'Someone'),
      'contact_phone', case when v_side = 'provider' then v_inq.contact_phone end,
      'shared_phone', v_inq.contact_phone is not null,
      'my_side', v_side,
      'can_reply', v_inq.status not in ('closed', 'spam')
                   and (v_side = 'requester' or private.can_manage_inquiry(v_inq.id)),
      'can_manage', private.can_manage_inquiry(v_inq.id)
    ),
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', m.id, 'side', m.sender_side, 'body', m.body, 'created_at', m.created_at,
               'mine', m.sender_id = auth.uid(),
               'sender', case m.sender_side
                           when 'requester' then coalesce(sp.display_name, 'Someone')
                           when 'provider' then coalesce(split_part(sp.display_name, ' ', 1) || ' · ', '') || o.name
                           else 'BAID Atlas' end)
             order by m.created_at)
        from public.inquiry_messages m left join public.profiles sp on sp.id = m.sender_id
       where m.inquiry_id = v_inq.id), '[]'::jsonb),
    'viewings', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', v.id, 'status', v.status, 'start', v.requested_start, 'end', v.requested_end,
               'timezone', v.timezone, 'note', v.note, 'updated_at', v.updated_at)
             order by v.created_at desc)
        from public.viewing_requests v where v.inquiry_id = v_inq.id), '[]'::jsonb)
  ) into v_result
  from public.property_listings l
  join public.organizations o on o.id = l.organization_id
  join public.profiles rp on rp.id = v_inq.requester_id
  where l.id = v_inq.listing_id;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Viewing requests
-- ---------------------------------------------------------------------------
create function public.request_viewing(p_inquiry uuid, p_start timestamptz, p_end timestamptz, p_timezone text, p_note text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_inq public.inquiries;
  v_id uuid;
  v_slug text;
  v_title text;
begin
  perform private.require_active_verified_user();
  select * into v_inq from public.inquiries where id = p_inquiry for update;
  if not found or v_inq.requester_id <> auth.uid() then
    raise exception 'conversation not found' using errcode = 'P0002';
  end if;
  if v_inq.status in ('closed', 'spam') then
    raise exception 'this conversation is closed' using errcode = '55000';
  end if;
  perform private.check_viewing_slot(p_start, p_end, p_timezone);
  if p_note is not null and char_length(p_note) > 500 then
    raise exception 'note must be 500 characters or fewer' using errcode = '22023';
  end if;
  if exists (select 1 from public.viewing_requests where inquiry_id = p_inquiry and status in ('requested', 'proposed', 'confirmed')) then
    raise exception 'a viewing is already in progress for this conversation' using errcode = '23505';
  end if;
  if not public.check_rate_limit('viewing.request', 10, 3600) then
    raise exception 'rate limit exceeded' using errcode = '54000';
  end if;

  insert into public.viewing_requests (inquiry_id, requested_start, requested_end, timezone, note, updated_by)
  values (p_inquiry, p_start, p_end, p_timezone, nullif(btrim(p_note), ''), auth.uid())
  returning id into v_id;
  update public.inquiries
     set status = case when status in ('new', 'contacted', 'qualified') then 'viewing_requested'::public.inquiry_status else status end,
         last_message_at = now()
   where id = p_inquiry;
  insert into public.inquiry_messages (inquiry_id, sender_id, sender_side, body)
  values (p_inquiry, null, 'system', 'Viewing requested for ' || private.slot_label(p_start, p_timezone) || '.');

  select l.title, o.slug into v_title, v_slug
    from public.property_listings l join public.organizations o on o.id = l.organization_id where l.id = v_inq.listing_id;
  perform private.notify_lead_managers(v_inq.organization_id, 'viewing_requested', 'Viewing request: ' || v_title,
    private.slot_label(p_start, p_timezone), '/portal/' || v_slug || '/leads/' || p_inquiry);
  perform private.audit('viewing.request', 'viewing_request', v_id, v_inq.organization_id, null,
    jsonb_build_object('start', p_start, 'end', p_end, 'timezone', p_timezone));
  return v_id;
end;
$$;

-- Providers confirm, decline, propose another time or mark as done; requesters accept a proposal or cancel.
create function public.respond_viewing(p_viewing uuid, p_action text, p_start timestamptz, p_end timestamptz, p_note text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_view public.viewing_requests;
  v_inq public.inquiries;
  v_provider boolean;
  v_new public.viewing_status;
  v_text text;
  v_slug text;
  v_title text;
begin
  perform private.require_active_verified_user();
  select * into v_view from public.viewing_requests where id = p_viewing for update;
  if not found then
    raise exception 'viewing not found' using errcode = 'P0002';
  end if;
  select * into v_inq from public.inquiries where id = v_view.inquiry_id;
  v_provider := private.can_manage_inquiry(v_inq.id);
  if not v_provider and v_inq.requester_id <> auth.uid() then
    raise exception 'viewing not found' using errcode = 'P0002';
  end if;

  if v_provider and p_action = 'confirm' and v_view.status = 'requested' then
    v_new := 'confirmed';
  elsif v_provider and p_action = 'decline' and v_view.status in ('requested', 'proposed') then
    v_new := 'declined';
  elsif v_provider and p_action = 'propose' and v_view.status in ('requested', 'confirmed') then
    perform private.check_viewing_slot(p_start, p_end, v_view.timezone);
    v_new := 'proposed';
  elsif v_provider and p_action = 'complete' and v_view.status = 'confirmed' then
    v_new := 'completed';
  elsif not v_provider and p_action = 'confirm' and v_view.status = 'proposed' then
    v_new := 'confirmed';
  elsif p_action = 'cancel' and v_view.status in ('requested', 'proposed', 'confirmed') then
    v_new := 'cancelled';
  else
    raise exception 'that change is not possible for this viewing' using errcode = '55000';
  end if;
  if p_note is not null and char_length(p_note) > 500 then
    raise exception 'note must be 500 characters or fewer' using errcode = '22023';
  end if;

  update public.viewing_requests
     set status = v_new,
         requested_start = case when v_new = 'proposed' then p_start else requested_start end,
         requested_end = case when v_new = 'proposed' then p_end else requested_end end,
         note = coalesce(nullif(btrim(p_note), ''), note),
         updated_by = auth.uid()
   where id = p_viewing;
  if v_new = 'completed' then
    update public.inquiries set status = 'converted' where id = v_inq.id and status not in ('closed', 'spam');
  end if;

  v_text := case v_new
    when 'confirmed' then 'Viewing confirmed for ' || private.slot_label(v_view.requested_start, v_view.timezone) || '.'
    when 'declined' then 'The provider declined the viewing request.'
    when 'proposed' then 'The provider proposed ' || private.slot_label(p_start, v_view.timezone) || ' instead.'
    when 'completed' then 'Viewing marked as done.'
    else 'The viewing was cancelled.' end;
  if v_new = 'confirmed' and v_view.status = 'proposed' then
    v_text := 'Viewing confirmed for ' || private.slot_label(v_view.requested_start, v_view.timezone) || '.';
  end if;
  insert into public.inquiry_messages (inquiry_id, sender_id, sender_side, body) values (v_inq.id, null, 'system', v_text);
  update public.inquiries set last_message_at = now() where id = v_inq.id;

  select l.title, o.slug into v_title, v_slug
    from public.property_listings l join public.organizations o on o.id = l.organization_id where l.id = v_inq.listing_id;
  if v_provider then
    perform private.notify(v_inq.requester_id, 'viewing_update', 'Viewing update: ' || v_title, v_text, '/inbox/' || v_inq.id);
  else
    perform private.notify_lead_managers(v_inq.organization_id, 'viewing_update', 'Viewing update: ' || v_title, v_text,
      '/portal/' || v_slug || '/leads/' || v_inq.id);
  end if;
  perform private.audit('viewing.' || v_new::text, 'viewing_request', p_viewing, v_inq.organization_id,
    jsonb_build_object('status', v_view.status), jsonb_build_object('status', v_new));
end;
$$;

-- ---------------------------------------------------------------------------
-- Listing reports
-- ---------------------------------------------------------------------------
-- Reporting is idempotent per person and listing while a report is open.
create function public.report_listing(p_listing uuid, p_reason public.report_reason, p_details text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  perform private.require_active_verified_user();
  if not private.listing_is_public(p_listing) then
    raise exception 'listing not available' using errcode = 'P0002';
  end if;
  select id into v_id from public.listing_reports
   where reporter_id = auth.uid() and listing_id = p_listing and status in ('open', 'reviewing');
  if found then
    return v_id;
  end if;
  if p_details is not null and char_length(p_details) > 1000 then
    raise exception 'details must be 1000 characters or fewer' using errcode = '22023';
  end if;
  if p_reason = 'other' and char_length(btrim(coalesce(p_details, ''))) < 10 then
    raise exception 'please describe the problem' using errcode = '22023';
  end if;
  if not public.check_rate_limit('listing.report', 10, 86400) then
    raise exception 'rate limit exceeded' using errcode = '54000';
  end if;
  insert into public.listing_reports (listing_id, reporter_id, reason, details)
  values (p_listing, auth.uid(), p_reason, nullif(btrim(p_details), ''))
  returning id into v_id;
  perform private.audit('report.create', 'listing_report', v_id,
    (select organization_id from public.property_listings where id = p_listing), null,
    jsonb_build_object('reason', p_reason));
  return v_id;
end;
$$;

create function public.resolve_report(p_report uuid, p_status public.report_status, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_before public.report_status;
begin
  if not private.is_staff(array['moderator', 'platform_admin']::public.staff_role[]) then
    raise exception 'not permitted' using errcode = '42501';
  end if;
  if p_status = 'open' then
    raise exception 'choose reviewing, actioned or dismissed' using errcode = '22023';
  end if;
  if p_status in ('actioned', 'dismissed') and char_length(btrim(coalesce(p_note, ''))) < 3 then
    raise exception 'add a short note explaining the decision' using errcode = '22023';
  end if;
  select status into v_before from public.listing_reports where id = p_report for update;
  if not found then
    raise exception 'report not found' using errcode = 'P0002';
  end if;
  update public.listing_reports
     set status = p_status,
         resolution_note = coalesce(nullif(btrim(p_note), ''), resolution_note),
         resolved_by = case when p_status in ('actioned', 'dismissed') then auth.uid() end,
         resolved_at = case when p_status in ('actioned', 'dismissed') then now() end
   where id = p_report;
  perform private.audit('report.' || p_status::text, 'listing_report', p_report, null,
    jsonb_build_object('status', v_before), jsonb_build_object('status', p_status));
end;
$$;

-- Moderator queue: open reports grouped with the listing they are about.
create function public.get_report_queue()
returns table (
  id uuid, status public.report_status, reason public.report_reason, details text, created_at timestamptz,
  listing_id uuid, listing_title text, listing_slug text, listing_status text, organization_name text,
  reports_on_listing integer
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_staff(array['moderator', 'platform_admin']::public.staff_role[]) then
    raise exception 'not permitted' using errcode = '42501';
  end if;
  return query
    select r.id, r.status, r.reason, r.details, r.created_at, l.id, l.title, l.slug::text, l.status::text, o.name,
           (select count(*)::int from public.listing_reports r2 where r2.listing_id = l.id and r2.status in ('open', 'reviewing'))
      from public.listing_reports r
      join public.property_listings l on l.id = r.listing_id
      join public.organizations o on o.id = l.organization_id
     where r.status in ('open', 'reviewing')
     order by r.created_at
     limit 200;
end;
$$;

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create function public.mark_notifications_read(p_ids uuid[] default null) returns void
language sql security definer set search_path = '' as $$
  update public.notifications set read_at = now()
   where user_id = auth.uid() and read_at is null and (p_ids is null or id = any (p_ids));
$$;

-- ---------------------------------------------------------------------------
-- Function permissions
-- ---------------------------------------------------------------------------
revoke all on function private.lead_readers(), private.lead_managers(), private.can_read_inquiry(uuid),
  private.can_manage_inquiry(uuid), private.notify(uuid, text, text, text, text),
  private.notify_lead_managers(uuid, text, text, text, text), private.mark_read(uuid),
  private.check_viewing_slot(timestamptz, timestamptz, text), private.slot_label(timestamptz, text) from public, anon;
grant execute on function private.lead_readers(), private.lead_managers(), private.can_read_inquiry(uuid),
  private.can_manage_inquiry(uuid) to authenticated;

revoke all on function public.send_inquiry(uuid, text, boolean, uuid), public.send_message(uuid, text, uuid),
  public.set_inquiry_status(uuid, public.inquiry_status), public.mark_inquiry_read(uuid),
  public.unread_conversation_count(), public.get_inbox(uuid), public.get_conversation(uuid),
  public.request_viewing(uuid, timestamptz, timestamptz, text, text),
  public.respond_viewing(uuid, text, timestamptz, timestamptz, text),
  public.report_listing(uuid, public.report_reason, text), public.resolve_report(uuid, public.report_status, text),
  public.get_report_queue(), public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.send_inquiry(uuid, text, boolean, uuid), public.send_message(uuid, text, uuid),
  public.set_inquiry_status(uuid, public.inquiry_status), public.mark_inquiry_read(uuid),
  public.unread_conversation_count(), public.get_inbox(uuid), public.get_conversation(uuid),
  public.request_viewing(uuid, timestamptz, timestamptz, text, text),
  public.respond_viewing(uuid, text, timestamptz, timestamptz, text),
  public.report_listing(uuid, public.report_reason, text), public.resolve_report(uuid, public.report_status, text),
  public.get_report_queue(), public.mark_notifications_read(uuid[]) to authenticated;
