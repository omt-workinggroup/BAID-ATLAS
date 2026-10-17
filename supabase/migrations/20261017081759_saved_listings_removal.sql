-- Phase 2: let users remove their own saved listings.
-- Kept separate because it grants DELETE, which needs explicit approval to apply remotely.

create policy "saved: remove own" on public.saved_listings
  for delete to authenticated using (user_id = auth.uid());
grant delete on public.saved_listings to authenticated;
