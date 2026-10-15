import Link from "next/link";
import type { Metadata } from "next";
import { Alert, Badge, ButtonLink, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { requireActiveProfile } from "@/lib/auth/session";
import { ORG_ROLE_LABELS, ORGANIZATION_TYPE_LABELS } from "@/lib/labels";

export const metadata: Metadata = { title: "Provider portal" };

type Row = { role: string; organizations: { name: string; slug: string; type: string } | null };

export default async function PortalPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const profile = await requireActiveProfile("/portal");
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data, error: loadError } = await supabase
    .from("organization_members")
    .select("role, organizations(name, slug, type)")
    .eq("user_id", profile.id)
    .order("created_at");
  const rows = ((data ?? []) as unknown as Row[]).filter((r) => r.organizations);

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <PageHeader title="Provider portal" description="Your organisations and teams." />
      {error === "not-found" && <Alert tone="error">That organisation doesn&apos;t exist or you&apos;re not a member.</Alert>}
      {loadError && <Alert tone="error">We couldn&apos;t load your organisations. Please refresh.</Alert>}

      {rows.length === 0 && !loadError ? (
        <div className="grid justify-items-center gap-3 rounded-lg border border-dashed border-border bg-surface px-6 py-10 text-center">
          <h2 className="text-lg font-semibold">No organisations yet</h2>
          <p className="max-w-sm text-sm text-muted">
            Create one for your agency, development company or rental business, or ask an owner to invite you.
          </p>
          <ButtonLink href="/portal/new">Create an organisation</ButtonLink>
        </div>
      ) : (
        <>
          <ul className="grid gap-3">
            {rows.map((r) => (
              <li key={r.organizations!.slug}>
                <Link
                  href={`/portal/${r.organizations!.slug}`}
                  className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4 hover:border-primary"
                >
                  <span className="grid gap-0.5">
                    <span className="font-semibold">{r.organizations!.name}</span>
                    <span className="text-sm text-muted">{ORGANIZATION_TYPE_LABELS[r.organizations!.type]}</span>
                  </span>
                  <Badge tone="primary">{ORG_ROLE_LABELS[r.role]}</Badge>
                </Link>
              </li>
            ))}
          </ul>
          <ButtonLink href="/portal/new" variant="secondary" full>
            Create another organisation
          </ButtonLink>
        </>
      )}
    </div>
  );
}
