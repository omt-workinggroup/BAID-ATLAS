import Link from "next/link";
import type { Metadata } from "next";
import { Alert, Card, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { requireActiveProfile } from "@/lib/auth/session";
import { signOut } from "@/app/(auth)/actions";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; updated?: string }>;
}) {
  const profile = await requireActiveProfile("/account");
  const { welcome, updated } = await searchParams;

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <PageHeader title="Account" description={profile.email} />
      {welcome && <Alert tone="success">You&apos;re all set, {profile.display_name}. Property search is coming soon.</Alert>}
      {updated === "password" && <Alert tone="success">Password updated. Other devices have been signed out.</Alert>}

      <Card className="grid gap-4">
        <h2 className="text-lg font-semibold">Profile and preferences</h2>
        <ProfileForm profile={profile} />
      </Card>

      <Card className="grid gap-3">
        <h2 className="text-lg font-semibold">Provider organisations</h2>
        <p className="text-sm text-muted">Manage your agency, developer or landlord organisation and its team.</p>
        <Link href="/portal" className="inline-flex min-h-11 items-center font-semibold text-text underline decoration-gold decoration-2 underline-offset-4">
          Go to provider portal →
        </Link>
      </Card>

      <Card className="grid gap-3">
        <h2 className="text-lg font-semibold">Security</h2>
        <Link href="/reset-password/update" className="inline-flex min-h-11 items-center font-semibold text-text underline decoration-gold decoration-2 underline-offset-4">
          Change password →
        </Link>
        <div className="grid gap-3 sm:grid-cols-2">
          <form action={signOut}>
            <input type="hidden" name="scope" value="local" />
            <SubmitButton variant="secondary" full pendingLabel="Signing out…">Sign out</SubmitButton>
          </form>
          <form action={signOut}>
            <input type="hidden" name="scope" value="global" />
            <SubmitButton variant="danger" full pendingLabel="Signing out…">Sign out of all devices</SubmitButton>
          </form>
        </div>
      </Card>
    </div>
  );
}
