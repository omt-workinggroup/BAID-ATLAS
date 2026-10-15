import type { Metadata } from "next";
import { Alert, PageHeader } from "@/components/ui";
import { requireActiveProfile } from "@/lib/auth/session";
import { CreateOrganizationForm } from "./form";

export const metadata: Metadata = { title: "Create organisation" };

export default async function NewOrganizationPage() {
  const profile = await requireActiveProfile("/portal/new");
  return (
    <div className="mx-auto grid max-w-md gap-6">
      <PageHeader
        title="Create an organisation"
        description="You'll be the owner. You can invite your team next."
        back={{ href: "/portal", label: "Provider portal" }}
      />
      {!profile.email_verified_at ? (
        <Alert tone="warning">Verify your email address before creating an organisation.</Alert>
      ) : (
        <CreateOrganizationForm />
      )}
      <p className="text-sm text-muted">
        Creating an organisation does not make it verified. Verification is a separate, scoped review that arrives in
        a later release.
      </p>
    </div>
  );
}
