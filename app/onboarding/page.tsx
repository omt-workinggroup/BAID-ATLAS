import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireActiveProfile } from "@/lib/auth/session";
import { OnboardingForm } from "./form";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const profile = await requireActiveProfile("/onboarding", { allowNotOnboarded: true });
  if (profile.onboarded_at) redirect("/account");
  return (
    <div className="mx-auto grid max-w-md gap-6">
      <PageHeader title="Welcome to BAID Atlas" description="Two quick questions to set up your account." />
      <OnboardingForm defaultName={profile.display_name ?? ""} />
    </div>
  );
}
