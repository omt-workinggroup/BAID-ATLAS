import Image from "next/image";
import Link from "next/link";
import { SaveButton } from "@/components/listings/save-button";
import { NoPhoto } from "@/components/listings/no-photo";
import {
  formatArea,
  formatLocation,
  formatPrice,
  PROPERTY_TYPE_LABELS,
  PURPOSE_LABELS,
} from "@/lib/listings/format";
import type { ListingCardData } from "@/lib/listings/types";

export function ListingFacts({ l, className = "" }: { l: ListingCardData; className?: string }) {
  const area = formatArea(l.floor_area, l.floor_area_unit) ?? formatArea(l.land_area, l.land_area_unit);
  const facts = [
    l.bedrooms !== null && l.property_type !== "land" ? `${l.bedrooms} bed` : null,
    l.bathrooms !== null && l.property_type !== "land" ? `${l.bathrooms} bath` : null,
    area,
  ].filter(Boolean);
  if (facts.length === 0) return null;
  return (
    <ul className={`flex flex-wrap items-center gap-y-1 text-sm text-muted [&>li+li]:before:mx-2 [&>li+li]:before:text-border [&>li+li]:before:content-['|'] ${className}`}>
      {facts.map((f) => (
        <li key={f} className="flex items-center">
          {f}
        </li>
      ))}
    </ul>
  );
}

export function VerifiedPill({ scope, compact = false }: { scope: string | null; compact?: boolean }) {
  return (
    <span
      className="inline-flex max-w-full items-center gap-1 text-xs font-semibold text-verified"
      title={scope ? `Verified: ${scope}. This does not prove ownership of any specific property.` : undefined}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
        <path d="M5 12l5 5 9-10" />
      </svg>
      <span className="truncate">{compact ? "Verified provider" : `Verified: ${scope ?? "provider"}`}</span>
    </span>
  );
}

export function ListingCard({
  l,
  saved,
  signedIn,
  priority = false,
  layout = "grid",
}: {
  l: ListingCardData;
  saved?: boolean;
  signedIn?: boolean;
  priority?: boolean;
  layout?: "grid" | "rail" | "row";
}) {
  const href = `/properties/${l.slug}`;
  const row = layout === "row";
  const tag = "rounded-md px-2 py-1 text-[0.68rem] font-semibold tracking-wide";
  return (
    <article className={`group relative ${row ? "flex gap-3 rounded-2xl border border-border bg-surface p-2" : "grid gap-3"} ${layout === "rail" ? "w-[17.5rem] flex-none snap-start" : ""}`}>
      <div className={`relative overflow-hidden rounded-xl bg-surface-muted ${row ? "aspect-square w-28 flex-none" : "aspect-[4/3]"}`}>
        {l.cover_url ? (
          <Image
            src={l.cover_url}
            alt={l.cover_alt ?? l.title}
            fill
            sizes={row ? "112px" : "(min-width: 1024px) 360px, (min-width: 640px) 45vw, 90vw"}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none"
            priority={priority}
            unoptimized
          />
        ) : (
          <NoPhoto compact={row} />
        )}
        {!row && (
          <div className="absolute inset-x-2.5 top-2.5 flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              <span className={`${tag} bg-white/95 text-text shadow-sm`}>{PURPOSE_LABELS[l.purpose]}</span>
              {l.is_sponsored && <span className={`${tag} bg-sponsored text-white`}>Sponsored</span>}
              {(l.cover_is_render || l.cover_is_staged) && (
                <span className={`${tag} bg-warning text-white`}>{l.cover_is_render ? "Render" : "Staged"}</span>
              )}
            </div>
            <SaveButton listingId={l.id} initialSaved={Boolean(saved)} signedIn={Boolean(signedIn)} slug={l.slug} />
          </div>
        )}
        {!row && l.image_count > 1 && (
          <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[0.68rem] font-medium text-white backdrop-blur">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="9" cy="11" r="2" />
              <path d="m21 16-5-5-8 8" />
            </svg>
            {l.image_count}
          </span>
        )}
      </div>

      <div className={`grid min-w-0 gap-0.5 ${row ? "content-center py-1 pr-2" : "px-0.5"}`}>
        <p className="text-[1.05rem] font-bold tracking-tight">{formatPrice(l.asking_price, l.currency, l.price_period)}</p>
        <h3 className="truncate font-medium">
          <Link href={href} className="after:absolute after:inset-0 focus-visible:outline-none">
            {l.title}
          </Link>
        </h3>
        <p className="truncate text-sm text-muted">
          {PROPERTY_TYPE_LABELS[l.property_type]} · {formatLocation(l.locality, l.city)}
        </p>
        <ListingFacts l={l} />
        {l.organization_verification_status === "verified" && (
          <div className="mt-1">
            <VerifiedPill scope={l.organization_verification_scope} compact />
          </div>
        )}
      </div>
    </article>
  );
}
