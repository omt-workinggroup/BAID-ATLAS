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
                <Link href={`/portal/${orgSlug}/organisation`} className="inline-flex min-h-11 items-center font-semibold text-primary">
                  Complete your public profile →
                </Link>
              </li>
              <li>
                <Link href={`/portal/${orgSlug}/team`} className="inline-flex min-h-11 items-center font-semibold text-primary">
                  Invite your team →
                </Link>
              </li>
            </>
          )}
          {!canManageTeam(role) && (
            <li>
              <Link href={`/portal/${orgSlug}/team`} className="inline-flex min-h-11 items-center font-semibold text-primary">
                See your team →
              </Link>
            </li>
          )}
        </ul>
      </Card>

      <Card className="grid gap-2">
        <h2 className="text-lg font-semibold">Listings</h2>
        <p className="text-sm text-muted">
          Listing creation, media uploads and moderation arrive in the next release. Your organisation and team
          setup will carry over.
        </p>
      </Card>
    </div>
  );
}
