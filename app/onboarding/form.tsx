"use client";

import { useActionState } from "react";
import { Alert, Field } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { completeOnboarding, type OnboardingState } from "./actions";

const intents = [
  { value: "discover", title: "Find a property", body: "Buy, rent or find a short stay." },
  { value: "provide", title: "List properties", body: "For an agency, developer, landlord or property manager." },
];

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [state, action] = useActionState<OnboardingState, FormData>(completeOnboarding, undefined);
  return (
    <form action={action} className="grid gap-6" noValidate>
      {state?.message && <Alert tone="error">{state.message}</Alert>}
      <Field label="Your name" name="display_name" autoComplete="name" defaultValue={defaultName} required error={state?.errors?.display_name} />
      <fieldset className="grid gap-3">
        <legend className="mb-1 text-sm font-semibold">What brings you here?</legend>
        {intents.map((i, idx) => (
          <label
            key={i.value}
            className="flex min-h-16 cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface p-4 has-[:checked]:border-primary has-[:checked]:bg-primary-soft"
          >
            <input type="radio" name="intent" value={i.value} defaultChecked={idx === 0} className="mt-1 size-5 accent-[var(--primary)]" />
            <span>
              <span className="block font-semibold">{i.title}</span>
              <span className="block text-sm text-muted">{i.body}</span>
            </span>
          </label>
        ))}
        {state?.errors?.intent && <p className="text-sm text-danger">{state.errors.intent}</p>}
      </fieldset>
      <SubmitButton full pendingLabel="Saving…">Continue</SubmitButton>
    </form>
  );
}
