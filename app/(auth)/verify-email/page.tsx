import Link from "next/link";
import type { Metadata } from "next";
import { Alert } from "@/components/ui";
import { AuthCard } from "../auth-card";
import { ResendForm } from "../forms";

export const metadata: Metadata = { title: "Verify your email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; unconfirmed?: string }>;
}) {
  const { email, unconfirmed } = await searchParams;
  return (
    <AuthCard
      title="Check your email"
      description={
        <>
          We sent a verification link{email ? <> to <strong className="text-text">{email}</strong></> : null}. Open it
          on this device to finish setting up your account.
        </>
      }
      footer={
        <Link href="/sign-in" className="font-semibold text-primary">
          Back to sign in
        </Link>
      }
    >
      <div className="grid gap-4">
        {unconfirmed && <Alert tone="warning">Please verify your email address before signing in.</Alert>}
        <p className="text-sm text-muted">Didn&apos;t get it? Check spam, or send a new link.</p>
        <ResendForm email={email} />
      </div>
    </AuthCard>
  );
}
