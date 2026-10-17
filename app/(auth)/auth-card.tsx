import type { ReactNode } from "react";

export function AuthCard({ title, description, children, footer }: { title: string; description?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-md gap-7 pt-4 sm:pt-12">
      <div className="grid gap-2">
        <h1 className="text-[2.25rem] leading-tight">{title}</h1>
        {description && <div className="text-muted">{description}</div>}
      </div>
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-[0_12px_32px_-16px_rgb(37_39_44/0.18)] sm:p-7">{children}</div>
      {footer && <div className="text-center text-sm text-muted">{footer}</div>}
    </div>
  );
}
