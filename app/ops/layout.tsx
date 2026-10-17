import Link from "next/link";
import type { ReactNode } from "react";
import { requireStaff } from "@/lib/auth/session";

export default async function OpsLayout({ children }: { children: ReactNode }) {
  const { staff } = await requireStaff("/ops");
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-5">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-primary px-5 py-4 text-primary-contrast">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] opacity-70">Operations</p>
          <p className="font-semibold">BAID Atlas staff</p>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs">{staff.map((s) => s.replace("_", " ")).join(" · ")}</span>
      </div>
      <nav aria-label="Operations" className="flex gap-2 overflow-x-auto">
        <Link href="/ops" className="inline-flex min-h-10 flex-none items-center rounded-full border border-border bg-surface px-4 text-sm font-semibold">Review queue</Link>
        {staff.includes("platform_admin") && (
          <Link href="/ops/organisations" className="inline-flex min-h-10 flex-none items-center rounded-full border border-border bg-surface px-4 text-sm font-semibold">Organisations</Link>
        )}
      </nav>
      {children}
    </div>
  );
}
