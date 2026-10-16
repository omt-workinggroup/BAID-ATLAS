import Link from "next/link";
import { Alert, Card } from "@/components/ui";
import { canManageTeam, requireMembership } from "@/lib/auth/session";

export default async function OrgOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ created?: string; joined?: string }>;
}) {
  const { orgSlug } = await params;
  const { created, joined } = await searchParams;
  const { organization, role } = await requireMembership(orgSlug, `/portal/${orgSlug}`);

  return (
    <div className="grid gap-4">
      {created && <Alert tone="success">Organisation created. You&apos;re the owner.</Alert>}
      {joined && <Alert tone="success">You&apos;ve joined {organization.name}.</Alert>}

      <Card className="grid gap-2">
        <h2 className="text-lg font-semibold">Next steps</h2>
        <ul className="grid gap-1">
          {canManageTeam(role) && (
            <>
              <li>
                <Link href={`/portal/${orgSlug}/organisation`} className="inline-flex min-h-11 items-center font-semibold text-text underline decoration-gold decoration-2 underline-offset-4">
                  Complete your public profile →
                </Link>
              </li>
              <li>
                <Link href={`/portal/${orgSlug}/team`} className="inline-flex min-h-11 items-center font-semibold text-text underline decoration-gold decoration-2 underline-offset-4">
                  Invite your team →
                </Link>
              </li>
            </>
          )}
          {!canManageTeam(role) && (
            <li>
              <Link href={`/portal/${orgSlug}/team`} className="inline-flex min-h-11 items-center font-semibold text-text underline decoration-gold decoration-2 underline-offset-4">
                See your team →
              </Link>
            </li>
          )}
        </ul>
      </Card>

      <Card className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Listings</h2>
          <Link href={`/portal/${orgSlug}/listings`} className="text-sm font-semibold underline decoration-gold decoration-2 underline-offset-4">
            Manage →
          </Link>
        </div>
        <p className="text-sm text-muted">Create a listing, add photos, and submit it for review. Approved listings go live once your organisation is verified.</p>
        {["owner", "admin", "listing_manager"].includes(role) && (
          <Link href={`/portal/${orgSlug}/listings/new`} className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary font-semibold text-primary-contrast">
            + New listing
          </Link>
        )}
      </Card>

      <Card className="grid gap-2">
        <h2 className="text-lg font-semibold">Verification</h2>
        {organization.verification_status === "verified" ? (
          <p className="text-sm">✅ Your organisation is verified. Approved listings can be published.</p>
        ) : (
          <p className="text-sm text-muted">
            Not verified yet. Our team checks your business registration before your listings can go live. Verification
            states exactly what was checked — it never implies you own a particular property.
          </p>
        )}
      </Card>
    </div>
  );
}
