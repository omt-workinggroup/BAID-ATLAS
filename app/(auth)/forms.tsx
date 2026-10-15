"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert, Field } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import {
  requestPasswordReset,
  resendVerification,
  signIn,
  signUp,
  updatePassword,
  type AuthState,
} from "./actions";

export function SignUpForm() {
  const [state, action] = useActionState<AuthState, FormData>(signUp, undefined);
  return (
    <form action={action} className="grid gap-4" noValidate>
      {state?.message && <Alert tone="error">{state.message}</Alert>}
      <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={state?.email} error={state?.errors?.email} />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 10 characters, with a letter and a number."
        error={state?.errors?.password}
      />
      <SubmitButton full pendingLabel="Creating account…">Create account</SubmitButton>
      <p className="text-xs text-muted">
        By creating an account you agree to our terms and privacy policy, which are being finalised before public
        launch.
      </p>
    </form>
  );
}

export function SignInForm({ next }: { next?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signIn, undefined);
  return (
    <form action={action} className="grid gap-4" noValidate>
      {state?.message && <Alert tone="error">{state.message}</Alert>}
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={state?.email} error={state?.errors?.email} />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required error={state?.errors?.password} />
      <div className="-mt-1 text-right">
        <Link href="/reset-password" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">
          Forgot password?
        </Link>
      </div>
      <SubmitButton full pendingLabel="Signing in…">Sign in</SubmitButton>
    </form>
  );
}

export function ResendForm({ email }: { email?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(resendVerification, undefined);
  return (
    <form action={action} className="grid gap-4" noValidate>
      {state?.message && <Alert tone="info">{state.message}</Alert>}
      <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={email} error={state?.errors?.email} />
      <SubmitButton variant="secondary" full pendingLabel="Sending…">Resend verification email</SubmitButton>
    </form>
  );
}

export function ResetRequestForm() {
  const [state, action] = useActionState<AuthState, FormData>(requestPasswordReset, undefined);
  return (
    <form action={action} className="grid gap-4" noValidate>
      {state?.message && <Alert tone="success">{state.message}</Alert>}
      <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" required error={state?.errors?.email} />
      <SubmitButton full pendingLabel="Sending…">Send reset link</SubmitButton>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, action] = useActionState<AuthState, FormData>(updatePassword, undefined);
  return (
    <form action={action} className="grid gap-4" noValidate>
      {state?.message && <Alert tone="error">{state.message}</Alert>}
      <Field label="New password" name="password" type="password" autoComplete="new-password" required hint="At least 10 characters, with a letter and a number." error={state?.errors?.password} />
      <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" required error={state?.errors?.confirm} />
      <SubmitButton full pendingLabel="Saving…">Save new password</SubmitButton>
    </form>
  );
}
