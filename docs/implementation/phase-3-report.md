# Phase 3 report: leads, and the move to plain HTML, CSS and JavaScript

## What was built

**Leads (database, migration `20261017205205_leads` plus follow-ups)**

- Inquiries: one conversation per person per listing. `send_inquiry` takes an idempotency key, so a
  double tap or a retry on a weak connection never creates a second inquiry or message.
- Messages: `send_message` is also idempotent; read receipts (`mark_inquiry_read`) drive unread badges.
- Viewing requests: `request_viewing` and `respond_viewing` (confirm, decline, propose a new time,
  complete, cancel). The end must be after the start, times are in the future, and the time zone must be
  a real IANA zone such as `Africa/Accra`.
- Reports: anyone signed in can report a listing (`report_listing`); moderators work the queue
  (`get_report_queue`, `resolve_report`) and must leave a note when closing one.
- Notifications are written for new inquiries, messages and viewing changes.
- Rate limits on inquiries, messages, viewing requests and reports.
- Roles: owners, admins and lead managers manage leads; listing managers and viewers can read them.
- 51 new pgTAP tests (157 in total) covering access, idempotency, time validation and rate limits.

**Website rewritten as plain HTML, CSS and JavaScript (`site/`)**

- Every page from Phases 1 and 2 plus the Phase 3 pages: inbox, conversation, provider leads, the
  message, viewing and report sheets on the property page, and the staff pages (review queue, listing
  review, reports, organisation verification).
- No framework and no build. One stylesheet, one shared engine (`site/js/core.js`) and one small
  script per page. Values are escaped by default (`html```), and a strict Content-Security-Policy only
  allows scripts from the site itself.
- Black-and-white Propertiq design with a black header and footer for the white logo.
- Sign-in stays phone number + SMS code via SasuSync; the code is filled in automatically on
  supported phones and the page continues as soon as six digits are in.

**Rebrand**: SMS text and the sender name on system messages now say Propertiq.

## Checks

- `pnpm lint`: clean.
- `pnpm test`: 35 unit tests for the shared modules (escaping, safe redirects, phone numbers, prices,
  search filters, cursors).
- `pnpm test:e2e`: 65 browser tests on Pixel 7, iPhone 14 and desktop sizes (layout at 360–430 px,
  access control on every signed-in page, open-redirect protection, security headers, PWA files,
  search). The signed-in journey runs when Supabase test phone numbers are configured.
- `pnpm db:test:local`: 157 database tests.

## Still to do

- Replace the text wordmark with the original logo file and regenerate the icons and social image
  from it, unchanged.
- In-app notification list (the data is already recorded).
