"use client";

import { useActionState, useState } from "react";
import { Alert, Field, SelectField, TextArea } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ORGANIZATION_TYPES, slugify } from "@/lib/validation/schemas";
import { ORGANIZATION_TYPE_LABELS } from "@/lib/labels";
import { createOrganization, type FormState } from "../actions";

export function CreateOrganizationForm() {
  const [state, action] = useActionState<FormState, FormData>(createOrganization, undefined);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <form action={action} className="grid gap-4" noValidate>
      {state?.message && <Alert tone="error">{state.message}</Alert>}
      <Field
        label="Organisation name"
        name="name"
        required
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (!slugTouched) setSlug(slugify(e.target.value));
        }}
        error={state?.errors?.name}
      />
      <Field
        label="Web address"
        name="slug"
        required
        value={slug}
        onChange={(e) => {
          setSlugTouched(true);
          setSlug(e.target.value.toLowerCase());
        }}
        hint={`Your public page: /providers/${slug || "your-name"}`}
        error={state?.errors?.slug}
      />
      <SelectField
        label="Type"
        name="type"
        defaultValue=""
        options={[{ value: "", label: "Choose a type" }, ...ORGANIZATION_TYPES.map((t) => ({ value: t, label: ORGANIZATION_TYPE_LABELS[t] }))]}
        error={state?.errors?.type}
      />
      <TextArea label="Short description (optional)" name="description" maxLength={2000} error={state?.errors?.description} />
      <SubmitButton full pendingLabel="Creating…">Create organisation</SubmitButton>
    </form>
  );
}
