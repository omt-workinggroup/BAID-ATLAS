import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { maskPhone, readPending } from "@/lib/auth/pending";
import { AuthCard } from "../auth-card";
import { CodeForm, ResendCodeForm } from "../forms";

export const metadata: Metadata = { title: "Enter your code", robots: { index: false } };

export default async function VerifyPhonePage() {
  const pending = await readPending();
  if (!pending) redirect("/sign-in?error=expired");
  return (
    <AuthCard
      title="Enter your code"
      description={
        <>
          We sent a 6-digit code to <strong className="font-semibold text-text">{maskPhone(pending.phone)}</strong>. It
          expires in a few minutes.
        </>
      }
      footer={
        <Link href="/sign-in" className="font-semibold text-text underline decoration-gold decoration-2 underline-offset-4">
          Use a different number
        </Link>
      }
    >
      <div className="grid gap-5">
        <CodeForm />
        <ResendCodeForm />
      </div>
    </AuthCard>
  );
}
