# BAID Atlas

Mobile-first property discovery, listing, verification and marketing platform, launching in Ghana first.

**Status: Phase 1 (foundation) complete** — auth, profiles, organisations, teams, RLS, CI.
See the [Phase 1 report](docs/implementation/phase-1-report.md).

## Development

```bash
pnpm install
cp .env.example .env.local   # fill in public Supabase URL and publishable key
pnpm dev                     # http://localhost:3000
pnpm lint && pnpm typecheck && pnpm test
pnpm build && pnpm test:e2e  # mobile-first Playwright suite
pnpm db:test                 # pgTAP RLS tests on the Supabase stack (Docker)
pnpm db:test:local           # same tests on a local Postgres without Docker
```

## Documentation

| Area | Document |
| --- | --- |
| Product | [Requirements](docs/product/requirements.md) · [Route map](docs/product/route-map.md) |
| Architecture | [Technology decisions](docs/architecture/technology-decisions.md) · [System architecture](docs/architecture/system-architecture.md) · [Database design](docs/architecture/database-design.md) |
| Security | [Threat model](docs/security/threat-model.md) · [Permissions matrix](docs/security/permissions-matrix.md) |
| Quality | [Acceptance criteria](docs/quality/acceptance-criteria.md) |
| Delivery | [Phase plan](docs/implementation/phase-plan.md) · [Phase 0 report](docs/implementation/phase-0-report.md) · [Phase 1 report](docs/implementation/phase-1-report.md) |
| Design | [Design system](docs/design/design-system.md) |

The source of truth for scope is the *BAID Atlas Full Platform Blueprint* (working specification dated
15 October 2026). These documents are a living specification and change as product, legal, provider and
implementation decisions are verified.
