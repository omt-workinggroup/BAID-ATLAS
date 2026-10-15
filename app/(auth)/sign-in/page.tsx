import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Alert } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/session";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { AuthCard } from "../auth-card";
import { SignInForm } from "../forms";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; signed_out?: string; error?: string }>;
}) {
  const { next, signed_out, error } = await searchParams;
  const target = safeRedirectPath(next);
  if (await getCurrentUser()) redirect(target);
  return (
    <AuthCard
      title="Sign in"
      footer={
        <>
          New to BAID Atlas?{" "}
          <Link href="/sign-up" className="font-semibold text-primary">
            Create an account
          </Link>
        </>
      }
    >
      <div className="grid gap-4">
        {signed_out && <Alert tone="success">You have been signed out.</Alert>}
        {error === "link" && (
          <Alert tone="error">That link is invalid or has expired. Sign in, or request a new link.</Alert>
        )}
        <SignInForm next={target} />
      </div>
    </AuthCard>
  );
}
