-- Account applications: what an agent, company, developer or home owner submits at sign-up (step 3 details,
-- documents, declarations), and its review status. Account approval is separate from property approval.
-- Documents go to the private "applications" storage bucket, in a folder named after the user's id; only
-- the user and verification reviewers can read them, and they are never shown on public profiles.

create type public.account_type as enum ('agent', 'company', 'developer', 'owner');
create type public.application_status as enum
  ('submitted', 'under_review', 'more_info_required', 'approved', 'rejected', 'suspended');

create table public.account_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reference text not null unique default ('PQ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  account_type public.account_type not null,
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null check (char_length(last_name) between 1 and 80),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object' and pg_column_size(details) < 20000),
  -- [{ "field": "licence", "path": "<user id>/licence-....pdf", "name": "licence.pdf", "size": 12345 }]
  documents jsonb not null default '[]'::jsonb check (jsonb_typeof(documents) = 'array' and jsonb_array_length(documents) <= 12),
  declared_at timestamptz not null default now(),
  terms_accepted_at timestamptz not null default now(),
  status public.application_status not null default 'submitted',
  reviewer_note text,
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index account_applications_user_idx on public.account_applications (user_id, created_at desc);
create index account_applications_queue_idx on public.account_applications (status, created_at)
  where status in ('submitted', 'under_review');
create trigger account_applications_set_updated_at before update on public.account_applications
  for each row execute function private.set_updated_at();

alter table public.account_applications enable row level security;

-- Applicants see and create their own; a new application always starts as "submitted".
create policy "applicants read their applications" on public.account_applications
  for select to authenticated using (user_id = auth.uid());
create policy "applicants submit applications" on public.account_applications
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'submitted' and reviewer_note is null and reviewed_by is null and reviewed_at is null);
-- Reviewers see the queue and decide.
create policy "reviewers read applications" on public.account_applications
  for select to authenticated using (private.has_staff_role('verification_reviewer') or private.has_staff_role('platform_admin'));
create policy "reviewers decide applications" on public.account_applications
  for update to authenticated
  using (private.has_staff_role('verification_reviewer') or private.has_staff_role('platform_admin'))
  with check (private.has_staff_role('verification_reviewer') or private.has_staff_role('platform_admin'));

grant select, insert on public.account_applications to authenticated;
grant update (status, reviewer_note, reviewed_by, reviewed_at) on public.account_applications to authenticated;

-- Private document storage: 10 MB per file; PDFs and photos only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('applications', 'applications', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "applicants upload their documents" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'applications' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "applicants read their documents" on storage.objects
  for select to authenticated
  using (bucket_id = 'applications' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "reviewers read application documents" on storage.objects
  for select to authenticated
  using (bucket_id = 'applications' and (private.has_staff_role('verification_reviewer') or private.has_staff_role('platform_admin')));
-- Replacing or removing a document before the application is submitted.
create policy "applicants remove their documents" on storage.objects
  for delete to authenticated
  using (bucket_id = 'applications' and (storage.foldername(name))[1] = auth.uid()::text);
