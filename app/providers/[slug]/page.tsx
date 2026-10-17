import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ListingCard, VerifiedPill } from "@/components/listings/listing-card";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { savedListingIds, withCoverUrls } from "@/lib/listings/queries";
import { CARD_COLUMNS, type ListingCardData } from "@/lib/listings/types";
import { ORGANIZATION_TYPE_LABELS } from "@/lib/labels";

type Params = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("public_organizations")
    .select("id, name, slug, type, description, website, public_email, public_phone, verification_status, created_at")
    .eq("slug", slug)
    .maybeSingle();
  if (!org) return null;
  const [{ data: extra }, { data: listings }] = await Promise.all([
    supabase.from("organizations").select("verification_scope, verified_at").eq("id", org.id).maybeSingle(),
    supabase.from("listing_cards").select(CARD_COLUMNS).eq("organization_id", org.id).eq("status", "published").order("published_at", { ascending: false }).limit(24),
  ]);
  return { org, extra, listings: await withCoverUrls((listings ?? []) as unknown as ListingCardData[]) };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug);
  return data ? { title: data.org.name, description: data.org.description ?? undefined } : { title: "Provider not found" };
}

export default async function ProviderPage({ params }: Params) {
  const { slug } = await params;
  const [data, user] = await Promise.all([load(slug), getCurrentUser()]);
  if (!data) notFound();
  const { org, extra, listings } = data;
  const saved = await savedListingIds(user?.id, listings.map((l) => l.id));
  const since = new Date(org.created_at as string).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <section className="relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-contrast sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-[radial-gradient(circle,rgba(196,138,69,0.55),transparent_70%)]" />
        <div className="relative flex items-start gap-4">
          <span className="bg-gold-gradient grid size-16 flex-none place-items-center rounded-2xl text-2xl font-extrabold text-[#25272c]">
            {org.name.slice(0, 1)}
          </span>
          <div className="min-w-0 grid gap-1">
            <h1 className="text-2xl font-extrabold leading-tight">{org.name}</h1>
            <p className="text-sm opacity-80">
              {ORGANIZATION_TYPE_LABELS[org.type as string]} · On BAID Atlas since {since}
            </p>
            {org.verification_status === "verified" && (
              <div className="mt-1 w-fit rounded-full bg-white px-1 py-0.5">
                <VerifiedPill scope={(extra?.verification_scope as string | null) ?? null} />
              </div>
            )}
          </div>
        </div>
        {org.description && <p className="relative mt-4 max-w-2xl opacity-90">{org.description}</p>}
        <div className="relative mt-4 flex flex-wrap gap-2 text-sm">
          {org.website && (
            <a href={org.website} rel="noopener noreferrer nofollow" target="_blank" className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5">
              Website ↗
            </a>
          )}
          <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5">{listings.length} live listings</span>
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="text-xl font-extrabold">Live listings</h2>
        {listings.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-border bg-surface p-6 text-center text-muted">
            No live listings right now.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <li key={l.id}>
                <ListingCard l={l} saved={saved.has(l.id)} signedIn={Boolean(user)} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
