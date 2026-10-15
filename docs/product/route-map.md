# Route map

This is a **target** map, not a reason to ship empty pages. A route is implemented only when it has a real
workflow, access control, responsive (mobile-first) UI, loading/empty/error states and tests.

Legend: **Access** — `public`, `auth` (signed-in user), `member` (organisation member, role-checked),
`ops` (platform staff role, role-checked). **Phase** — the phase in which the route is planned.

## Public

| Route | Purpose | Access | Phase |
| --- | --- | --- | --- |
| `/` | Home: search entry, category shortcuts | public | 1 (shell), 2 |
| `/explore` | Search results with filters, stable pagination | public | 2 |
| `/map` | Map search (approximate locations only) | public | 2 |
| `/properties/[slug]` | Property detail (public-safe fields only) | public | 2 |
| `/commercial`, `/land`, `/rentals`, `/short-stays` | Pre-filtered category hubs | public | 2 |
| `/providers`, `/providers/[slug]` | Provider directory and profile | public | 2 |
| `/developments`, `/developments/[slug]` | Development projects | public | 4 |
| `/projects/[slug]/units/[unitSlug]` | Unit detail within a development | public | 4 |
| `/stories`, `/stories/[slug]` | Editorial content | public | 5 |
| `/collections/[slug]` | Shared public collection | public | 5 |
| `/compare` | Compare selected properties | public | 5 |
| `/atlas-studio`, `/atlas-studio/[service]`, `/atlas-studio/request` | Studio services and request | public / auth to submit | 5 |
| `/intelligence`, `/intelligence/[calculator]` | Calculators with disclosed assumptions | public | 7 |
| `/about`, `/contact`, `/help` | Company and help | public | 1–2 |
| `/trust-and-verification`, `/safety` | What verification does and does not establish | public | 2, 4 |
| `/privacy`, `/terms`, `/cookies`, `/accessibility` | Legal (content needs legal review) | public | 1 (placeholders flagged as drafts), 8 |

## Auth and onboarding

| Route | Purpose | Phase |
| --- | --- | --- |
| `/sign-in`, `/sign-up` | Email + password (and magic link) | 1 |
| `/verify-email` | Email verification prompt/resend | 1 |
| `/reset-password`, `/reset-password/update` | Password reset | 1 |
| `/auth/callback` | Supabase auth code exchange; safe-redirect allow-list | 1 |
| `/onboarding/profile`, `/onboarding/role`, `/onboarding/provider` | Profile, intent, create/join organisation | 1 |

## Workspace (`/account/...`, auth)

`saved`, `collections`, `compare`, `inquiries`, `viewings`, `messages`, `notifications`, `profile`,
`preferences`, `privacy`. Phase 1 ships `profile` and `preferences`; the rest arrive with their features.

## Provider portal (`/portal/[orgSlug]/...`, member)

`listings` (+ `new`, `[id]/edit`, `[id]/media`), `leads`, `viewings`, `messages`, `team`, `verification`,
`campaigns`, `studio-orders`, `analytics`, `billing`, `organisation`, `settings`. Phase 1 ships `team` and
`organisation`; listings and media in Phase 2.

## Developer (`/portal/[orgSlug]/projects/...`, member of a developer organisation)

`projects`, `projects/[id]`, `projects/[id]/edit`, `projects/[id]/units`, `inventory`, `leads`, `campaigns`,
`reports`. Phase 4.

## Ops (`/ops/...`, ops roles)

`listings` / `reviews`, `providers`, `verification-cases`, `developments`, `inquiries`, `reports`, `studio`,
`campaigns`, `subscriptions`, `payments`, `countries`, `categories`, `content`, `users`, `audit`, `settings`.
Each ops route is gated by a specific staff role (see [permissions matrix](../security/permissions-matrix.md)).

## Mobile navigation model

- Bottom tab bar on phones (Home, Explore, Map, Saved, Account); collapses into a top/side nav ≥ 1024 px.
- Provider portal and ops use a compact header with a drawer menu on phones.
- Filters open as a full-height bottom sheet on phones, a side panel on desktop.
