"use client";

import { useActionState } from "react";
import { Alert, Field, TextArea } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import type { Membership } from "@/lib/auth/session";
import { updateOrganization, type FormState } from "../../actions";

export function OrganizationProfileForm({ slug, organization }: { slug: string; organization: Membership["organization"] }) {
  const [state, action] = useActionState<FormState, FormData>(updateOrganization.bind(null, slug), undefined);
  return (
    <form action={action} className="grid gap-4" noValidate>
      {state?.ok && <Alert tone="success">Profile saved.</Alert>}
      {state?.message && <Alert tone="error">{state.message}</Alert>}
      <Field label="Organisation name" name="name" defaultValue={organization.name} error={state?.errors?.name} />
      <TextArea label="Description" name="description" defaultValue={organization.description ?? ""} maxLength={2000} error={state?.errors?.description} />
      <Field label="Website" name="website" type="url" inputMode="url" placeholder="https://" defaultValue={organization.website ?? ""} error={state?.errors?.website} />
      <Field label="Public email" name="public_email" type="email" inputMode="email" defaultValue={organization.public_email ?? ""} error={state?.errors?.public_email} />
      <Field label="Public phone" name="public_phone" type="tel" inputMode="tel" placeholder="+233…" defaultValue={organization.public_phone ?? ""} error={state?.errors?.public_phone} />
      <SubmitButton full pendingLabel="Saving…">Save profile</SubmitButton>
    </form>
  );
}
