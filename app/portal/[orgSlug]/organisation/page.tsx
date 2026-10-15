import { Alert, Card } from "@/components/ui";
import { canManageTeam, requireMembership } from "@/lib/auth/session";
import { OrganizationProfileForm } from "./form";

export default async function OrganisationProfilePage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { organization, role } = await requireMembership(orgSlug, `/portal/${orgSlug}/organisation`);

  if (!canManageTeam(role)) {
    return (
      <Card className="grid gap-3">
        <Alert tone="info">Only owners and admins can edit the organisation profile.</Alert>
        <dl className="grid gap-2 text-sm">
          <div><dt className="font-semibold">Description</dt><dd className="text-muted">{organization.description ?? "—"}</dd></div>
          <div><dt className="font-semibold">Website</dt><dd className="text-muted">{organization.website ?? "—"}</dd></div>
        </dl>
      </Card>
    );
  }

  return (
    <Card className="grid gap-4">
      <div>
        <h2 className="text-lg font-semibold">Public profile</h2>
        <p className="text-sm text-muted">These details will appear on your public provider page.</p>
      </div>
      <OrganizationProfileForm slug={orgSlug} organization={organization} />
    </Card>
  );
}
