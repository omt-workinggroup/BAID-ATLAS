import Link from "next/link";
import type { Metadata } from "next";
import { Alert, Card, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { getStaffRoles, requireActiveProfile } from "@/lib/auth/session";
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
  const staff = await getStaffRoles();

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <PageHeader title="Account" description={profile.email} />
      {welcome && <Alert tone="success">You&apos;re all set, {profile.display_name}. Start exploring!</Alert>}
      {updated === "password" && <Alert tone="success">Password updated. Other devices have been signed out.</Alert>}

      <div className="grid grid-cols-2 gap-3">
        <Link href="/account/saved" className="grid gap-1 rounded-2xl border border-border bg-surface p-4 hover:border-primary">
          <span className="text-2xl" aria-hidden="true">♡</span>
          <span className="font-bold">Saved</span>
          <span className="text-xs text-muted">Your hearted properties</span>
        </Link>
        <Link href="/explore" className="grid gap-1 rounded-2xl border border-border bg-surface p-4 hover:border-primary">
          <span className="text-2xl" aria-hidden="true">⌕</span>
          <span className="font-bold">Explore</span>
          <span className="text-xs text-muted">Search live listings</span>
        </Link>
      </div>
      {staff.length > 0 && (
        <Link href="/ops" className="flex items-center justify-between rounded-2xl bg-primary px-5 py-4 font-semibold text-primary-contrast">
          Operations dashboard <span aria-hidden="true">→</span>
        </Link>
      )}

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
