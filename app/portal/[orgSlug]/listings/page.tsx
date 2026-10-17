import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import { StatusChip } from "@/components/listings/status-chip";
import { NoPhoto } from "@/components/listings/no-photo";
import { createClient } from "@/lib/supabase/server";
import { requireMembership } from "@/lib/auth/session";
import { signPaths } from "@/lib/listings/queries";
import { formatPrice, formatLocation, type PricePeriod } from "@/lib/listings/format";

const EDIT_ROLES = ["owner", "admin", "listing_manager"];

type Row = {
  id: string;
  title: string;
  status: string;
  asking_price: string;
  currency: string;
  price_period: PricePeriod;
  updated_at: string;
  city: string;
  locality: string | null;
  cover_path: string | null;
};

export default async function ListingsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { organization, role } = await requireMembership(orgSlug, `/portal/${orgSlug}/listings`);
  const supabase = await createClient();
  const { data } = await supabase
    .from("listing_cards")
    .select("id, title, status, asking_price, currency, price_period, city, locality, cover_path")
    .eq("organization_id", organization.id)
    .order("published_at", { ascending: false, nullsFirst: true })
    .limit(100);
  const rows = (data ?? []) as Row[];
  const urls = await signPaths(rows.map((r) => r.cover_path));
  const counts = rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Live", value: counts.published ?? 0 },
          { label: "In review", value: counts.submitted ?? 0 },
          { label: "Drafts", value: (counts.draft ?? 0) + (counts.changes_requested ?? 0) },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-surface p-3 text-center">
            <p className="text-2xl font-semibold">{s.value}</p>
            <p className="text-xs text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {EDIT_ROLES.includes(role) && (
        <ButtonLink href={`/portal/${orgSlug}/listings/new`} full>
          + New listing
        </ButtonLink>
      )}

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-muted">
          No listings yet. Create your first one — it takes about five minutes.
        </p>
      ) : (
        <ul className="grid gap-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/portal/${orgSlug}/listings/${r.id}`} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-2 pr-4 hover:border-primary">
                <span className="relative size-20 flex-none overflow-hidden rounded-2xl bg-surface-muted">
                  {r.cover_path && urls.get(r.cover_path) ? (
                    <Image src={urls.get(r.cover_path)!} alt="" fill sizes="80px" className="object-cover" unoptimized />
                  ) : (
                    <NoPhoto compact />
                  )}
                </span>
                <span className="grid min-w-0 flex-1 gap-1">
                  <span className="truncate font-bold">{r.title}</span>
                  <span className="truncate text-xs text-muted">{formatLocation(r.locality, r.city)}</span>
                  <span className="text-sm font-semibold">{formatPrice(r.asking_price, r.currency, r.price_period)}</span>
                </span>
                <StatusChip status={r.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
