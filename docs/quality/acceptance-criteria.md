# Acceptance criteria

A phase is accepted only when its criteria have **automated tests that were actually run**, a verified
production build, and a phase report stating real results.

## Platform-wide

| ID | Criterion | Test type | Phase |
| --- | --- | --- | --- |
| AC-01 | Public search returns only eligible published, non-expired listings | pgTAP + E2E | 2 |
| AC-02 | Filters combine correctly; pagination is stable (keyset, deterministic tiebreak) | Unit + E2E | 2 |
| AC-03 | Property detail shows exact amount + currency, measurement units, media labels, approximate location, provider and trust scope | E2E | 2 |
| AC-04 | Auth: email verification, reset, logout, safe redirects, session revocation | E2E + unit | 1 |
| AC-05 | Cross-user and cross-organisation access attempts fail (guessed IDs) | pgTAP + E2E | 1+ |
| AC-06 | Listing and verification state transitions are validated and audited | pgTAP | 2, 4 |
| AC-07 | Duplicate inquiry key returns the existing record | pgTAP + unit | 3 |
| AC-08 | Viewing request enforces valid timezone and end > start | pgTAP | 3 |
| AC-09 | Unit codes unique per development; inventory updates authorised and audited | pgTAP | 4 |
| AC-10 | Verification evidence private; reviewer assignment enforced | pgTAP + storage test | 4 |
| AC-11 | Payment webhook replay cannot duplicate processing or entitlements | Integration | 6 |
| AC-12 | Display currency cannot mutate stored price | Unit + pgTAP | 2 |
| AC-13 | Suspended account/org cannot perform protected actions | pgTAP + E2E | 1+ |
| AC-14 | Unverified provider cannot publish | pgTAP | 2 |
| AC-15 | Moderation actions are audited | pgTAP | 2 |
| AC-16 | Expired listings excluded from public results | pgTAP | 2 |

## Mobile and accessibility (every phase)

| ID | Criterion |
| --- | --- |
| M-01 | Every shipped route renders without horizontal scroll at 360 px, 390 px and 430 px widths |
| M-02 | Touch targets ≥ 44×44 px; primary actions reachable with one thumb (bottom of screen on phones) |
| M-03 | Lighthouse mobile (Moto G Power emulation, slow 4G): Performance ≥ 85, Accessibility ≥ 95 on public pages |
| M-04 | Keyboard operable; visible focus; logical heading order; labelled form fields |
| M-05 | `prefers-reduced-motion` disables non-essential animation |
| M-06 | Every route has loading, empty and error states |
| M-07 | Playwright screenshots at Pixel 7 and iPhone 14 viewports attached to each phase report |

## Phase 0 (this phase)

| ID | Criterion | Result |
| --- | --- | --- |
| P0-01 | Repository inspected; findings reported | Done — see [phase-0 report](../implementation/phase-0-report.md) |
| P0-02 | Ten required documents exist | Done |
| P0-03 | No secrets printed, no deployment, no destructive commands | Done |
