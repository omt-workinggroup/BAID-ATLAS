-- Public organisation directory without a security definer view.
-- Active organisations are public directory entries; access is limited to public columns
-- by column grants, and to active rows by RLS. created_by stays private.

create policy "organizations: public directory" on public.organizations
  for select to anon, authenticated using (status = 'active');

revoke select on public.organizations from anon, authenticated;
grant select (id, name, slug, type, description, website, public_email, public_phone, country_code,
              status, verification_status, created_at, updated_at)
  on public.organizations to anon, authenticated;

alter view public.public_organizations set (security_invoker = true);
