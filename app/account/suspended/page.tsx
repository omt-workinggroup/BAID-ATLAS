import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Alert, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { getCurrentProfile, requireUser } from "@/lib/auth/session";
import { signOut } from "@/app/(auth)/actions";

export const metadata: Metadata = { title: "Account restricted" };

export default async function SuspendedPage() {
  await requireUser("/account/suspended");
  const profile = await getCurrentProfile();
  if (profile?.account_status === "active") redirect("/account");
  return (
    <div className="mx-auto grid max-w-md gap-6">
      <PageHeader title="Your account is restricted" />
      <Alert tone="warning">
        This account is {profile?.account_status === "closed" ? "closed" : "suspended"}, so you can&apos;t use
        provider or account features. If you think this is a mistake, contact support.
      </Alert>
      <form action={signOut}>
        <SubmitButton variant="secondary" full>Sign out</SubmitButton>
      </form>
    </div>
  );
}
