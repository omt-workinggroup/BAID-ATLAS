import Link from "next/link";
import type { Metadata } from "next";
import { ListingCard } from "@/components/listings/listing-card";
import { PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { requireActiveProfile } from "@/lib/auth/session";
import { withCoverUrls } from "@/lib/listings/queries";
import { CARD_COLUMNS, type ListingCardData } from "@/lib/listings/types";

export const metadata: Metadata = { title: "Saved properties" };

export default async function SavedPage() {
  await requireActiveProfile("/account/saved");
  const supabase = await createClient();
  const { data: saved } = await supabase.from("saved_listings").select("listing_id, created_at").order("created_at", { ascending: false }).limit(60);
  const ids = (saved ?? []).map((s) => s.listing_id as string);
  // Only listings that are still public come back, so sold or paused ones drop out automatically.
  const { data } = ids.length ? await supabase.from("listing_cards").select(CARD_COLUMNS).in("id", ids) : { data: [] };
  const order = new Map(ids.map((id, i) => [id, i]));
  const listings = await withCoverUrls(
    ((data ?? []) as unknown as ListingCardData[]).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)),
  );
  const unavailable = ids.length - listings.length;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageHeader title="Saved" description="Properties you've hearted, kept in one place." />
      {listings.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-danger-soft text-danger">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
            </svg>
          </span>
          <h2 className="text-lg font-semibold">Nothing saved yet</h2>
          <p className="max-w-xs text-sm text-muted">Tap the heart on any property to keep it here.</p>
          <Link href="/explore" className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-contrast">
            Explore properties
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <li key={l.id}>
              <ListingCard l={l} saved signedIn />
            </li>
          ))}
        </ul>
      )}
      {unavailable > 0 && (
        <p className="text-center text-sm text-muted">
          {unavailable} saved {unavailable === 1 ? "property is" : "properties are"} no longer available.
        </p>
      )}
    </div>
  );
}
