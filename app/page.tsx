import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import { ListingCard } from "@/components/listings/listing-card";
import { getCurrentUser } from "@/lib/auth/session";
import { latestListings, savedListingIds } from "@/lib/listings/queries";

const line = (d: string, size = 22) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const arrow = "M5 12h14M13 6l6 6-6 6";

// Search tabs map onto Explore's purpose filter. "Any" sends an empty value, which Explore ignores.
const tabs = [
  { value: "", label: "Any" },
  { value: "sale", label: "Buy" },
  { value: "long_term_rent", label: "Rent" },
  { value: "short_stay", label: "Short stay" },
];

// Real neighbourhoods and cities; each link is just a search, not a claim that listings exist there.
const places = ["East Legon", "Cantonments", "Airport Residential", "Spintex", "Tema", "Kumasi", "Takoradi"];

const types = [
  { label: "Houses", note: "Detached, semi-detached and townhouses", href: "/explore?type=house", d: "M3 10.5 12 3l9 7.5M5 9v11h14V9M10 20v-5h4v5" },
  { label: "Apartments", note: "Flats, studios and serviced apartments", href: "/explore?type=apartment", d: "M6 21V4h9v17M15 9h3v12M9 7h3M9 11h3M9 15h3M3 21h18" },
  { label: "Land", note: "Plots and acreage with document status", href: "/explore?type=land", d: "M3 19h18M4 19l5-8 4 5 3-4 4 7M8 4v4M6 6h4" },
  { label: "Short stays", note: "Nightly and weekly, fully furnished", href: "/explore?purpose=short_stay", d: "M3 18v-6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v6M3 14h18M7 9V6h10v3" },
  { label: "Commercial", note: "Shops, warehouses and mixed use", href: "/explore?type=commercial", d: "M4 21V8l8-5 8 5v13M9 21v-6h6v6M2 21h20M8 11h.01M16 11h.01" },
  { label: "Offices", note: "Office floors and small suites", href: "/explore?type=office", d: "M5 21V3h14v18M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M3 21h18" },
];

const process = [
  {
    title: "The provider is checked",
    body: "Before an agency, developer or landlord can publish, we check who they are. We publish exactly what we checked and when the check expires.",
  },
  {
    title: "The listing is reviewed",
    body: "A moderator reads every listing before it goes live: photos, price, size and location. Renders and staged photos must be labelled.",
  },
  {
    title: "It goes live, clearly labelled",
    body: "Prices always show their currency, areas show their units, and the exact address stays private until you're in touch with the provider.",
  },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  const latest = await latestListings(8).catch(() => []);
  const saved = await savedListingIds(user?.id, latest.map((l) => l.id));

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-16 sm:gap-24">
      {/* Hero and search */}
      <section className="grid grid-cols-[minmax(0,1fr)] gap-8 pt-2 sm:pt-8 lg:grid-cols-[1.05fr_1fr] lg:items-end lg:gap-14">
        <div className="grid gap-5">
          <h1 className="text-[2.6rem] leading-[1.04] sm:text-6xl">
            Find property in Ghana <em className="font-normal italic text-gold-strong">without</em> the guesswork.
          </h1>
          <p className="max-w-md text-[1.05rem] leading-relaxed text-muted">
            Homes, land, rentals and short stays from agencies, developers and landlords. Every listing is read by our
            team before it goes live.
          </p>
        </div>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
          <form action="/explore" method="get" role="search" className="flex flex-col rounded-2xl border border-border bg-surface p-2 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-12px_rgb(37_39_44/0.18)]">
            {/* The input comes first in the DOM so a plain search submits ?q= first; the tabs are drawn above it. */}
            <div className="order-2 flex items-center gap-2">
              <label htmlFor="home-q" className="sr-only">Search by area, city or title</label>
              <span className="pl-2.5 text-muted">{line("M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5", 20)}</span>
              <input
                id="home-q"
                name="q"
                placeholder="Search East Legon, Kumasi…"
                enterKeyHint="search"
                className="min-h-13 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted/80"
              />
              <button type="submit" className="min-h-12 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-contrast transition-colors hover:bg-primary-hover">
                Search
              </button>
            </div>
            <fieldset className="order-1 mb-2 flex min-w-0 gap-0.5 overflow-x-auto border-b border-border px-1 pb-2 [scrollbar-width:none]">
              <legend className="sr-only">Looking to</legend>
              {tabs.map((t, i) => (
                <label key={t.label} className="relative flex-none">
                  <input type="radio" name="purpose" value={t.value} defaultChecked={i === 0} className="peer sr-only" />
                  <span className="inline-flex min-h-10 cursor-pointer items-center rounded-lg px-3 text-sm text-muted transition-colors hover:text-text peer-checked:bg-surface-muted peer-checked:font-semibold peer-checked:text-text peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-gold">
                    {t.label}
                  </span>
                </label>
              ))}
            </fieldset>
          </form>

          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 text-sm">
            <span className="text-muted">Popular:</span>
            {places.map((p) => (
              <Link key={p} href={`/explore?q=${encodeURIComponent(p)}`} className="font-medium underline decoration-border decoration-1 underline-offset-[5px] transition-colors hover:decoration-gold">
                {p}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Latest listings, or an honest note until the first ones are approved */}
      {latest.length > 0 ? (
        <section aria-labelledby="latest-heading" className="grid gap-6">
          <SectionHead id="latest-heading" title="Latest listings" link={{ href: "/explore", label: "View all" }} />
          <ul className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0">
            {latest.map((l, i) => (
              <li key={l.id} className="flex-none">
                <ListingCard l={l} layout="rail" saved={saved.has(l.id)} signedIn={Boolean(user)} priority={i < 2} />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="grid gap-5 border-y border-border py-10 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-10">
          <div className="grid gap-3">
            <p className="text-sm font-medium text-gold-strong">Now onboarding providers</p>
            <h2 className="max-w-xl text-3xl leading-tight sm:text-4xl">The first listings are being reviewed.</h2>
            <p className="max-w-xl text-muted">
              We&apos;d rather launch with a short list of properties we&apos;ve checked than a long one we haven&apos;t.
              Listings appear here as soon as they pass review.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/explore" variant="secondary">Browse Explore</ButtonLink>
            <ButtonLink href={user ? "/portal" : "/sign-up"}>List a property</ButtonLink>
          </div>
        </section>
      )}

      {/* Browse by type */}
      <section aria-labelledby="types-heading" className="grid gap-6">
        <SectionHead id="types-heading" title="Browse by property type" />
        <ul className="grid grid-cols-1 border-t border-border sm:grid-cols-2 lg:grid-cols-3">
          {types.map((t) => (
            <li key={t.label} className="border-b border-border sm:odd:border-r lg:border-r lg:[&:nth-child(3n)]:border-r-0">
              <Link href={t.href} className="group flex items-center gap-4 py-5 sm:px-5">
                <span className="text-gold-strong">{line(t.d, 28)}</span>
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="font-semibold">{t.label}</span>
                  <span className="truncate text-sm text-muted">{t.note}</span>
                </span>
                <span className="text-muted transition-transform group-hover:translate-x-1 group-hover:text-text motion-reduce:transform-none">
                  {line(arrow, 18)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* How a listing gets here */}
      <section aria-labelledby="process-heading" className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <div className="grid content-start gap-3">
          <h2 id="process-heading" className="text-3xl leading-tight sm:text-4xl">How a listing gets on BAID Atlas</h2>
          <p className="text-muted">Three checks happen before you see anything. Paying for promotion doesn&apos;t skip any of them.</p>
        </div>
        <ol className="grid gap-8 sm:grid-cols-3 sm:gap-6">
          {process.map((s, i) => (
            <li key={s.title} className="grid content-start gap-3 border-t border-text pt-4">
              <span className="font-[family-name:var(--font-display)] text-sm text-gold-strong">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="text-lg font-semibold leading-snug">{s.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* What a verification label means */}
      <section aria-labelledby="label-heading" className="grid gap-8 rounded-2xl bg-surface-muted p-6 sm:p-12 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
          <h2 id="label-heading" className="text-3xl leading-tight sm:text-4xl">Verified means something specific here.</h2>
          <p className="leading-relaxed text-muted">
            Each verification label says what was checked and what it doesn&apos;t prove. Labels expire, and paid
            promotion is always marked sponsored. It never counts as verification.
          </p>
        </div>
        <figure className="grid gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <figcaption className="text-xs font-medium text-muted">How a label appears on a provider&apos;s profile</figcaption>
          <p className="flex items-center gap-2 text-sm font-semibold text-verified">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
            Organisation identity checked
          </p>
          <dl className="grid gap-x-4 gap-y-1 border-t border-border pt-4 text-sm sm:grid-cols-[9rem_1fr] sm:gap-y-3 [&>dd]:mb-2 sm:[&>dd]:mb-0">
            <dt className="text-muted">What we checked</dt><dd>Business registration matches the organisation&apos;s name</dd>
            <dt className="text-muted">Doesn&apos;t prove</dt><dd>Ownership of any specific property</dd>
            <dt className="text-muted">Expires</dt><dd>Every label shows its expiry date</dd>
          </dl>
        </figure>
      </section>

      {/* Providers */}
      <section className="grid gap-8 overflow-hidden rounded-2xl bg-primary p-6 text-primary-contrast sm:p-12 lg:grid-cols-[1.3fr_1fr] lg:items-end">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
          <p className="text-sm font-medium text-[#dbb17d]">For agencies, developers and landlords</p>
          <h2 className="max-w-lg text-3xl leading-tight sm:text-[2.6rem]">List where buyers already expect the facts.</h2>
          <ul className="grid gap-2 text-sm text-white/75 sm:grid-cols-2">
            {["Team roles and one-link invitations", "Feedback from reviewers, not silence", "Photos resized on the phone, location data removed", "A record of every change"].map((t) => (
              <li key={t} className="flex gap-2">
                <span aria-hidden="true" className="mt-2 h-px w-3 flex-none bg-[#dbb17d]" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex lg:justify-end">
          <ButtonLink href={user ? "/portal" : "/sign-up"} variant="inverse" className="w-full sm:w-auto">
            {user ? "Go to provider portal" : "Start listing"}
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}

function SectionHead({ id, title, link }: { id: string; title: string; link?: { href: string; label: string } }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 id={id} className="text-[1.75rem] leading-tight sm:text-4xl">{title}</h2>
      {link && (
        <Link href={link.href} className="flex flex-none items-center gap-1 pb-1 text-sm font-semibold hover:text-gold-strong">
          {link.label}
          {line(arrow, 16)}
        </Link>
      )}
    </div>
  );
}
