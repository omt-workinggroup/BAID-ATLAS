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
      <section className="grid gap-5 border-b border-border pb-8">
        <div className="flex items-start gap-4">
          <span className="grid size-16 flex-none place-items-center rounded-2xl bg-primary font-[family-name:var(--font-display)] text-3xl text-[#dbb17d]">
            {org.name.slice(0, 1)}
          </span>
          <div className="grid min-w-0 gap-1">
            <h1 className="text-[2rem] leading-tight sm:text-4xl">{org.name}</h1>
            <p className="text-sm text-muted">
              {ORGANIZATION_TYPE_LABELS[org.type as string]} · On BAID Atlas since {since}
            </p>
          </div>
        </div>
        {org.verification_status === "verified" && <VerifiedPill scope={(extra?.verification_scope as string | null) ?? null} />}
        {org.description && <p className="max-w-2xl leading-relaxed">{org.description}</p>}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {org.website && (
            <a href={org.website} rel="noopener noreferrer nofollow" target="_blank" className="font-semibold underline decoration-border underline-offset-4 hover:decoration-gold">
              Website ↗
            </a>
          )}
          <span className="text-muted">{listings.length} live {listings.length === 1 ? "listing" : "listings"}</span>
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="text-xl font-semibold">Live listings</h2>
        {listings.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-muted">
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
