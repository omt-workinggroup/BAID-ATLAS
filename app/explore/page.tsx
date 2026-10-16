import Link from "next/link";
import type { Metadata } from "next";
import { ListingCard } from "@/components/listings/listing-card";
import { FilterSheet } from "@/components/listings/filter-sheet";
import { SceneArt } from "@/components/illustrations";
import { getCurrentUser } from "@/lib/auth/session";
import { savedListingIds, searchListings } from "@/lib/listings/queries";
import { activeFilterCount, parseSearch, toQueryString } from "@/lib/listings/search";
import { PROPERTY_TYPE_LABELS, PURPOSE_LABELS, PURPOSES } from "@/lib/listings/format";

export const metadata: Metadata = {
  title: "Explore property",
  description: "Search moderated homes, land, rentals and commercial property across Ghana.",
};

export default async function ExplorePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseSearch(await searchParams);
  const [user, result] = await Promise.all([getCurrentUser(), searchListings(filters)]);
  const saved = await savedListingIds(user?.id, result.rows.map((r) => r.id));
  const count = activeFilterCount(filters);
  const base = { q: filters.q, type: filters.type, min: filters.min, max: filters.max, beds: filters.beds, currency: filters.currency, sort: filters.sort };

  const heading = filters.purpose
    ? `${PURPOSE_LABELS[filters.purpose]}${filters.type ? ` · ${PROPERTY_TYPE_LABELS[filters.type]}` : ""}`
    : filters.type
      ? PROPERTY_TYPE_LABELS[filters.type]
      : "Explore property";

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <div className="grid gap-4">
        <h1 className="text-[1.9rem] font-extrabold leading-tight tracking-tight">{heading}</h1>
        <div className="flex items-center gap-3">
          <form action="/explore" method="get" role="search" className="flex min-h-13 flex-1 items-center gap-3 rounded-full border border-border bg-surface px-4 shadow-sm focus-within:border-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="flex-none text-muted">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
            {filters.purpose && <input type="hidden" name="purpose" value={filters.purpose} />}
            {filters.type && <input type="hidden" name="type" value={filters.type} />}
            <label htmlFor="q" className="sr-only">Search by place or title</label>
            <input id="q" name="q" defaultValue={filters.q ?? ""} placeholder="East Legon, Kumasi, Takoradi…" enterKeyHint="search" className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted" />
          </form>
          <FilterSheet filters={filters} count={count} />
        </div>

        <nav aria-label="Purpose" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <Link href={`/explore${toQueryString(base)}`} aria-current={!filters.purpose ? "page" : undefined} className={pill(!filters.purpose)}>
            All
          </Link>
          {PURPOSES.map((p) => (
            <Link key={p} href={`/explore${toQueryString({ ...base, purpose: p })}`} aria-current={filters.purpose === p ? "page" : undefined} className={pill(filters.purpose === p)}>
              {PURPOSE_LABELS[p]}
            </Link>
          ))}
        </nav>
      </div>

      {result.error && (
        <p role="alert" className="rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm">
          We couldn&apos;t load listings right now. Please try again in a moment.
        </p>
      )}

      {!result.error && result.rows.length === 0 ? (
        <EmptyState filtered={count > 0 || Boolean(filters.q)} />
      ) : (
        <>
          <p className="text-sm text-muted" aria-live="polite">
            Showing {result.rows.length} {result.rows.length === 1 ? "property" : "properties"}
            {result.nextCursor ? " — more below" : ""}
          </p>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.rows.map((l, i) => (
              <li key={l.id} className="animate-rise" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                <ListingCard l={l} saved={saved.has(l.id)} signedIn={Boolean(user)} priority={i < 2} />
              </li>
            ))}
          </ul>
          {result.nextCursor && (
            <Link
              href={`/explore${toQueryString({ ...base, purpose: filters.purpose, cursor: result.nextCursor })}`}
              className="mx-auto inline-flex min-h-12 items-center rounded-full border border-border bg-surface px-6 font-semibold"
            >
              Load more
            </Link>
          )}
        </>
      )}
    </div>
  );
}

function pill(active: boolean) {
  return `inline-flex min-h-10 flex-none items-center rounded-full border px-4 text-sm font-medium transition-colors ${
    active ? "border-primary bg-primary text-primary-contrast" : "border-border bg-surface text-text hover:border-primary"
  }`;
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="grid justify-items-center gap-4 rounded-3xl border border-dashed border-border bg-surface px-6 py-10 text-center">
      <div className="relative h-36 w-56 overflow-hidden rounded-3xl">
        <SceneArt scene="villa" className="size-full" />
        <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-white">Illustration</span>
      </div>
      <h2 className="text-xl font-extrabold">{filtered ? "No matches yet" : "Listings are on their way"}</h2>
      <p className="max-w-sm text-sm text-muted">
        {filtered
          ? "Try widening your filters or searching a nearby area."
          : "Every listing is reviewed before it goes live, and providers are being verified now. Check back soon."}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {filtered && (
          <Link href="/explore" className="inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm font-semibold">
            Clear filters
          </Link>
        )}
        <Link href="/portal" className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-contrast">
          List your property
        </Link>
      </div>
    </div>
  );
}
