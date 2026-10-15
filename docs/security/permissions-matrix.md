# Permissions matrix

Two independent role systems:

- **Organisation roles** (per organisation): owner, admin, listing_manager, marketing_manager, lead_manager,
  viewer.
- **Staff roles** (platform): moderator, verification_reviewer, marketing_specialist, platform_admin.

An organisation owner has **no** platform privileges. Every protected operation also requires an active
(non-suspended) account and, where relevant, an active organisation. Every check is enforced in a server
action **and** in RLS/RPC.

Legend: ✅ allowed · 👁 read only · ⚙️ via RPC with workflow checks · 🔒 assigned items only · — denied

## Public and personal

| Action | Visitor | Registered user |
| --- | --- | --- |
| Browse published, non-expired listings (public view) | 👁 | 👁 |
| See exact address / provider private contacts | — | — (only after provider shares in conversation) |
| Save properties, manage collections | — | ✅ own |
| Send inquiry / request viewing | — (sign-in required; decision open) | ✅ rate-limited |
| Read own inquiries and messages | — | ✅ own |
| Edit own profile, preferences | — | ✅ own (not `account_status`) |
| Create an organisation | — | ✅ (email verified) |

## Organisation roles

| Action | owner | admin | listing_mgr | marketing_mgr | lead_mgr | viewer |
| --- | --- | --- | --- | --- | --- | --- |
| View org dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | 👁 |
| Edit org profile | ✅ | ✅ | — | — | — | — |
| Invite/remove members, change roles | ✅ | ✅ (not owners) | — | — | — | — |
| Transfer ownership / delete org | ✅ | — | — | — | — | — |
| Create/edit draft listings and media | ✅ | ✅ | ✅ | — | — | — |
| Submit listing for review | ⚙️ | ⚙️ | ⚙️ | — | — | — |
| Pause / archive / mark sold or rented | ⚙️ | ⚙️ | ⚙️ | — | — | — |
| Read and manage inquiries/leads | ✅ | ✅ | 👁 | — | ✅ | 👁 |
| Manage viewings | ✅ | ✅ | — | — | ✅ | 👁 |
| Developments and unit inventory | ✅ | ✅ | ✅ | — | — | 👁 |
| Studio orders and campaigns | ✅ | ✅ | — | ✅ | — | 👁 |
| Submit organisation verification | ⚙️ | ⚙️ | — | — | — | — |
| Billing and subscription | ✅ | 👁 | — | — | — | — |
| Read org audit trail | ✅ | ✅ | — | — | — | — |

## Staff roles

| Action | moderator | verification_reviewer | marketing_specialist | platform_admin |
| --- | --- | --- | --- | --- |
| Review queue: approve / request changes / reject listings | ⚙️ | — | — | ⚙️ |
| Read verification evidence | — | 🔒 signed URL | — | — (assign only) |
| Decide verification cases | — | ⚙️ 🔒 | — | — |
| Assign verification cases | — | — | — | ⚙️ |
| Edit verification evidence | — | — | — | — (never) |
| Work on campaigns/studio orders | — | — | 🔒 | 👁 |
| Suspend / reinstate accounts and orgs | — | — | — | ⚙️ |
| Grant/revoke staff roles | — | — | — | ⚙️ (MFA required) |
| Country, currency, category config | — | — | — | ⚙️ |
| Read full audit log | 👁 own actions | 👁 own actions | — | 👁 |
| Write/modify audit log | — | — | — | — (no one) |

## Suspended state

A suspended user can sign in, read their own profile and see a suspension notice; all other protected
actions are denied. A suspended organisation's listings are hidden from public views and its members cannot
perform org actions.
