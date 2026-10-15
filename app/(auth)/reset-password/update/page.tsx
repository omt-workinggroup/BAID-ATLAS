import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { AuthCard } from "../../auth-card";
import { UpdatePasswordForm } from "../../forms";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function UpdatePasswordPage() {
  await requireUser("/reset-password/update");
  return (
    <AuthCard title="Choose a new password" description="You'll stay signed in here; other devices will be signed out.">
      <UpdatePasswordForm />
    </AuthCard>
  );
}
