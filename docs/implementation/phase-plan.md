# Phase plan

Each phase delivers: migrations, server + UI workflows, tests, docs, a verified build, mobile screenshots and
a written report. Work stops for approval at the end of every phase.

| Phase | Scope | Key deliverables | Exit criteria |
| --- | --- | --- | --- |
| **0** ✅ | Discovery and planning | Repo inspection, 10 docs, design token preview | Approved by product owner |
| **1** ✅ | Foundation ([report](phase-1-report.md)) | Next.js + TS + Tailwind scaffold, PWA manifest, design tokens, app shell with mobile bottom nav; Supabase local stack; migrations for enums, `profiles`, `staff_roles`, `organizations`, `organization_members`, `organization_invitations`, `audit_log`, `rate_limit_buckets`; RLS + pgTAP tests; sign-up/in, email verification, reset, callback, sign-out; onboarding (profile, create org); team management; GitHub Actions CI | AC-04, AC-05 (orgs), AC-13 (accounts); M-01..M-07 |
| **2** ✅ | Listings and discovery ([report](phase-2-report.md)) | Properties, listings, media upload pipeline, moderation queue, public views, explore/search, map, detail, provider profiles, saved properties, category hubs | AC-01..03, 05, 06, 12, 14..16 |
| **3** | Leads | Inquiries (idempotent), viewing requests, conversations/messages, notifications, report/abuse, rate limits | AC-07, AC-08 |
| **4** | Trust and developments | Verification cases, private evidence, reviewer assignment, developments, units, inventory | AC-06, 09, 10 |
| **5** | Studio and campaigns | Atlas Studio orders, campaigns + approvals + metrics, stories, collections, compare, immersive media (360) | Labelled sponsorship, assignment-scoped access |
| **6** | Monetisation | Plans, server-side entitlements, sandbox payments, webhooks | AC-11 |
| **7** | Intelligence | Calculators with reviewed formulas, sources, disclaimers | Formula review sign-off |
| **8** | Launch readiness | Security review, performance, SEO, monitoring, backup/restore test, runbooks, legal pages reviewed, controlled Ghana launch | Launch checklist |

## Phase 1 detailed task list (proposed)

1. Scaffold Next.js (App Router, TS strict, ESLint, Prettier) with pnpm; Tailwind with tokens from
   [design system](../design/design-system.md).
2. `.env.example` (names only), `.gitignore` for `.env*`.
3. Supabase CLI config; local stack via Docker for tests (Docker is available in the dev environment).
4. Migrations: extensions (`pgcrypto`, `citext`), enums, `profiles` + auth trigger, `staff_roles`,
   organisations, members, invitations, `audit_log`, `rate_limit_buckets`, `updated_at` trigger, RLS helpers
   (`is_active_user()`, `has_org_role(org, roles[])`, `has_staff_role(role)`).
5. RPCs: `create_organization`, `invite_member`, `accept_invitation`, `change_member_role`,
   `remove_member` — all audited.
6. pgTAP tests: anonymous, authenticated, cross-org, suspended and staff personas.
7. Auth UI (mobile-first): sign-up, sign-in, verify email, reset, callback with safe redirect, sign-out.
8. Onboarding and account profile/preferences; org creation and team screens.
9. App shell: bottom tab bar (phones), header, PWA manifest/icons, offline fallback page.
10. Playwright mobile projects; screenshots of every new screen.
11. GitHub Actions: lint, typecheck, unit, `supabase test db`, build, E2E.
12. Phase 1 report.

## Risks and blockers

| Risk / blocker | Impact | Mitigation |
| --- | --- | --- |
| Blueprint pages 1–6, 9–12 not supplied | Missing requirements | Request remaining pages |
| No brand assets | Design rework later | Provisional tokens isolated in one file |
| Supabase project and hosting not chosen | Phase 1 can run locally, but no shared preview | Decide before end of Phase 1 |
| Legal review not arranged | Launch blocker | Start early; legal pages marked as drafts |
| Payment provider Ghana support unverified | Phase 6 blocker | Research and sandbox before commitment |
| Map tile provider terms/cost | Phase 2 | Evaluate MapLibre-compatible providers |
| Low-bandwidth users | Adoption | Performance budgets in CI (M-03) |
