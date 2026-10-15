"use client";

import { useActionState, useState } from "react";
import { Alert, Button, Field, SelectField } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { INVITABLE_ROLES } from "@/lib/validation/schemas";
import { ORG_ROLE_LABELS } from "@/lib/labels";
import { inviteMember, type FormState } from "../../actions";

export function InviteForm({ slug, canInviteAdmin }: { slug: string; canInviteAdmin: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(inviteMember.bind(null, slug), undefined);
  const [copied, setCopied] = useState(false);
  const roles = INVITABLE_ROLES.filter((r) => canInviteAdmin || r !== "admin");

  return (
    <div className="grid gap-4">
      {state?.inviteLink && (
        <Alert tone="success">
          <p className="font-semibold">Invitation created</p>
          <p className="mt-1">Share this link with them. It works once, for 7 days, and won&apos;t be shown again.</p>
          <input
            readOnly
            aria-label="Invitation link"
            value={state.inviteLink}
            className="mt-2 min-h-11 w-full rounded-md border border-border bg-surface px-2 text-sm"
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button
            type="button"
            variant="secondary"
            className="mt-2 min-h-11 text-sm"
            onClick={async () => {
              await navigator.clipboard.writeText(state.inviteLink!);
              setCopied(true);
            }}
          >
            {copied ? "Copied" : "Copy link"}
          </Button>
        </Alert>
      )}
      {state?.message && <Alert tone="error">{state.message}</Alert>}
      <form action={action} className="grid gap-4" noValidate>
        <Field label="Email" name="email" type="email" inputMode="email" autoComplete="off" error={state?.errors?.email} />
        <SelectField label="Role" name="role" defaultValue="viewer" options={roles.map((r) => ({ value: r, label: ORG_ROLE_LABELS[r] }))} error={state?.errors?.role} />
        <SubmitButton full pendingLabel="Creating invitation…">Create invitation</SubmitButton>
      </form>
    </div>
  );
}
