# Phase 1 report: foundation

Date: 15 October 2026 · Branch: `claude/dazzling-pasteur-kqzrut`

## What was built

**App (Next.js 15, TypeScript strict, Tailwind v4, mobile first)**

| Route | Purpose | Access |
| --- | --- | --- |
| `/` | Home: honest "search coming soon", provider call to action, trust principles | public |
| `/sign-up`, `/sign-in`, `/verify-email`, `/reset-password` | Email + password auth, verification resend, reset request | public |
| `/auth/callback` | PKCE code / token-hash exchange with allow-listed redirects | public |
| `/reset-password/update` | Choose a new password; signs out other devices | signed in |
| `/onboarding` | Name + intent (find vs list); completes onboarding via RPC | signed in |
| `/account` | Profile and preferences, change password, sign out, sign out of all devices | active account |
| `/account/suspended` | Restricted-account notice | signed in |
| `/portal`, `/portal/new` | Organisation list and creation (verified email required) | active account |
| `/portal/[org]`, `/team`, `/organisation` | Overview, members/roles/invitations, public profile | org members (role-checked) |
| `/invitations/accept` | Accept a one-time invitation link | active account, matching email |

Also: bottom tab bar on phones / top nav on desktop, safe-area insets, 44 px+ touch targets, dark mode,
reduced motion, skip link, loading/error/not-found states, PWA manifest + icons, offline page and a minimal
service worker (static assets only; signed-in pages are never cached), CSP and security headers.

**Database (Supabase project `baid-atlas`, eu-west-2 London)**

Migrations in `supabase/migrations`: enums, `profiles` (auto-created from `auth.users`), `staff_roles`,
`audit_log` (append-only), private rate-limit buckets, `organizations`, `organization_members`,
`organization_invitations` (hashed one-time tokens, 7-day expiry), public directory view, and workflow
functions `create_organization`, `invite_member`, `accept_invitation`, `revoke_invitation`,
`change_member_role`, `remove_member`, `list_organization_members`, `complete_onboarding`. Every
state change is audited; last-owner protection; RLS on every table; column-level grants so clients cannot
write status, verification or email fields.

## Tests actually run (in this session)

| Suite | Command | Result |
| --- | --- | --- |
| Database / RLS (pgTAP, 49 assertions) | `pnpm db:test:local` (local Postgres 16 + auth stub) | **49/49 passed** |
| Unit (Vitest) | `pnpm test` | **26/26 passed** |
| Lint | `pnpm lint` | clean |
| Typecheck | `pnpm typecheck` | clean |
| Production build | `pnpm build` | succeeded |
| E2E, mobile (Playwright: Pixel 7, iPhone 14 viewport, desktop) | `pnpm test:e2e` | **37/37 passed** (public pages, validation, access-control redirects, open-redirect, callback rejection, headers, PWA) |
| E2E, signed-in flow (`tests/e2e/authenticated.spec.ts`) | `pnpm test:e2e` with QA credentials | **Not run successfully**: this sandbox's network policy blocks `*.supabase.co`, so sign-in could not reach Supabase. It will run in CI once QA secrets are added. |

pgTAP coverage: anonymous, authenticated, cross-organisation, unverified, suspended and platform-admin
personas; guessed-ID access, direct inserts, status/verification self-assignment, invitation reuse and
email mismatch, last-owner protection, suspended org/user lockout, audit append-only and admin-only reads.

The Supabase Docker stack could not be pulled here (registry limits), so database tests ran against a
local Postgres with a minimal `auth` stub (`scripts/local-db`). CI runs the same tests on the real Supabase
stack (`supabase test db`).

## Screenshots

`docs/screenshots/phase-1/` (Pixel 7 viewport): home, sign-up validation, sign-in, reset password, verify
email, desktop home. Signed-in screens (onboarding, create organisation, team, invitations, account) are
scripted in the authenticated E2E spec but could not be captured here (see above).

## Decisions and deviations

- **Publishable key** (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) replaces the legacy anon key name.
- **Public organisation directory** uses RLS + column grants rather than a security-definer view (Supabase
  advisor flagged the view as an error).
- **Invitations** are shared as copy-able one-time links; transactional email arrives in Phase 3.
- **Supabase remote migrations**: `remove_member` (contains a `DELETE`) is pending — the Supabase connector
  requires explicit approval for statements containing `DELETE`, and its confirmation prompt timed out.
  File: `supabase/migrations/20261015150000_remove_member.sql`. Until applied, "Remove member"/"Leave"
  shows a generic error.
- **QA accounts**: `qa-owner@example.com` and `qa-member@example.com` were created directly in the Supabase
  project (pre-confirmed, flagged `qa_account` in metadata) for automated tests. They own no data yet.

## Manual configuration required (Supabase dashboard → Authentication → URL configuration)

- Site URL: `https://baid-atlas.netlify.app`
- Redirect URLs: `https://baid-atlas.netlify.app/auth/callback`, `http://localhost:3000/auth/callback`
- Recommended: minimum password length 10; custom SMTP before launch (Supabase's built-in email is heavily
  rate-limited); enable leaked-password protection.

## Remaining risks / next phase

Phase 2 (listings, media, moderation, public search) depends on: a map tile provider, storage bucket design
for listing media, and the remaining blueprint pages. Legal review is still outstanding.
