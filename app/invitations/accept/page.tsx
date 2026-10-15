import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireActiveProfile } from "@/lib/auth/session";
import { AcceptForm } from "./form";

export const metadata: Metadata = { title: "Accept invitation" };

export default async function AcceptInvitationPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const profile = await requireActiveProfile(`/invitations/accept?token=${encodeURIComponent(token)}`);
  return (
    <div className="mx-auto grid max-w-md gap-6">
      <PageHeader
        title="Join an organisation"
        description={
          <>
            You&apos;ve been invited to join a team on BAID Atlas. The invitation must have been sent to{" "}
            <strong className="text-text">{profile.email}</strong>.
          </>
        }
      />
      <AcceptForm token={token} />
    </div>
  );
}
