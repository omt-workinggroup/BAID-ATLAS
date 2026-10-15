# Threat model

Method: STRIDE per asset, prioritised by impact for an early-stage property marketplace in Ghana.

## Assets

1. Personal data: names, emails, phones, inquiry messages, identity documents (verification evidence).
2. Exact private property addresses and coordinates.
3. Trust signals: verification status/labels, moderation decisions, featured/sponsored flags.
4. Organisation control: memberships and roles.
5. Money-adjacent data: subscriptions, entitlements, payment events.
6. Platform secrets: Supabase service-role key, payment and webhook secrets.

## Threats and mitigations

| # | Threat | STRIDE | Mitigation | Test |
| --- | --- | --- | --- | --- |
| T1 | Guessed/enumerated IDs read another org's listings, leads or evidence | I | RLS on every table; UUIDs; server guards; public views only | Cross-org RLS tests; guessed-ID E2E |
| T2 | Client sets `status = 'published'` or `verification_status = 'verified'` | T, E | No column-level update grants on status fields; RPC-only transitions with state checks | RLS test: direct update denied |
| T3 | Unverified provider publishes a listing | E | Publish RPC checks org/user eligibility | Unverified publish prevention test |
| T4 | Fake or scam listings (advance-fee fraud, non-existent properties) | S | Moderation queue before publish; report cases; scoped verification labels; safety page | Moderation audit test |
| T5 | Verification evidence leaked via public bucket or long-lived URL | I | Private bucket; signed URLs ≤ 60 s after assignment check; no evidence in views | Unassigned reviewer denial test; private evidence test |
| T6 | Exact address exposed on detail page/map | I | Separate private address/coords; rounded public coords; views exclude private columns | Snapshot test on public payloads |
| T7 | Inquiry spam / credential stuffing | D, S | Rate limits (auth, inquiries, uploads, verification); CAPTCHA-style challenge if abuse observed; idempotency keys | Rate-limit unit tests; duplicate inquiry test |
| T8 | Payment webhook replay or forgery grants entitlements | S, T | Signature verification; unique provider event ID; transactional processing | Webhook replay test |
| T9 | Suspended user keeps acting | E | `requireActiveAccount` guard + RLS helper `is_active_user()` | Suspension test |
| T10 | Org privilege escalation (viewer makes self owner) | E | Role changes only via RPC requiring owner/admin; last-owner protection; audited | RLS + RPC tests |
| T11 | Staff abuse (moderator edits evidence) | T, R | Separate staff roles; evidence immutable after submission; audit log append-only | Audit tests |
| T12 | Malicious uploads (oversized, wrong type, HTML/SVG XSS, EXIF GPS leak) | T, I | Type/size/extension allow-list, safe filenames, strip EXIF, no SVG uploads, moderation before public | Upload validation tests |
| T13 | Open redirect after sign-in | S | Same-origin allow-listed redirect paths | Unit test |
| T14 | Secret leakage | I | Service key only in server-only modules; `.env*` git-ignored; secret scanning in CI; no secrets in logs | CI secret scan |
| T15 | Displayed currency conversion mutates stored price | T | Conversion is presentation-only; no write path | Currency immutability test |
| T16 | Misleading media (render shown as completed build) | — (trust) | Mandatory `is_render` / virtual-staging labels; rights confirmation | UI test on labels |
| T17 | XSS / CSRF | T | React escaping; no `dangerouslySetInnerHTML` on user content; server actions with origin checks; strict CSP | Header/CSP check |

## Residual risks and follow-ups

- Legal review (Ghana Data Protection Act 2012, Act 843; advertising and consumer rules) is required before
  launch — not a technical control.
- Retention, deletion, anonymisation, incident response and backup/restore policies to be written in Phase 8.
- MFA for staff accounts depends on Supabase Auth MFA (TOTP) — enable before ops tools go live.
