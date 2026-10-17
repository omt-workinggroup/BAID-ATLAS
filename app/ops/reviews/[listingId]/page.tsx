import Image from "next/image";
import { notFound } from "next/navigation";
import { Alert, Card } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { StatusChip } from "@/components/listings/status-chip";
import { createClient } from "@/lib/supabase/server";
import { signPaths } from "@/lib/listings/queries";
import {
  formatArea,
  formatLocation,
  formatPrice,
  PROPERTY_TYPE_LABELS,
  PURPOSE_LABELS,
  type AreaUnit,
  type PricePeriod,
  type PropertyType,
  type Purpose,
} from "@/lib/listings/format";
import { REVIEW_REASONS } from "@/lib/validation/listing";
import { reviewListing } from "../../actions";

type Detail = {
  id: string;
  title: string;
  description: string | null;
  purpose: Purpose;
  asking_price: string;
  currency: string;
  price_period: PricePeriod;
  status: string;
  organizations: { name: string; slug: string; verification_status: string } | null;
  properties: {
    type: PropertyType;
    region: string;
    city: string;
    locality: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    floor_area: string | null;
    floor_area_unit: AreaUnit | null;
    land_area: string | null;
    land_area_unit: AreaUnit | null;
  } | null;
};

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ listingId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { listingId } = await params;
  const { error } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(listingId)) notFound();
  const supabase = await createClient();
  const [{ data }, { data: media }, { data: history }] = await Promise.all([
    supabase
      .from("property_listings")
      .select("id, title, description, purpose, asking_price, currency, price_period, status, organizations(name, slug, verification_status), properties(type, region, city, locality, bedrooms, bathrooms, floor_area, floor_area_unit, land_area, land_area_unit)")
      .eq("id", listingId)
      .maybeSingle(),
    supabase.from("property_media").select("id, storage_path, alt_text, is_render, is_virtually_staged").eq("listing_id", listingId).is("hidden_at", null).order("sort_order"),
    supabase.rpc("get_listing_review_history", { p_listing: listingId }),
  ]);
  if (!data) notFound();
  const l = data as unknown as Detail;
  const p = l.properties;
  const urls = await signPaths((media ?? []).map((m) => m.storage_path));

  return (
    <div className="grid gap-4">
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold leading-tight">{l.title}</h1>
        <StatusChip status={l.status} />
      </div>
      <p className="text-sm text-muted">
        {l.organizations?.name} · {l.organizations?.verification_status === "verified" ? "verified organisation" : "unverified organisation"}
      </p>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {(media ?? []).map((m) => (
          <li key={m.id} className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface-muted">
            {m.storage_path && urls.get(m.storage_path) && <Image src={urls.get(m.storage_path)!} alt={m.alt_text ?? ""} fill sizes="30vw" className="object-cover" unoptimized />}
            {(m.is_render || m.is_virtually_staged) && (
              <span className="absolute left-1.5 top-1.5 rounded-full bg-warning px-2 py-0.5 text-[0.65rem] font-semibold text-white">
                {m.is_render ? "Render" : "Staged"}
              </span>
            )}
          </li>
        ))}
      </ul>

      <Card className="grid gap-2 text-sm">
        <Row k="Offer" v={`${PURPOSE_LABELS[l.purpose]} · ${formatPrice(l.asking_price, l.currency, l.price_period)}`} />
        {p && <Row k="Property" v={PROPERTY_TYPE_LABELS[p.type]} />}
        {p && <Row k="Area" v={formatLocation(p.locality, p.city, p.region)} />}
        {p && (p.bedrooms !== null || p.bathrooms !== null) && <Row k="Rooms" v={`${p.bedrooms ?? "–"} bed · ${p.bathrooms ?? "–"} bath`} />}
        {p && formatArea(p.floor_area, p.floor_area_unit) && <Row k="Floor" v={formatArea(p.floor_area, p.floor_area_unit)!} />}
        {p && formatArea(p.land_area, p.land_area_unit) && <Row k="Land" v={formatArea(p.land_area, p.land_area_unit)!} />}
        {l.description && <p className="mt-2 whitespace-pre-line rounded-2xl bg-surface-muted p-3">{l.description}</p>}
      </Card>

      {l.status === "submitted" && (
        <Card className="grid gap-4">
          <h2 className="text-lg font-semibold">Decision</h2>
          <form action={reviewListing.bind(null, listingId)} className="grid gap-4">
            <fieldset className="grid grid-cols-3 gap-2">
              <legend className="sr-only">Decision</legend>
              {[
                { v: "approved", label: "Approve", tone: "peer-checked:bg-success peer-checked:border-success" },
                { v: "changes_requested", label: "Request changes", tone: "peer-checked:bg-warning peer-checked:border-warning" },
                { v: "rejected", label: "Reject", tone: "peer-checked:bg-danger peer-checked:border-danger" },
              ].map((d, i) => (
                <label key={d.v} className="cursor-pointer">
                  <input type="radio" name="decision" value={d.v} defaultChecked={i === 0} className="peer sr-only" />
                  <span className={`flex min-h-12 items-center justify-center rounded-2xl border border-border px-2 text-center text-sm font-semibold peer-checked:text-white ${d.tone}`}>
                    {d.label}
                  </span>
                </label>
              ))}
            </fieldset>
            <label className="grid gap-1.5 text-sm font-semibold">
              Reason (if not approving)
              <select name="reason_code" defaultValue="" className="min-h-12 rounded-xl border border-border bg-surface px-3 font-normal">
                <option value="">—</option>
                {Object.entries(REVIEW_REASONS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold">
              Message to the provider
              <textarea name="provider_message" rows={3} maxLength={1000} className="rounded-xl border border-border bg-surface px-3 py-2 font-normal" placeholder="Required when requesting changes or rejecting." />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold">
              Internal notes (staff only)
              <textarea name="internal_notes" rows={2} maxLength={2000} className="rounded-xl border border-border bg-surface px-3 py-2 font-normal" />
            </label>
            <SubmitButton full pendingLabel="Recording…">Record decision</SubmitButton>
          </form>
        </Card>
      )}

      {(history ?? []).length > 0 && (
        <Card className="grid gap-2">
          <h2 className="font-semibold">History</h2>
          <ul className="grid gap-2 text-sm">
            {(history ?? []).map((h: { id: string; status: string; reviewer_name: string | null; reviewed_at: string | null; submitted_at: string; provider_message: string | null; internal_notes: string | null }) => (
              <li key={h.id} className="rounded-2xl bg-surface-muted p-3">
                <p className="font-semibold">
                  {h.status.replace("_", " ")} · {h.reviewer_name ?? "pending"} · {new Date(h.reviewed_at ?? h.submitted_at).toLocaleString("en-GB")}
                </p>
                {h.provider_message && <p>To provider: {h.provider_message}</p>}
                {h.internal_notes && <p className="text-muted">Internal: {h.internal_notes}</p>}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <p className="flex justify-between gap-4">
      <span className="text-muted">{k}</span>
      <span className="text-right font-semibold">{v}</span>
    </p>
  );
}
