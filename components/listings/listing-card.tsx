import Image from "next/image";
import Link from "next/link";
import { SceneArt } from "@/components/illustrations";
import { SaveButton } from "@/components/listings/save-button";
import {
  formatArea,
  formatLocation,
  formatPrice,
  PROPERTY_TYPE_LABELS,
  PURPOSE_LABELS,
} from "@/lib/listings/format";
import type { ListingCardData } from "@/lib/listings/types";

const sceneFor = (type: string) => (type === "land" ? "land" : type === "apartment" ? "apartment" : "villa");

export function ListingFacts({ l, className = "" }: { l: ListingCardData; className?: string }) {
  const area = formatArea(l.floor_area, l.floor_area_unit) ?? formatArea(l.land_area, l.land_area_unit);
  const facts = [
    l.bedrooms !== null && l.property_type !== "land" ? `${l.bedrooms} bed` : null,
    l.bathrooms !== null && l.property_type !== "land" ? `${l.bathrooms} bath` : null,
    area,
  ].filter(Boolean);
  if (facts.length === 0) return null;
  return (
    <ul className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted ${className}`}>
      {facts.map((f) => (
        <li key={f} className="flex items-center gap-1">
          <span aria-hidden="true" className="size-1 rounded-full bg-gold" />
          {f}
        </li>
      ))}
    </ul>
  );
}

export function VerifiedPill({ scope, compact = false }: { scope: string | null; compact?: boolean }) {
  return (
    <span
      className="inline-flex max-w-full items-center gap-1 rounded-full bg-verified/10 px-2 py-0.5 text-[0.7rem] font-semibold text-verified"
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
  return (
    <article
      className={`group relative overflow-hidden rounded-3xl border border-border bg-surface shadow-sm transition-shadow hover:shadow-md ${
        row ? "flex gap-3 p-2" : ""
      } ${layout === "rail" ? "w-[17rem] flex-none snap-start" : ""}`}
    >
      <div className={`relative overflow-hidden rounded-[1.25rem] ${row ? "aspect-square w-32 flex-none" : "m-2 aspect-[16/11]"}`}>
        {l.cover_url ? (
          <Image
            src={l.cover_url}
            alt={l.cover_alt ?? l.title}
            fill
            sizes={row ? "128px" : "(min-width: 1024px) 320px, (min-width: 640px) 45vw, 90vw"}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
            priority={priority}
            unoptimized
          />
        ) : (
          <SceneArt scene={sceneFor(l.property_type)} className="size-full" />
        )}
        <div className="absolute inset-x-2 top-2 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {!row && (
              <span className="rounded-full bg-black/55 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-white backdrop-blur">
                {PURPOSE_LABELS[l.purpose]}
              </span>
            )}
            {l.is_sponsored && (
              <span className="rounded-full bg-sponsored px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-white">
                Sponsored
              </span>
            )}
            {(l.cover_is_render || l.cover_is_staged) && (
              <span className="rounded-full bg-warning px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-white">
                {l.cover_is_render ? "Render" : "Staged"}
              </span>
            )}
          </div>
          {!row && <SaveButton listingId={l.id} initialSaved={Boolean(saved)} signedIn={Boolean(signedIn)} slug={l.slug} />}
        </div>
        {!row && l.image_count > 1 && (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[0.65rem] font-semibold text-white backdrop-blur">
            {l.image_count} photos
          </span>
        )}
      </div>

      <div className={`grid min-w-0 gap-1 ${row ? "content-center py-1 pr-2" : "px-4 pb-4 pt-1"}`}>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-surface-muted px-2 py-0.5 text-[0.7rem] font-medium text-muted">
            {PROPERTY_TYPE_LABELS[l.property_type]}
          </span>
          {l.organization_verification_status === "verified" && <VerifiedPill scope={l.organization_verification_scope} compact />}
        </div>
        <h3 className="truncate font-bold">
          <Link href={href} className="after:absolute after:inset-0 focus-visible:outline-none">
            {l.title}
          </Link>
        </h3>
        <p className="flex items-center gap-1 truncate text-sm text-muted">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="flex-none">
            <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
          </svg>
          <span className="truncate">{formatLocation(l.locality, l.city)}</span>
        </p>
        <ListingFacts l={l} />
        <p className="mt-1 text-lg font-extrabold tracking-tight">{formatPrice(l.asking_price, l.currency, l.price_period)}</p>
      </div>
    </article>
  );
}
