import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ListingCard, VerifiedPill } from "@/components/listings/listing-card";
import { StatusChip } from "@/components/listings/status-chip";
import { Steps } from "@/components/listings/steps";
import { FilterSheet } from "@/components/listings/filter-sheet";
import { Gallery } from "@/components/listings/gallery";
import type { ListingCardData } from "@/lib/listings/types";

export const metadata: Metadata = { title: "Design gallery", robots: { index: false } };

// Component gallery for visual review and screenshots. Disabled unless explicitly enabled at build time;
// every sample is labelled and none of it is real listing data.
const enabled = process.env.NEXT_PUBLIC_DESIGN_GALLERY === "1";

const sample = (over: Partial<ListingCardData>): ListingCardData => ({
  id: "00000000-0000-0000-0000-000000000000",
  slug: "sample",
  title: "Sample listing",
  purpose: "sale",
  asking_price: 0,
  currency: "GHS",
  price_period: "total",
  published_at: new Date().toISOString(),
  is_sponsored: false,
  property_type: "house",
  region: "Greater Accra",
  city: "City",
  locality: "Area",
  bedrooms: 3,
  bathrooms: 2,
  floor_area: 180,
  floor_area_unit: "sqm",
  land_area: null,
  land_area_unit: null,
  organization_name: "Sample Provider",
  organization_slug: "sample",
  organization_verification_status: "verified",
  organization_verification_scope: "Sample scope",
  cover_path: null,
  cover_alt: null,
  cover_is_render: false,
  cover_is_staged: false,
  image_count: 6,
  cover_url: null,
  ...over,
});

const samples = [
  sample({ id: "s1", title: "Sample: family home", asking_price: 1250000 }),
  sample({ id: "s2", title: "Sample: two-bed apartment", purpose: "long_term_rent", property_type: "apartment", asking_price: 6500, price_period: "per_month", bedrooms: 2, bathrooms: 2, floor_area: 95, is_sponsored: true }),
  sample({ id: "s3", title: "Sample: serviced plot", property_type: "land", bedrooms: null, bathrooms: null, floor_area: null, floor_area_unit: null, land_area: 2, land_area_unit: "plot", asking_price: 85000, currency: "USD", organization_verification_status: "not_started" }),
  sample({ id: "s4", title: "Sample: off-plan townhouse", asking_price: 2100000, cover_is_render: true }),
];

export default function DesignGallery() {
  if (!enabled) notFound();
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <div className="rounded-2xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm font-semibold">
        Design samples — not real listings. This page is disabled in production.
      </div>

      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">Listing cards</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {samples.map((l) => (
            <li key={l.id}>
              <ListingCard l={l} signedIn saved={l.id === "s2"} />
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">Rail and compact rows</h2>
        <ul className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2">
          {samples.map((l) => (
            <li key={l.id}>
              <ListingCard l={l} layout="rail" signedIn />
            </li>
          ))}
        </ul>
        <ul className="grid gap-2">
          {samples.slice(0, 2).map((l) => (
            <li key={l.id}>
              <ListingCard l={l} layout="row" signedIn />
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">Gallery (empty state)</h2>
        <Gallery media={[]} title="Sample" />
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">Statuses, steps and trust</h2>
        <div className="flex flex-wrap gap-2">
          {["draft", "submitted", "changes_requested", "approved", "published", "paused", "rejected", "sold"].map((s) => (
            <StatusChip key={s} status={s} />
          ))}
        </div>
        <Steps current={2} />
        <VerifiedPill scope="Sample scope — business registration matches name" />
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">Filter button:</span>
          <FilterSheet filters={{ purpose: "sale" } as never} count={2} />
        </div>
      </section>
    </div>
  );
}
