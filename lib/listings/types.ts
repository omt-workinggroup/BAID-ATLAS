import type { AreaUnit, PricePeriod, PropertyType, Purpose } from "./format";

export type ListingCardData = {
  id: string;
  slug: string;
  title: string;
  purpose: Purpose;
  asking_price: number | string;
  currency: string;
  price_period: PricePeriod;
  status?: string;
  published_at: string | null;
  is_sponsored: boolean;
  property_type: PropertyType;
  region: string;
  city: string;
  locality: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor_area: number | string | null;
  floor_area_unit: AreaUnit | null;
  land_area: number | string | null;
  land_area_unit: AreaUnit | null;
  organization_name: string;
  organization_slug: string;
  organization_verification_status: string;
  organization_verification_scope: string | null;
  cover_path: string | null;
  cover_alt: string | null;
  cover_is_render: boolean | null;
  cover_is_staged: boolean | null;
  image_count: number;
  // Resolved server-side; never stored.
  cover_url?: string | null;
};

export type MediaItem = {
  id: string;
  url: string | null;
  alt_text: string | null;
  is_render: boolean;
  is_virtually_staged: boolean;
  width: number | null;
  height: number | null;
};

export const CARD_COLUMNS =
  "id, slug, title, purpose, asking_price, currency, price_period, status, published_at, is_sponsored, property_type, region, city, locality, bedrooms, bathrooms, floor_area, floor_area_unit, land_area, land_area_unit, organization_name, organization_slug, organization_verification_status, organization_verification_scope, cover_path, cover_alt, cover_is_render, cover_is_staged, image_count";
