import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/session";

const purposes = ["For sale", "Long-term rent", "Short stay", "Land", "Commercial"];

export default async function HomePage() {
  const user = await getCurrentUser();
  return (
    <div className="grid gap-8">
      <section className="grid gap-4 pt-2">
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
          Find property in Ghana you can <span className="text-primary">trust</span>.
        </h1>
        <p className="text-lg text-muted">
          Moderated listings, verification labels that say exactly what was checked, and clearly marked sponsored
          content.
        </p>
        <div
          aria-disabled="true"
          className="flex min-h-12 items-center gap-3 rounded-lg border border-border bg-surface px-4 text-muted"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <span>Property search is coming soon</span>
        </div>
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Categories coming soon">
          {purposes.map((p) => (
            <li key={p} className="flex min-h-9 flex-none items-center rounded-full border border-border bg-surface px-4 text-sm text-muted">
              {p}
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-3 rounded-lg bg-primary p-5 text-primary-contrast sm:p-8">
        <h2 className="text-xl font-bold">List with BAID Atlas</h2>
        <p className="opacity-90">
          Agencies, developers, landlords and property managers: set up your organisation and team now, ready for
          listings.
        </p>
        <div>
          <ButtonLink href={user ? "/portal/new" : "/sign-up"} variant="inverse">
            {user ? "Create an organisation" : "Create a free account"}
          </ButtonLink>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "Moderated listings",
            body: "Every listing is reviewed before it goes live.",
          },
          {
            title: "Scoped verification",
            body: "Labels show what was checked, by whom, when — and what it doesn't prove.",
          },
          {
            title: "Private by default",
            body: "Exact addresses and documents are never shown publicly.",
          },
        ].map((f) => (
          <div key={f.title} className="rounded-lg border border-border bg-surface p-4">
            <h3 className="font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-muted">{f.body}</p>
          </div>
        ))}
      </section>

      {!user && (
        <p className="text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-semibold text-primary">
            Sign in
          </Link>
        </p>
      )}
    </div>
  );
}
