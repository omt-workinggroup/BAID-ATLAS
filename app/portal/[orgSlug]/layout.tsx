import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui";
import { requireMembership } from "@/lib/auth/session";
import { ORG_ROLE_LABELS, ORGANIZATION_TYPE_LABELS, VERIFICATION_LABELS } from "@/lib/labels";
import { OrgTabs } from "./tabs";

export default async function OrgLayout({ children, params }: { children: ReactNode; params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { organization, role } = await requireMembership(orgSlug, `/portal/${orgSlug}`);
  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <div className="grid gap-2">
        <Link href="/portal" className="inline-flex min-h-11 w-fit items-center text-sm font-semibold text-primary">
          ← All organisations
        </Link>
        <h1 className="text-2xl font-bold leading-tight">{organization.name}</h1>
        <div className="flex flex-wrap gap-2">
          <Badge>{ORGANIZATION_TYPE_LABELS[organization.type]}</Badge>
          <Badge tone="primary">You: {ORG_ROLE_LABELS[role]}</Badge>
          <Badge tone={organization.verification_status === "verified" ? "verified" : "neutral"}>
            {VERIFICATION_LABELS[organization.verification_status]}
          </Badge>
        </div>
      </div>
      <OrgTabs slug={orgSlug} />
      {children}
    </div>
  );
}
