import { Alert, Badge, Card } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@/lib/supabase/server";
import { canManageTeam, requireMembership } from "@/lib/auth/session";
import { ORG_ROLE_LABELS, ORG_ROLE_DESCRIPTIONS } from "@/lib/labels";
import { ORG_ROLES } from "@/lib/validation/schemas";
import { changeRole, removeMember, revokeInvitation } from "../../actions";
import { InviteForm } from "./invite-form";

type Member = { user_id: string; display_name: string | null; email: string; role: string; joined_at: string };
type Invitation = { id: string; email: string; role: string; expires_at: string };

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; updated?: string; removed?: string }>;
}) {
  const { orgSlug } = await params;
  const { error, updated, removed } = await searchParams;
  const { organization, role, profileId } = await requireMembership(orgSlug, `/portal/${orgSlug}/team`);
  const manage = canManageTeam(role);
  const isOwner = role === "owner";

  const supabase = await createClient();
  const { data: members } = await supabase.rpc("list_organization_members", { p_org: organization.id });
  const { data: invitations } = manage
    ? await supabase
        .from("organization_invitations")
        .select("id, email, role, expires_at")
        .eq("organization_id", organization.id)
        .is("accepted_at", null)
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
    : { data: [] as Invitation[] };

  // Owners can assign any role; admins can only manage non-owner, non-admin members.
  const assignable = (target: string) =>
    isOwner ? ORG_ROLES : target === "owner" || target === "admin" ? [] : ORG_ROLES.filter((r) => r !== "owner" && r !== "admin");

  return (
    <div className="grid gap-4">
      {error && <Alert tone="error">{error}</Alert>}
      {updated && <Alert tone="success">Role updated.</Alert>}
      {removed && <Alert tone="success">Member removed.</Alert>}

      <Card className="grid gap-3">
        <h2 className="text-lg font-semibold">Members</h2>
        <ul className="divide-y divide-border">
          {((members ?? []) as Member[]).map((m) => {
            const self = m.user_id === profileId;
            const options = manage && !self ? assignable(m.role) : [];
            return (
              <li key={m.user_id} className="grid gap-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {m.display_name ?? m.email} {self && <span className="text-sm font-normal text-muted">(you)</span>}
                    </p>
                    <p className="truncate text-sm text-muted">{m.email}</p>
                  </div>
                  <Badge tone="primary">{ORG_ROLE_LABELS[m.role]}</Badge>
                </div>
                {options.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <form action={changeRole.bind(null, orgSlug)} className="flex flex-1 gap-2">
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <label className="sr-only" htmlFor={`role-${m.user_id}`}>Role for {m.email}</label>
                      <select id={`role-${m.user_id}`} name="role" defaultValue={m.role} className="min-h-11 flex-1 rounded-md border border-border bg-surface px-2 text-sm">
                        {options.map((r) => (
                          <option key={r} value={r}>{ORG_ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                      <SubmitButton variant="secondary" className="min-h-11 px-3 text-sm">Change</SubmitButton>
                    </form>
                    <form action={removeMember.bind(null, orgSlug)}>
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <SubmitButton variant="danger" className="min-h-11 px-3 text-sm">Remove</SubmitButton>
                    </form>
                  </div>
                )}
                {self && role !== "owner" && (
                  <form action={removeMember.bind(null, orgSlug)}>
                    <input type="hidden" name="user_id" value={m.user_id} />
                    <SubmitButton variant="ghost" className="min-h-11 px-0 text-sm">Leave organisation</SubmitButton>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      {manage && (
        <Card className="grid gap-4">
          <div>
            <h2 className="text-lg font-semibold">Invite someone</h2>
            <p className="text-sm text-muted">They&apos;ll need a BAID Atlas account with this email address.</p>
          </div>
          <InviteForm slug={orgSlug} canInviteAdmin={isOwner} />
          <details className="text-sm">
            <summary className="min-h-11 cursor-pointer py-2 font-semibold">What can each role do?</summary>
            <dl className="grid gap-2">
              {Object.entries(ORG_ROLE_DESCRIPTIONS).map(([r, d]) => (
                <div key={r}>
                  <dt className="font-semibold">{ORG_ROLE_LABELS[r]}</dt>
                  <dd className="text-muted">{d}</dd>
                </div>
              ))}
            </dl>
          </details>
        </Card>
      )}

      {manage && (invitations?.length ?? 0) > 0 && (
        <Card className="grid gap-3">
          <h2 className="text-lg font-semibold">Pending invitations</h2>
          <ul className="divide-y divide-border">
            {(invitations as Invitation[]).map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{i.email}</p>
                  <p className="text-sm text-muted">
                    {ORG_ROLE_LABELS[i.role]} · expires {new Date(i.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <form action={revokeInvitation.bind(null, orgSlug)}>
                  <input type="hidden" name="invitation_id" value={i.id} />
                  <SubmitButton variant="ghost" className="min-h-11 px-3 text-sm">Revoke</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
