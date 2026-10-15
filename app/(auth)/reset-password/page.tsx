import Link from "next/link";
import type { Metadata } from "next";
import { AuthCard } from "../auth-card";
import { ResetRequestForm } from "../forms";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      description="Enter your account email and we'll send you a link to choose a new password."
      footer={
        <Link href="/sign-in" className="font-semibold text-primary">
          Back to sign in
        </Link>
      }
    >
      <ResetRequestForm />
    </AuthCard>
  );
}
