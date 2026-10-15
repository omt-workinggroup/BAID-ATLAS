"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { acceptInvitation, type FormState } from "@/app/portal/actions";

export function AcceptForm({ token }: { token: string }) {
  const [state, action] = useActionState<FormState, FormData>(acceptInvitation, undefined);
  return (
    <form action={action} className="grid gap-4">
      {state?.message && <Alert tone="error">{state.message}</Alert>}
      <input type="hidden" name="token" value={token} />
      <SubmitButton full pendingLabel="Joining…">Accept invitation</SubmitButton>
    </form>
  );
}
