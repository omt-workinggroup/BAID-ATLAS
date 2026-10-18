# Propertiq

Property listings for Ghana, reviewed before they go live, with verification labels that say exactly what
was checked. Mobile first: buyers and renters browse, save, message providers and request viewings;
agencies, developers and landlords manage listings, leads and teams; staff moderate listings and reports.

Live site: https://propertiq-gh.vercel.app (the earlier address https://baid-atlas.vercel.app still works).
Vercel project: `propertiq`.

## How the code is laid out

The website is plain **HTML, CSS and JavaScript**. There is no framework and no build step: edit a file,
refresh the browser.

| Folder | What's in it |
| --- | --- |
| `site/*.html` | One file per page (home, explore, property, inbox, portal, ops…). |
| `site/css/style.css` | Every style, starting with the colour and spacing tokens at the top. |
| `site/js/core.js` | Shared engine: Supabase connection, safe HTML (`html```), header/footer/navigation, sign-in checks, form helpers. |
| `site/js/pages/*.js` | The script for each page, named like the page. |
| `site/js/format.js`, `validate.js` | Labels, price/area formatting and form rules. |
| `site/js/config.js` | Public Supabase URL and publishable key (safe to publish; never put a secret key here). |
| `vercel.json` | Clean URLs, routes such as `/properties/:slug`, redirects and security headers. |
| `supabase/` | Database migrations, row-level security, tests and the `send-sms` function (SasuSync). |

Security is enforced by the database (row-level security and checked functions), not by the browser code.

## Development

```bash
pnpm install          # test and lint tools only
pnpm dev              # http://localhost:3000, same routes as Vercel
pnpm lint             # ESLint
pnpm test             # unit tests (tests/site)
pnpm test:e2e         # browser tests on phone and desktop sizes
pnpm db:test:local    # database and RLS tests (pgTAP)
```

Pushing to the branch deploys to Vercel; there is nothing to build.

## Documentation


| Area | Document |
| --- | --- |
| Propertiq plan | [Phase 0 discovery and roadmap](docs/propertiq/phase-0-discovery.md) · [Competitor analysis](docs/product/competitor-analysis.md) |
| Product | [Requirements](docs/product/requirements.md) · [Route map](docs/product/route-map.md) |
| Architecture | [Technology decisions](docs/architecture/technology-decisions.md) · [System architecture](docs/architecture/system-architecture.md) · [Database design](docs/architecture/database-design.md) |
| Security | [Threat model](docs/security/threat-model.md) · [Permissions matrix](docs/security/permissions-matrix.md) |
| Quality | [Acceptance criteria](docs/quality/acceptance-criteria.md) |
| Delivery | [Phase plan](docs/implementation/phase-plan.md) · [Phase 0 report](docs/implementation/phase-0-report.md) · [Phase 1 report](docs/implementation/phase-1-report.md) · [Phase 2 report](docs/implementation/phase-2-report.md) · [Phase 3 report](docs/implementation/phase-3-report.md) |
| Design | [Design system](docs/design/design-system.md) |

The source of truth for scope is the *BAID Atlas Full Platform Blueprint* (working specification dated
15 October 2026). These documents are a living specification and change as product, legal, provider and
implementation decisions are verified.
