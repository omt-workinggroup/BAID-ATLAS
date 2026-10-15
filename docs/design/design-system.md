# Design system

Status: **brand applied (15 Oct 2026).** Black + gold from the BAID Atlas logo; typeface Plus Jakarta Sans.
The mark is redrawn as vector in `components/logo.tsx` (B with roof spine, gold towers, orbit, guiding star).
Gold text uses `--gold-strong` (#9a6a12) on light backgrounds to meet 4.5:1 contrast; bright gold is for
fills, icons and large display text. Illustrations on the home page are always labelled "Illustration". A visual preview lives in
[`preview/tokens.html`](preview/tokens.html) (screenshot: [`preview/tokens-mobile.png`](preview/tokens-mobile.png)).

## Principles

1. **Mobile first.** Design at 360–430 px; enhance at 768 px and 1024 px.
2. **Honest by default.** Trust labels state their scope; sponsored content is always labelled; renders are
   marked.
3. **Fast on slow networks.** Few fonts, system fallback, compressed images, skeletons over spinners.
4. **Accessible.** WCAG 2.2 AA contrast; 44 px touch targets; visible focus; reduced motion respected.

## Tokens

### Colour (light)

| Token | Value | Use |
| --- | --- | --- |
| `--color-bg` | `#FAFAF7` | Page background |
| `--color-surface` | `#FFFFFF` | Cards, sheets |
| `--color-text` | `#1C1B18` | Body text |
| `--color-text-muted` | `#5E5B53` | Secondary text (≥ 4.5:1 on bg) |
| `--color-border` | `#E4E1D8` | Dividers, inputs |
| `--color-primary` | `#0F5B4A` | Primary actions, links (deep green) |
| `--color-primary-contrast` | `#FFFFFF` | Text on primary |
| `--color-accent` | `#C8862A` | Highlights (warm gold), never for text on white |
| `--color-verified` | `#1D6FB8` | Verification scope labels |
| `--color-sponsored` | `#6B4BA1` | "Sponsored" labels |
| `--color-warning` | `#9A5B00` | Render / concept labels, cautions |
| `--color-danger` | `#B3261E` | Errors, destructive actions |

### Colour (dark)

`--color-bg #121210`, `--color-surface #1C1B18`, `--color-text #F2F0EA`, `--color-text-muted #B5B1A6`,
`--color-border #33312C`, `--color-primary #4FBF9F`, `--color-primary-contrast #08241D`.

### Typography

- Font: **Inter** (variable, self-hosted subset) with `system-ui` fallback.
- Scale (mobile → ≥ 1024 px): `xs 12/16`, `sm 14/20`, `base 16/24`, `lg 18/26`, `xl 20/28`,
  `2xl 24/30 → 28/34`, `3xl 28/34 → 36/42`.
- Prices use tabular numerals and always show the ISO code or symbol, e.g. `GHS 1,250,000`.

### Spacing, radius, elevation

- Spacing scale (px): 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Page gutter 16 px on phones, 24 px tablet.
- Radius: `sm 6px`, `md 10px`, `lg 16px`, `full`.
- Shadow: `sm 0 1px 2px rgb(0 0 0 / .06)`, `md 0 4px 12px rgb(0 0 0 / .08)`.

### Breakpoints

`sm 640`, `md 768`, `lg 1024`, `xl 1280`. Styles are written mobile-first (`min-width` queries only).

### Motion

Durations 120 / 200 / 320 ms, ease `cubic-bezier(.2,.8,.2,1)`. All non-essential motion is disabled under
`prefers-reduced-motion: reduce`.

## Core components (Phase 1–2)

- **App shell:** sticky top bar; bottom tab bar (Home, Explore, Map, Saved, Account) on phones, safe-area
  insets respected.
- **Buttons:** primary, secondary, ghost, destructive; min height 44 px; full width on phones in forms.
- **Inputs:** label above field, helper and error text, 16 px font (prevents iOS zoom).
- **Bottom sheet:** filters and quick actions on phones; becomes dialog/side panel on desktop.
- **Property card:** image (16:10, lazy), price + currency, purpose, beds/baths/area with units, locality,
  labels row.
- **Labels (badges):**
  - *Verified: <scope>* — e.g. "Organisation identity checked · 12 Oct 2026". Tapping opens what the check
    does and does not establish.
  - *Sponsored* — always shown on paid placements.
  - *Render* / *Virtually staged* / *Concept* — on media and cards.
- **Empty, loading (skeleton) and error states** for every list and detail view.

## Brand tokens (current)

| Token | Light | Dark |
| --- | --- | --- |
| `--primary` (ink / main buttons) | `#121212` | `#E2B04A` |
| `--gold` | `#D9A12E` | `#D9A12E` |
| `--gold-strong` (gold text) | `#9A6A12` | `#E8BC5C` |
| `--bg` | `#F7F6F3` | `#0B0B0B` |
| `--surface` | `#FFFFFF` | `#161616` |
| Gold gradient | `#F6D27A → #D9A12E → #A8741A` | same |

Shapes: pill buttons (`rounded-full`), 20–24 px card radii, round category bubbles, horizontal snap rails on
phones. Social preview: `lib/og.tsx` (1200×630, generated at build).
