import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, formatLocation, PURPOSE_LABELS, type PricePeriod, type Purpose } from "@/lib/listings/format";

export const metadata: Metadata = { title: "Review queue" };

type QueueRow = {
  listing_id: string;
  submitted_at: string;
  property_listings: {
    title: string;
    purpose: Purpose;
    asking_price: string;
    currency: string;
    price_period: PricePeriod;
    organizations: { name: string; verification_status: string } | null;
    properties: { city: string; locality: string | null } | null;
  } | null;
};

export default async function OpsQueuePage({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const { done } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("listing_reviews")
    .select("listing_id, submitted_at, property_listings(title, purpose, asking_price, currency, price_period, organizations(name, verification_status), properties(city, locality))")
    .eq("status", "pending")
    .order("submitted_at", { ascending: true })
    .limit(50);
  const rows = (data ?? []) as unknown as QueueRow[];

  return (
    <div className="grid gap-4">
      {done && <p role="status" className="rounded-2xl border border-success/30 bg-success-soft px-4 py-3 text-sm">Decision recorded.</p>}
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-semibold">Review queue</h1>
        <span className="text-sm text-muted">{rows.length} waiting · oldest first</span>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-muted">All caught up. 🎉</p>
      ) : (
        <ul className="grid gap-3">
          {rows.map((r) => {
            const l = r.property_listings;
            if (!l) return null;
            const hours = Math.round((Date.now() - new Date(r.submitted_at).getTime()) / 3_600_000);
            return (
              <li key={r.listing_id}>
                <Link href={`/ops/reviews/${r.listing_id}`} className="grid gap-1 rounded-2xl border border-border bg-surface p-4 hover:border-primary">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate font-bold">{l.title}</span>
                    <span className={`flex-none rounded-full px-2 py-0.5 text-xs font-semibold ${hours > 24 ? "bg-danger-soft text-danger" : "bg-surface-muted text-muted"}`}>
                      {hours < 1 ? "just now" : `${hours}h`}
                    </span>
                  </div>
                  <span className="text-sm text-muted">
                    {PURPOSE_LABELS[l.purpose]} · {formatPrice(l.asking_price, l.currency, l.price_period)} · {formatLocation(l.properties?.locality ?? null, l.properties?.city ?? "")}
                  </span>
                  <span className="text-xs text-muted">
                    {l.organizations?.name} · {l.organizations?.verification_status === "verified" ? "verified" : "not verified"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
