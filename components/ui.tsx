import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const buttonBase =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-[0.95rem] font-semibold transition-[background-color,border-color,transform] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transform-none";
const buttonVariants = {
  primary: "bg-primary text-primary-contrast hover:bg-primary-hover",
  secondary: "border border-border bg-surface text-text hover:border-text",
  ghost: "text-primary hover:bg-primary-soft",
  danger: "border border-danger bg-surface text-danger hover:bg-danger-soft",
  inverse: "bg-surface text-primary hover:bg-primary-soft",
};
type Variant = keyof typeof buttonVariants;

export function Button({
  variant = "primary",
  full,
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; full?: boolean }) {
  return <button className={cx(buttonBase, buttonVariants[variant], full && "w-full", className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  full,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; full?: boolean }) {
  return <Link className={cx(buttonBase, buttonVariants[variant], full && "w-full", className)} {...props} />;
}

export function Field({
  label,
  name,
  error,
  hint,
  className,
  ...props
}: ComponentProps<"input"> & { label: string; name: string; error?: string; hint?: string }) {
  const id = `f-${name}`;
  const describedBy = [error && `${id}-err`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(
          "min-h-12 w-full rounded-xl border bg-surface px-3.5 text-base text-text placeholder:text-muted",
          error ? "border-danger" : "border-border",
          className,
        )}
        {...props}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function SelectField({
  label,
  name,
  error,
  options,
  ...props
}: ComponentProps<"select"> & {
  label: string;
  name: string;
  error?: string;
  options: { value: string; label: string }[];
}) {
  const id = `f-${name}`;
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <select
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className={cx(
          "min-h-12 w-full rounded-xl border bg-surface px-3 text-base text-text",
          error ? "border-danger" : "border-border",
        )}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-err`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextArea({
  label,
  name,
  error,
  ...props
}: ComponentProps<"textarea"> & { label: string; name: string; error?: string }) {
  const id = `f-${name}`;
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        rows={4}
        aria-invalid={error ? true : undefined}
        className={cx(
          "w-full rounded-xl border bg-surface px-3.5 py-3 text-base text-text",
          error ? "border-danger" : "border-border",
        )}
        {...props}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

const alertTones = {
  info: "border-primary/30 bg-primary-soft text-text",
  success: "border-success/30 bg-success-soft text-text",
  warning: "border-warning/40 bg-warning-soft text-text",
  error: "border-danger/40 bg-danger-soft text-text",
};

export function Alert({ tone = "info", children }: { tone?: keyof typeof alertTones; children: ReactNode }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("rounded-xl border px-4 py-3 text-sm", alertTones[tone])}>
      {children}
    </div>
  );
}

export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cx("rounded-2xl border border-border bg-surface p-5 sm:p-6", className)} {...props} />;
}

export function PageHeader({ title, description, back }: { title: string; description?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="grid gap-1">
      {back && (
        <Link href={back.href} className="mb-1 inline-flex min-h-11 w-fit items-center gap-1.5 text-sm font-medium text-muted hover:text-text">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {back.label}
        </Link>
      )}
      <h1 className="text-[1.85rem] leading-tight sm:text-4xl">{title}</h1>
      {description && <p className="text-muted">{description}</p>}
    </div>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "verified" | "primary" | "warning"; children: ReactNode }) {
  const tones = {
    neutral: "bg-surface-muted text-muted",
    verified: "bg-verified text-white",
    primary: "bg-primary-soft text-primary",
    warning: "bg-warning-soft text-warning",
  };
  return <span className={cx("inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold", tones[tone])}>{children}</span>;
}
