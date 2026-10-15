import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

export function AuthCard({ title, description, children, footer }: { title: string; description?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-md gap-6 pt-2 sm:pt-8">
      <div className="grid gap-3">
        <Logo size={40} />
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <div className="text-muted">{description}</div>}
      </div>
      <div className="rounded-lg border border-border bg-surface p-4 sm:p-6">{children}</div>
      {footer && <div className="text-center text-sm text-muted">{footer}</div>}
    </div>
  );
}
