import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Gallery } from "@/components/listings/gallery";
import { SaveButton } from "@/components/listings/save-button";
import { ShareButton } from "@/components/listings/share-button";
import { VerifiedPill } from "@/components/listings/listing-card";
import { getCurrentUser } from "@/lib/auth/session";
import { getPublicListing, savedListingIds } from "@/lib/listings/queries";
import {
  formatArea,
  formatLocation,
  formatPrice,
  listedAgo,
  PROPERTY_TYPE_LABELS,
  PURPOSE_LABELS,
} from "@/lib/listings/format";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicListing(slug);
  if (!data) return { title: "Property not found" };
  const { card } = data;
  const price = formatPrice(card.asking_price, card.currency, card.price_period);
  return {
    title: card.title,
    description: `${PURPOSE_LABELS[card.purpose]} · ${price} · ${formatLocation(card.locality, card.city, card.region)}`,
    openGraph: { images: data.media[0]?.url ? [{ url: data.media[0].url }] : undefined },
  };
}

export default async function PropertyPage({ params }: Params) {
  const { slug } = await params;
  const [data, user] = await Promise.all([getPublicListing(slug), getCurrentUser()]);
  if (!data) notFound();
  const { card: l, description, media } = data;
  const saved = (await savedListingIds(user?.id, [l.id])).has(l.id);
  const price = formatPrice(l.asking_price, l.currency, l.price_period);
  const floor = formatArea(l.floor_area, l.floor_area_unit);
  const land = formatArea(l.land_area, l.land_area_unit);
  const anyRender = media.some((m) => m.is_render || m.is_virtually_staged);

  const facts = [
    { label: "Type", value: PROPERTY_TYPE_LABELS[l.property_type] },
    l.bedrooms !== null && { label: "Bedrooms", value: String(l.bedrooms) },
    l.bathrooms !== null && { label: "Bathrooms", value: String(l.bathrooms) },
    floor && { label: "Floor area", value: floor },
    land && { label: "Land area", value: land },
  ].filter(Boolean) as { label: string; value: string }[];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: l.title,
    datePosted: l.published_at,
    offers: { "@type": "Offer", price: String(l.asking_price), priceCurrency: l.currency },
    address: { "@type": "PostalAddress", addressLocality: l.city, addressRegion: l.region, addressCountry: "GH" },
  };

  return (
    <article className="grid grid-cols-[minmax(0,1fr)] gap-6 pb-24 lg:pb-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted">
        <Link href="/explore" className="hover:text-text">Explore</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/explore?purpose=${l.purpose}`} className="hover:text-text">{PURPOSE_LABELS[l.purpose]}</Link>
      </nav>

      <Gallery media={media} title={l.title} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="grid gap-6">
          <header className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-contrast">{PURPOSE_LABELS[l.purpose]}</span>
              {l.is_sponsored && <span className="rounded-md bg-sponsored px-2.5 py-1 text-xs font-semibold text-white">Sponsored</span>}
              <span className="text-xs text-muted">{listedAgo(l.published_at)}</span>
            </div>
            <h1 className="text-[2.1rem] leading-[1.1] sm:text-5xl">{l.title}</h1>
            <p className="flex items-center gap-1.5 text-muted">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
              </svg>
              {formatLocation(l.locality, l.city, l.region)}
            </p>
            <p className="text-[1.75rem] font-bold tracking-tight">{price}</p>
            <div className="flex flex-wrap gap-2">
              <SaveButton listingId={l.id} initialSaved={saved} signedIn={Boolean(user)} slug={l.slug} variant="pill" />
              <ShareButton title={l.title} path={`/properties/${l.slug}`} />
            </div>
          </header>

          <section aria-labelledby="facts-heading" className="grid gap-3">
            <h2 id="facts-heading" className="text-2xl">Key facts</h2>
            <dl className="grid grid-cols-2 border-t border-border sm:grid-cols-3">
              {facts.map((f) => (
                <div key={f.label} className="grid gap-0.5 border-b border-border py-3.5 pr-3">
                  <dt className="text-xs text-muted">{f.label}</dt>
                  <dd className="truncate font-semibold">{f.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {description && (
            <section className="grid gap-2">
              <h2 className="text-2xl">About this property</h2>
              <p className="whitespace-pre-line leading-relaxed text-text/90">{description}</p>
            </section>
          )}

          {anyRender && (
            <p className="rounded-2xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm">
              Some images are renders or virtually staged. They don&apos;t show the property&apos;s current condition,
              completion or exact dimensions.
            </p>
          )}

          <section className="grid gap-3">
            <h2 className="text-2xl">Location</h2>
            <div className="relative overflow-hidden rounded-2xl border border-border bg-surface-muted p-5">
              <div aria-hidden="true" className="absolute inset-0 opacity-30 [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:28px_28px]" />
              <div className="relative grid gap-1">
                <span className="mb-2 grid size-12 place-items-center rounded-full bg-primary/10">
                  <span className="size-4 rounded-full bg-gold ring-8 ring-gold/25" />
                </span>
                <p className="font-bold">{formatLocation(l.locality, l.city, l.region)}</p>
                <p className="text-sm text-muted">
                  Approximate area only. The exact address is shared by the provider once you&apos;re in touch.
                </p>
              </div>
            </div>
          </section>
        </div>

        <aside className="grid gap-4 lg:sticky lg:top-24">
          <section className="grid gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <p className="text-xs text-muted">Listed by</p>
            <Link href={`/providers/${l.organization_slug}`} className="flex items-center gap-3">
              <span className="grid size-12 flex-none place-items-center rounded-xl bg-primary font-[family-name:var(--font-display)] text-xl text-[#dbb17d]">
                {l.organization_name.slice(0, 1)}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{l.organization_name}</span>
                <span className="block text-xs text-muted">View provider profile</span>
              </span>
            </Link>
            {l.organization_verification_status === "verified" ? (
              <div className="grid gap-1 rounded-2xl bg-verified/5 p-3">
                <VerifiedPill scope={l.organization_verification_scope} />
                <p className="text-xs text-muted">
                  Checked by BAID Atlas. This doesn&apos;t prove ownership of this property — always confirm title documents.
                </p>
              </div>
            ) : null}
            <button
              type="button"
              disabled
              className="min-h-12 rounded-xl bg-primary font-semibold text-primary-contrast opacity-60"
              aria-describedby="contact-soon"
            >
              Contact provider
            </button>
            <p id="contact-soon" className="text-center text-xs text-muted">Secure messaging opens in the next release.</p>
          </section>
          <section className="grid gap-2 rounded-2xl border border-border bg-surface p-5 text-sm">
            <h2 className="text-xl">Before you pay anything</h2>
            <ul className="grid list-disc gap-1 pl-5 text-muted">
              <li>Never pay a deposit before viewing in person.</li>
              <li>Ask for title documents and verify them at the Lands Commission.</li>
              <li>BAID Atlas never asks you to pay outside the platform.</li>
            </ul>
          </section>
        </aside>
      </div>

      {/* Mobile action bar */}
      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold">{price}</p>
            <p className="truncate text-xs text-muted">{l.organization_name}</p>
          </div>
          <button type="button" disabled className="min-h-12 rounded-xl bg-primary px-5 font-semibold text-primary-contrast opacity-60">
            Contact · soon
          </button>
        </div>
      </div>
    </article>
  );
}
