# System architecture

## Overview

```
 Phone / desktop browser (PWA)
        │  HTTPS
        ▼
 Next.js app (App Router)
   ├─ Server Components  ── read via Supabase client using the user's session (RLS applies)
   ├─ Server Actions     ── validate (Zod) → call Postgres RPC for state changes
   ├─ Route handlers     ── auth callback, webhooks (signature-verified, idempotent)
   └─ Middleware         ── session refresh, route-group gating, security headers
        │
        ▼
 Supabase
   ├─ Postgres  ── tables + RLS, public-safe views, RPC functions, audit triggers
   ├─ Auth      ── email/password, magic link, email verification, MFA for staff
   ├─ Storage   ── public bucket (approved listing media), private buckets (evidence, drafts)
   └─ Edge Functions (later) ── media processing, scheduled expiry, payment webhooks
```

## Layers and responsibilities

| Layer | Responsibility | Never does |
| --- | --- | --- |
| Client components | Interaction, optimistic UI, form state | Decide permissions, prices, statuses |
| Server actions | Authenticate, rate-limit, validate input, call RPC, revalidate cache | Trust client IDs/roles/prices |
| Postgres RPC | Enforce workflow transitions transactionally, write audit rows | Return private fields to public callers |
| RLS policies | Row-level read/write gate for every exposed table | — (last line of defence) |
| Public views | Expose only public-safe columns (approx. location, no contacts/evidence/notes) | — |

## Source layout (planned for Phase 1)

```
app/
  (public)/        home, explore, properties, ...
  (auth)/          sign-in, sign-up, verify-email, reset-password, auth/callback
  (workspace)/account/...
  (portal)/portal/[orgSlug]/...
  (ops)/ops/...
components/        ui primitives + feature components
lib/
  supabase/        browser.ts, server.ts (cookies), admin.ts (server-only, service role)
  auth/            session + role guards
  validation/      zod schemas
  i18n/ money/ units/
supabase/
  migrations/      timestamped SQL
  tests/           pgTAP RLS tests
  seed.sql         clearly non-production seed (no fake listings presented as real)
tests/
  unit/ e2e/
docs/
```

## Cross-cutting concerns

- **Auth/session:** `@supabase/ssr` cookie sessions; middleware refreshes tokens; sign-out revokes the
  session server-side; redirects only to same-origin allow-listed paths.
- **Authorisation:** every server action calls a guard (`requireUser`, `requireActiveAccount`,
  `requireOrgRole(orgId, roles)`, `requireStaffRole(role)`); RLS duplicates the check in the database.
- **Rate limiting:** Postgres-backed token bucket table keyed by user/IP + action for MVP (no extra infra);
  revisit with a managed store if load demands.
- **Idempotency:** `idempotency_key` columns with partial unique indexes on inquiries, payment events and
  webhook events; RPC returns the existing row on conflict.
- **Audit:** `audit_log` written inside the same transaction as the change (RPC or trigger); no client
  insert/update/delete privileges.
- **Media:** uploads go to a private `drafts` bucket via signed upload URLs; after validation and moderation
  they are copied to the public `listing-media` bucket. Evidence stays in `verification-evidence` (private),
  served only via short-lived signed URLs after an assignment check.
- **Performance (mobile):** server rendering, `next/image` with responsive sizes and AVIF/WebP, route-level
  code splitting, no map JS on non-map pages, skeleton loading states.
- **Observability (Phase 8):** structured logs without secrets/PII, error tracking, uptime checks.
