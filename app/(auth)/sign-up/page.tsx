import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { AuthCard } from "../auth-card";
import { SignUpForm } from "../forms";
import { GoogleButton } from "../google-button";

export const metadata: Metadata = { title: "Create account" };

export default async function SignUpPage() {
  if (await getCurrentUser()) redirect("/account");
  return (
    <AuthCard
      title="Create your account"
      description="Save properties, contact providers, or set up your organisation."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/sign-in" className="font-semibold text-text underline decoration-gold decoration-2 underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <div className="grid gap-4">
        <GoogleButton next="/onboarding" label="Sign up with Google" />
        <SignUpForm />
      </div>
    </AuthCard>
  );
}
