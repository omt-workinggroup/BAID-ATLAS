import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Alert, Card } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@/lib/supabase/server";
import { getStaffRoles } from "@/lib/auth/session";
import { ORGANIZATION_TYPE_LABELS, VERIFICATION_LABELS } from "@/lib/labels";
import { setVerification } from "../actions";

export const metadata: Metadata = { title: "Organisations" };

export default async function OrganisationsPage({ searchParams }: { searchParams: Promise<{ done?: string; error?: string }> }) {
  if (!(await getStaffRoles()).includes("platform_admin")) redirect("/ops");
  const { done, error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("organizations")
    .select("id, name, slug, type, verification_status, verification_scope, verified_at, verification_expires_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="grid gap-4">
      {done && <Alert tone="success">Verification saved and audited.</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
      <h1 className="text-2xl font-semibold">Organisations</h1>
      <p className="text-sm text-muted">
        Record only what you actually checked. The scope is shown publicly next to the &ldquo;Verified&rdquo; label and must
        not imply property ownership.
      </p>
      <ul className="grid gap-3">
        {(data ?? []).map((o) => (
          <li key={o.id}>
            <Card className="grid gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{o.name}</p>
                  <p className="text-xs text-muted">{ORGANIZATION_TYPE_LABELS[o.type as string]} · /{o.slug}</p>
                </div>
                <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold">{VERIFICATION_LABELS[o.verification_status as string]}</span>
              </div>
              {o.verification_scope && <p className="text-sm">Scope: {o.verification_scope as string}</p>}
              <details>
                <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">Update verification</summary>
                <form action={setVerification.bind(null, o.id as string)} className="grid gap-3">
                  <select name="status" defaultValue="verified" className="min-h-12 rounded-xl border border-border bg-surface px-3">
                    <option value="verified">Verified</option>
                    <option value="in_review">In review</option>
                    <option value="rejected">Not approved</option>
                    <option value="expired">Expired</option>
                  </select>
                  <input name="scope" maxLength={200} placeholder="e.g. Business registration matches organisation name" className="min-h-12 rounded-xl border border-border bg-surface px-3" />
                  <label className="grid gap-1 text-sm">
                    Valid for (months)
                    <input name="months" type="number" min={1} max={36} defaultValue={12} className="min-h-12 rounded-xl border border-border bg-surface px-3" />
                  </label>
                  <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
                </form>
              </details>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
