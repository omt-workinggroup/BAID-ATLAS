import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

export function AuthCard({ title, description, children, footer }: { title: string; description?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-md gap-6 pt-2 sm:pt-8">
      <div className="grid gap-3">
        <Logo size={52} />
        <h1 className="text-[1.75rem] font-extrabold tracking-tight">{title}</h1>
        {description && <div className="text-muted">{description}</div>}
      </div>
      <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7">{children}</div>
      {footer && <div className="text-center text-sm text-muted">{footer}</div>}
    </div>
  );
}
