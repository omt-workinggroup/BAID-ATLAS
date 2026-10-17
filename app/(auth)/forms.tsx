"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { Alert, Field } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { resendCode, sendCode, verifyCode, type AuthState } from "./actions";

export function PhoneForm({ next, mode }: { next?: string; mode: "sign-in" | "sign-up" }) {
  const [state, action] = useActionState<AuthState, FormData>(sendCode, undefined);
  return (
    <form action={action} className="grid gap-4" noValidate>
      {state?.message && <Alert tone="error">{state.message}</Alert>}
      <input type="hidden" name="next" value={next ?? ""} />
      <Field
        label="Phone number"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="024 123 4567"
        required
        defaultValue={state?.phone}
        hint="We'll text you a 6-digit code. Numbers outside Ghana need the country code, e.g. +44."
        error={state?.errors?.phone}
      />
      <SubmitButton full pendingLabel="Sending code…">Send code</SubmitButton>
      {mode === "sign-up" && (
        <p className="text-xs leading-relaxed text-muted">
          By continuing you agree to our terms and privacy policy, which are being finalised before public launch.
          Standard SMS rates may apply.
        </p>
      )}
    </form>
  );
}

// WebOTP (Chrome on Android): reads the code from the incoming SMS when it ends with "@<site> #<code>".
type OtpCredential = Credential & { code: string };

export function CodeForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(verifyCode, undefined);
  const [code, setCode] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const submitted = useRef("");

  // Submit as soon as six digits are in, whether typed, pasted or filled from the SMS.
  const update = useCallback((raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6 && submitted.current !== digits) {
      submitted.current = digits;
      queueMicrotask(() => form.current?.requestSubmit());
    }
  }, []);

  useEffect(() => {
    if (!("OTPCredential" in window)) return;
    const ac = new AbortController();
    navigator.credentials
      .get({ otp: { transport: ["sms"] }, signal: ac.signal } as CredentialRequestOptions)
      .then((cred) => {
        const otp = (cred as OtpCredential | null)?.code;
        if (otp) update(otp);
      })
      .catch(() => {
        // Not available, dismissed or timed out: the user types or pastes the code instead.
      });
    return () => ac.abort();
  }, [update]);

  // A wrong code clears the box so the next attempt can auto-submit again.
  useEffect(() => {
    if (state?.errors?.token || state?.message) {
      submitted.current = "";
      setCode("");
    }
  }, [state]);

  return (
    <form ref={form} action={action} className="grid gap-4" noValidate>
      {state?.message && <Alert tone="error">{state.message}</Alert>}
      <Field
        label="6-digit code"
        name="token"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        required
        autoFocus
        value={code}
        onChange={(e) => update(e.target.value)}
        onPaste={(e) => {
          e.preventDefault();
          update(e.clipboardData.getData("text"));
        }}
        readOnly={pending}
        className="text-center text-2xl font-semibold tracking-[0.5em]"
        error={state?.errors?.token}
      />
      <SubmitButton full pendingLabel="Signing you in…">Verify and continue</SubmitButton>
    </form>
  );
}

export function ResendCodeForm() {
  const [state, action] = useActionState<AuthState, FormData>(resendCode, undefined);
  return (
    <form action={action} className="grid justify-items-center gap-2">
      {state?.sent && <p role="status" className="text-sm text-success">A new code is on its way.</p>}
      {state?.message && <p role="alert" className="text-sm text-danger">{state.message}</p>}
      <SubmitButton variant="ghost" pendingLabel="Sending…">Send a new code</SubmitButton>
    </form>
  );
}
