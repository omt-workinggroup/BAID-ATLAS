-- Propertiq slice 1, part 3 of 3: give every existing listing a reference number, then make it required.

update public.property_listings set reference = private.new_listing_reference() where reference is null;
alter table public.property_listings
  alter column reference set not null,
  alter column reference set default private.new_listing_reference(),
  add constraint property_listings_reference_format check (reference ~ '^PQ-[2-9A-HJKMNP-Z]{6}$');
create unique index property_listings_reference_key on public.property_listings (reference);
