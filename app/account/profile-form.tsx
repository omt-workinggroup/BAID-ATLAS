"use client";

import { useActionState } from "react";
import { Alert, Field, SelectField } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import type { Profile } from "@/lib/auth/session";
import { updateProfile, type ProfileState } from "./actions";

const currencies = [
  { value: "GHS", label: "Ghana cedi (GHS)" },
  { value: "USD", label: "US dollar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "GBP", label: "Pound sterling (GBP)" },
];
const locales = [
  { value: "en-GH", label: "English (Ghana)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "en-US", label: "English (US)" },
];

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState<ProfileState, FormData>(updateProfile, undefined);
  return (
    <form action={action} className="grid gap-4" noValidate>
      {state?.ok && <Alert tone="success">Saved.</Alert>}
      {state?.message && <Alert tone="error">{state.message}</Alert>}
      <Field label="Name" name="display_name" autoComplete="name" defaultValue={profile.display_name ?? ""} error={state?.errors?.display_name} />
      <Field
        label="Phone (optional)"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+233…"
        defaultValue={profile.phone ?? ""}
        hint="Not shown publicly."
        error={state?.errors?.phone}
      />
      <SelectField
        label="Display prices in"
        name="preferred_currency"
        options={currencies}
        defaultValue={profile.preferred_currency}
        error={state?.errors?.preferred_currency}
      />
      <p className="-mt-2 text-sm text-muted">Listings always keep their original price and currency.</p>
      <SelectField label="Language and region" name="preferred_locale" options={locales} defaultValue={profile.preferred_locale} />
      <SubmitButton full pendingLabel="Saving…">Save changes</SubmitButton>
    </form>
  );
}
