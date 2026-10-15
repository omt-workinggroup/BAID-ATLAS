# Technology decisions

Status: **proposed — awaiting approval.** The repository was empty at Phase 0, so there is no existing stack
to preserve or migrate.

## Chosen stack (recommended)

| Concern | Choice | Why |
| --- | --- | --- |
| Language | TypeScript (strict) | Type safety across UI, server actions and generated DB types |
| Web framework | Next.js (App Router, React Server Components) | Server rendering for SEO and slow phones; server actions keep privileged logic off the client; mature PWA and image tooling |
| Styling | Tailwind CSS with design tokens as CSS variables | Mobile-first utility classes; tokens map 1:1 to the design system |
| UI primitives | Radix UI primitives (via shadcn/ui-style local components) | Accessible dialogs, sheets, menus; code owned in-repo |
| Backend | Supabase: Postgres, Auth, Storage, Row Level Security | The blueprint's rules (RLS, private buckets, service-role handling) assume Supabase; one managed platform for MVP |
| DB migrations | Supabase CLI SQL migrations in `supabase/migrations` | Explicit, reviewable SQL as the blueprint requires |
| Validation | Zod | Shared schemas for server actions and forms |
| Package manager | pnpm | Fast, strict dependency resolution; available in this environment |
| Unit tests | Vitest | Fast TS-native tests |
| DB/RLS tests | pgTAP via `supabase test db` | Test policies as anonymous, authenticated, cross-org, suspended and staff users |
| E2E tests | Playwright (mobile viewport projects first: Pixel 7, iPhone 14) | Mobile-first acceptance and screenshots |
| CI | GitHub Actions: lint, typecheck, unit, DB tests, build, E2E | Runs on every push/PR |
| Maps | MapLibre GL + an OpenStreetMap-based tile provider | No per-load vendor lock-in; approximate pins only. Provider to confirm in Phase 2 |
| Hosting | Vercel or Netlify (decision needed) | Both support Next.js; Netlify is already connected to this workspace |
| Email | Supabase Auth email for auth; transactional provider (e.g. Resend) in Phase 3 | |
| Payments | **Not chosen.** Candidates: Paystack, Hubtel, Flutterwave | Must verify Ghana support, fees, settlement, compliance first (Phase 6) |

## Alternatives considered

| Alternative | Reason not chosen |
| --- | --- |
| Remix / React Router v7 | Viable; smaller ecosystem for RSC and image optimisation |
| Expo / React Native first | Doubles the surface before product-market fit; PWA covers installability. Revisit after launch |
| Firebase | Weaker relational modelling and constraint support; blueprint is SQL/RLS-oriented |
| Custom Node API + self-managed Postgres | More operational burden; Supabase gives auth, storage and RLS out of the box |
| Prisma ORM | Bypasses RLS when using a privileged connection; we query through Supabase clients with the user's JWT so RLS always applies |
| Lovable (connected) | Fast prototyping, but code ownership, migration review and test discipline are harder to guarantee |

## Key conventions

- Browser code only ever holds the Supabase **publishable/anon** key. The service-role key is used solely in
  server-only modules (`import 'server-only'`) and edge functions, never logged.
- All state transitions (listing review, verification, inquiries) go through Postgres functions
  (`security definer` with explicit checks) or server actions that call them — never a client `update` of a
  status column.
- Generated DB types (`supabase gen types`) are committed and regenerated in CI to catch drift.
- Environment variable **names** are documented in `.env.example` with empty values.

## Environment variable names (planned)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY        # server only
NEXT_PUBLIC_SITE_URL
RESEND_API_KEY                   # Phase 3
PAYMENT_PROVIDER_SECRET_KEY      # Phase 6, server only
PAYMENT_WEBHOOK_SECRET           # Phase 6, server only
```
