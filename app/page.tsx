import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import { SceneArt } from "@/components/illustrations";
import { Logo, TAGLINE } from "@/components/logo";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";

const icon = (d: string, size = 24) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const categories = [
  { label: "House", d: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { label: "Apartment", d: "M5 21V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v17M15 9h3a1 1 0 0 1 1 1v11M8 7h4M8 11h4M8 15h4M3 21h18" },
  { label: "Land", d: "M3 20h18M5 20l4-9 4 5 3-4 3 8M7 6h.01M7 3v6" },
  { label: "Short stay", d: "M3 18v-6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v6M3 14h18M7 9V6h10v3" },
  { label: "Commercial", d: "M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M8 8h3M8 12h3M8 16h3M3 21h18" },
  { label: "New build", d: "M4 21V10l8-6 8 6v11M9 21v-6h6v6M2 21h20" },
];

const previews = [
  { scene: "villa" as const, tag: "House", title: "Homes for sale", line: "Greater Accra · Ashanti · Western" },
  { scene: "apartment" as const, tag: "Apartment", title: "Apartments to rent", line: "Monthly and yearly lets" },
  { scene: "land" as const, tag: "Land", title: "Land & plots", line: "With clear documentation status" },
  { scene: "stay" as const, tag: "Short stay", title: "Short stays", line: "Nights, weeks, weekends" },
];

const pillars = [
  { title: "Every listing reviewed", body: "Moderated before it goes live. No bait listings.", d: "M9 12l2 2 4-4M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" },
  { title: "Honest trust labels", body: "What was checked, by whom, when — and what it doesn't prove.", d: "M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01" },
  { title: "Private by default", body: "Exact addresses and documents are never public.", d: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4" },
  { title: "Made for your phone", body: "Fast on mobile data. Add it to your home screen.", d: "M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2" },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  const profile = user ? await getCurrentProfile() : null;
  const firstName = profile?.display_name?.split(" ")[0];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 sm:gap-12">
      {/* Location + greeting */}
      <section className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="grid gap-0.5">
            <span className="text-xs text-muted">{firstName ? `Akwaaba, ${firstName}` : "Akwaaba 👋"} · Location</span>
            <span className="flex items-center gap-1.5 text-base font-bold">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
              </svg>
              Ghana
            </span>
          </div>
          <Link
            href={user ? "/account" : "/sign-in"}
            className="grid size-11 place-items-center rounded-full border border-border bg-surface"
            aria-label={user ? "Your account" : "Sign in"}
          >
            {icon("M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1.5-4 4.5-6 8-6s6.5 2 8 6", 22)}
          </Link>
        </div>

        <h1 className="text-[2.1rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
          Find property in Ghana <br className="hidden sm:block" />
          you can <span className="text-gold">trust</span>.
        </h1>
        <p className="-mt-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted">{TAGLINE}</p>

        <div className="flex items-center gap-3">
          <div aria-disabled="true" className="flex min-h-13 flex-1 items-center gap-3 rounded-full border border-border bg-surface px-4 text-muted shadow-sm">
            {icon("M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5", 20)}
            <span className="flex-1 truncate">Search East Legon, Kumasi…</span>
          </div>
          <span
            aria-label="Filters (coming soon)"
            role="img"
            className="grid size-13 flex-none place-items-center rounded-full bg-primary text-primary-contrast shadow-md"
          >
            {icon("M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4", 22)}
          </span>
        </div>
        <p className="-mt-1 text-xs text-muted">
          <span className="mr-1.5 inline-block rounded-full bg-gold-soft px-2 py-0.5 font-semibold text-gold-strong">Soon</span>
          Search, filters and listings open in the next release.
        </p>
      </section>

      {/* Category bubbles */}
      <section aria-label="Property types">
        <ul className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {categories.map((c, i) => (
            <li key={c.label} className="flex w-[4.5rem] flex-none flex-col items-center gap-2 text-center">
              <span
                className={`grid size-16 place-items-center rounded-full border ${
                  i === 0 ? "border-transparent bg-primary text-primary-contrast" : "border-border bg-surface text-text"
                }`}
              >
                {icon(c.d, 26)}
              </span>
              <span className="text-xs font-medium">{c.label}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Preview rail */}
      <section aria-labelledby="explore-heading" className="grid gap-4">
        <div className="flex items-end justify-between">
          <h2 id="explore-heading" className="text-xl font-bold tracking-tight">Coming to BAID Atlas</h2>
          <span className="text-sm font-semibold text-gold-strong">Listings soon</span>
        </div>
        <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0">
          {previews.map((p) => (
            <li key={p.title} className="w-[16.5rem] flex-none snap-start overflow-hidden rounded-3xl border border-border bg-surface shadow-sm sm:w-auto">
              <div className="relative aspect-[16/11] overflow-hidden rounded-3xl m-2">
                <SceneArt scene={p.scene} className="size-full" />
                <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-white backdrop-blur">
                  Illustration
                </span>
                <span className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white/90 text-[#121212]" aria-hidden="true">
                  {icon("M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z", 18)}
                </span>
              </div>
              <div className="grid gap-1 px-4 pb-4 pt-1">
                <span className="w-fit rounded-md bg-surface-muted px-2 py-0.5 text-[0.7rem] font-medium text-muted">{p.tag}</span>
                <h3 className="font-bold">{p.title}</h3>
                <p className="text-sm text-muted">{p.line}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Trust banner */}
      <section className="relative overflow-hidden rounded-3xl bg-[#121212] p-6 text-white sm:p-10">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-[radial-gradient(circle,rgba(217,161,46,0.55),transparent_70%)]" />
        <div className="relative grid gap-4 sm:max-w-lg">
          <p className="text-gold text-xs font-bold uppercase tracking-[0.25em]">Trust, explained</p>
          <h2 className="text-2xl font-extrabold leading-tight sm:text-3xl">No vague &ldquo;verified&rdquo; badges. Ever.</h2>
          <p className="text-white/75">
            Every label tells you what was checked, by whom, and when it expires. Paid promotion is always marked
            sponsored — and never counts as verification.
          </p>
          <figure className="grid gap-2 rounded-2xl border border-white/15 bg-white/[0.06] p-4">
            <figcaption className="text-[0.65rem] font-semibold uppercase tracking-widest text-white/60">Example label</figcaption>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-verified px-2.5 py-1 text-sm font-semibold text-white">
              {icon("M5 12l5 5 9-10", 14)} Organisation identity checked
            </span>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-white/55">Scope</dt><dd>Business registration matches the name</dd>
              <dt className="text-white/55">Doesn&apos;t prove</dt><dd>Ownership of any specific property</dd>
            </dl>
          </figure>
        </div>
      </section>

      {/* Pillars */}
      <section aria-label="Why BAID Atlas" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {pillars.map((p) => (
          <div key={p.title} className="grid content-start gap-3 rounded-3xl border border-border bg-surface p-4">
            <span className="bg-gold-gradient grid size-11 place-items-center rounded-2xl text-[#121212]">{icon(p.d, 22)}</span>
            <h3 className="font-bold leading-snug">{p.title}</h3>
            <p className="text-sm text-muted">{p.body}</p>
          </div>
        ))}
      </section>

      {/* Providers */}
      <section className="grid gap-5 rounded-3xl border border-border bg-surface p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-10">
        <div className="grid gap-3">
          <Logo variant="mark" height={56} />
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold-strong">For property professionals</p>
          <h2 className="text-2xl font-extrabold leading-tight tracking-tight">Agencies, developers & landlords — get your team ready.</h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {["Team roles", "One-link invites", "Audit trail", "Listings next"].map((t) => (
              <li key={t} className="rounded-full bg-surface-muted px-3 py-1">{t}</li>
            ))}
          </ul>
        </div>
        <ButtonLink href={user ? "/portal/new" : "/sign-up"} className="w-full rounded-full sm:w-auto">
          {user ? "Create an organisation" : "Get started — it's free"}
        </ButtonLink>
      </section>

      {!user && (
        <p className="pb-2 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-semibold text-text underline decoration-gold decoration-2 underline-offset-4">
            Sign in
          </Link>
        </p>
      )}
    </div>
  );
}
