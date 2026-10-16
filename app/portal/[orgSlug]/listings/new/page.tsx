import { redirect } from "next/navigation";
import { ListingForm } from "@/components/listings/listing-form";
import { requireMembership } from "@/lib/auth/session";
import { Steps } from "@/components/listings/steps";
import { createListing } from "../actions";

export default async function NewListingPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { role } = await requireMembership(orgSlug, `/portal/${orgSlug}/listings/new`);
  if (!["owner", "admin", "listing_manager"].includes(role)) redirect(`/portal/${orgSlug}/listings`);
  return (
    <div className="grid gap-4">
      <Steps current={1} />
      <ListingForm action={createListing.bind(null, orgSlug)} submitLabel="Save and add photos" />
    </div>
  );
}
