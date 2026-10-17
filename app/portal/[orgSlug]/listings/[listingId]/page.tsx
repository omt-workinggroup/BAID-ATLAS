import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Card } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ListingForm } from "@/components/listings/listing-form";
import { PhotoUploader } from "@/components/listings/photo-uploader";
import { StatusChip } from "@/components/listings/status-chip";
import { createClient } from "@/lib/supabase/server";
import { requireMembership } from "@/lib/auth/session";
import { signPaths } from "@/lib/listings/queries";
import { REVIEW_REASONS } from "@/lib/validation/listing";
import { Steps } from "@/components/listings/steps";
import { changeStatus, hideMedia, makeCover, publishListing, submitListing, updateListing } from "../actions";

const EDITABLE = ["draft", "changes_requested"];

const DONE_MESSAGES: Record<string, string> = {
  submitted: "Submitted! Our moderators usually review listings within one working day.",
  published: "Your listing is live. 🎉",
  paused: "Listing paused — it's hidden from search.",
  sold: "Marked as sold. Congratulations!",
  rented: "Marked as rented. Congratulations!",
  archived: "Listing archived.",
};

export default async function ListingEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; listingId: string }>;
  searchParams: Promise<{ created?: string; done?: string; error?: string }>;
}) {
  const { orgSlug, listingId } = await params;
  const { created, done, error } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(listingId)) notFound();
  const { organization, role } = await requireMembership(orgSlug, `/portal/${orgSlug}/listings/${listingId}`);
  const canEdit = ["owner", "admin", "listing_manager"].includes(role);

  const supabase = await createClient();
  const { data: listing, error: loadError } = await supabase.rpc("get_listing_for_edit", { p_listing: listingId });
  if (loadError || !listing || listing.organization_id !== organization.id) notFound();
  const [{ data: media }, { data: reviews }] = await Promise.all([
    supabase
      .from("property_media")
      .select("id, storage_path, alt_text, is_render, is_virtually_staged, sort_order")
      .eq("listing_id", listingId)
      .is("hidden_at", null)
      .order("sort_order")
      .order("created_at"),
    supabase.from("listing_reviews").select("status, reason_code, provider_message, reviewed_at").eq("listing_id", listingId).order("submitted_at", { ascending: false }).limit(1),
  ]);
  const photos = media ?? [];
  const urls = await signPaths(photos.map((m) => m.storage_path));
  const status = listing.status as string;
  const editable = canEdit && EDITABLE.includes(status);
  const lastReview = reviews?.[0];
  const descriptionOk = ((listing.description as string | null) ?? "").length >= 40;
  const step = photos.length === 0 ? 2 : 3;

  return (
    <div className="grid gap-5">
      <Link href={`/portal/${orgSlug}/listings`} className="w-fit text-sm font-semibold underline decoration-gold decoration-2 underline-offset-4">
        ← All listings
      </Link>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-extrabold leading-tight">{listing.title as string}</h2>
        <StatusChip status={status} />
      </div>

      {created && <Alert tone="success">Draft saved. Now add a few great photos.</Alert>}
      {done && DONE_MESSAGES[done] && <Alert tone="success">{DONE_MESSAGES[done]}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
      {status === "changes_requested" && lastReview && (
        <Alert tone="warning">
          <p className="font-semibold">Our moderators asked for changes{lastReview.reason_code ? `: ${REVIEW_REASONS[lastReview.reason_code as keyof typeof REVIEW_REASONS] ?? lastReview.reason_code}` : ""}</p>
          {lastReview.provider_message && <p className="mt-1">{lastReview.provider_message}</p>}
        </Alert>
      )}
      {status === "rejected" && lastReview?.provider_message && <Alert tone="error">{lastReview.provider_message}</Alert>}

      {editable && <Steps current={step as 2 | 3} />}

      {/* Lifecycle actions */}
      {canEdit && (
        <Card className="grid gap-3">
          {editable && (
            <>
              <h3 className="font-extrabold">Ready to go?</h3>
              <ul className="grid gap-1 text-sm">
                <Check ok>Details saved</Check>
                <Check ok={photos.length > 0}>At least one photo</Check>
                <Check ok={descriptionOk}>Description of 40+ characters</Check>
              </ul>
              <form action={submitListing.bind(null, orgSlug, listingId)}>
                <SubmitButton full disabled={photos.length === 0 || !descriptionOk} pendingLabel="Submitting…">
                  Submit for review
                </SubmitButton>
              </form>
            </>
          )}
          {status === "submitted" && <p className="text-sm text-muted">In review. You&apos;ll be able to publish once it&apos;s approved.</p>}
          {(status === "approved" || status === "paused") && (
            <>
              <p className="text-sm text-muted">
                {organization.verification_status === "verified"
                  ? "Approved and ready to publish."
                  : "Approved! Publishing unlocks once your organisation is verified."}
              </p>
              <form action={publishListing.bind(null, orgSlug, listingId)}>
                <SubmitButton full disabled={organization.verification_status !== "verified"} pendingLabel="Publishing…">
                  {status === "paused" ? "Resume listing" : "Publish listing"}
                </SubmitButton>
              </form>
            </>
          )}
          {status === "published" && (
            <div className="grid gap-2">
              <Link href={`/properties/${listing.slug}`} className="inline-flex min-h-11 items-center font-semibold underline decoration-gold decoration-2 underline-offset-4">
                View live listing ↗
              </Link>
              <p className="text-xs text-muted">Live until {new Date(listing.expires_at as string).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
          )}
          {["published", "paused"].includes(status) && (
            <form action={changeStatus.bind(null, orgSlug, listingId)} className="flex flex-wrap gap-2">
              {status === "published" && <StatusButton value="paused" label="Pause" />}
              <StatusButton value={listing.purpose === "sale" ? "sold" : "rented"} label={listing.purpose === "sale" ? "Mark sold" : "Mark rented"} />
              <StatusButton value="archived" label="Archive" />
            </form>
          )}
        </Card>
      )}

      <Card className="grid gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold">Photos</h3>
          <span className="text-sm text-muted">{photos.length}/30</span>
        </div>
        {photos.length > 0 && (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {photos.map((m, i) => (
              <li key={m.id} className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface-muted">
                {m.storage_path && urls.get(m.storage_path) && (
                  <Image src={urls.get(m.storage_path)!} alt={m.alt_text ?? ""} fill sizes="(min-width: 640px) 30vw, 45vw" className="object-cover" unoptimized />
                )}
                <div className="absolute inset-x-1.5 top-1.5 flex flex-wrap gap-1">
                  {i === 0 && <span className="bg-gold-gradient rounded-full px-2 py-0.5 text-[0.65rem] font-bold text-[#25272c]">Cover</span>}
                  {m.is_render && <span className="rounded-full bg-warning px-2 py-0.5 text-[0.65rem] font-semibold text-white">Render</span>}
                  {m.is_virtually_staged && <span className="rounded-full bg-warning px-2 py-0.5 text-[0.65rem] font-semibold text-white">Staged</span>}
                </div>
                {editable && (
                  <div className="absolute inset-x-1.5 bottom-1.5 flex gap-1">
                    {i !== 0 && (
                      <form action={makeCover.bind(null, orgSlug, listingId)}>
                        <input type="hidden" name="media_id" value={m.id} />
                        <button className="min-h-9 rounded-full bg-white/90 px-3 text-xs font-semibold text-[#25272c]">Make cover</button>
                      </form>
                    )}
                    <form action={hideMedia.bind(null, orgSlug, listingId)} className="ml-auto">
                      <input type="hidden" name="media_id" value={m.id} />
                      <button aria-label="Remove photo" className="grid size-9 place-items-center rounded-full bg-white/90 text-danger">✕</button>
                    </form>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {editable ? (
          <PhotoUploader slug={orgSlug} orgId={organization.id} listingId={listingId} remaining={30 - photos.length} />
        ) : (
          photos.length === 0 && <p className="text-sm text-muted">No photos.</p>
        )}
      </Card>

      <ListingForm
        action={updateListing.bind(null, orgSlug, listingId)}
        initial={listing as Record<string, string | number | null>}
        submitLabel="Save changes"
        locked={!editable}
      />
    </div>
  );
}

function Check({ ok, children }: { ok?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span className={`grid size-5 place-items-center rounded-full text-[0.65rem] font-bold ${ok ? "bg-success text-white" : "border border-border text-muted"}`} aria-hidden="true">
        {ok ? "✓" : ""}
      </span>
      <span className={ok ? "" : "text-muted"}>{children}</span>
      <span className="sr-only">{ok ? "(done)" : "(to do)"}</span>
    </li>
  );
}

function StatusButton({ value, label }: { value: string; label: string }) {
  return (
    <button name="status" value={value} className="min-h-11 rounded-full border border-border bg-surface px-4 text-sm font-semibold hover:border-primary">
      {label}
    </button>
  );
}
