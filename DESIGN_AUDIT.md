# DriverCompass — Design Audit and Proposed Visual Direction

**Date:** 13 November 2026
**Scope:** public pages of the DriverCompass application (`/home/stormrage/DriverBnB`)
**Status:** proposal — no design implementation started, per the directive to present the audit first
**Design standard applied:** `design-taste-frontend` (tasteskill 2.5.1), installed at
`~/.hermes/skills/creative/design-taste-frontend`

---

## 1. What this audit is based on

| Evidence | Detail |
| --- | --- |
| Routes read | 43 `page.tsx` routes, 24 shared components, `globals.css`, both layout shells |
| Screenshots | 1440px full-page capture of `/` from the production build (`shoot.mjs`, headless Chrome 157) |
| Live browser pass | `/`, `/jobs`, `/companies`, `/login` at 390 and 1280/1440 |
| Data state | 1 user, 0 companies, 0 vacancies, 0 reviews — most public surfaces render empty states |
| Not verified | authenticated journeys (no seeded accounts), full keyboard/AT pass, 820/768 layout, WebGL-independent checks |

The skill's own layout checker (`check.mjs`) assumes the skill's starter markup
(`.wrap` sections, `--h`, `data-enter`); run against a Next.js app it returns
`r.sections is not iterable` and cannot produce trustworthy findings. Its
screenshot tool (`shoot.mjs`) does work against the live app and was used here.
This is recorded again in §8 because it changes how much of the skill's finish
gate can be borrowed.

## 2. Current visual system

| Element | Current state |
| --- | --- |
| Palette | paper `#f6f5f1`, surface `#ffffff`, ink `#0a1a2a`, brand navy `#0b2b45`, accent amber `#e8a33d`, five soft/strong status pairs |
| Type | Geist Sans + Geist Mono, self-hosted; no display face |
| Type usage | `text-xs` 296 uses, `text-sm` 296 uses; 6 uses of `text-4xl`; hero h1 maxes at `3.4rem` |
| Shape | `--radius-xl: 1rem`, `--radius-2xl: 1.25rem`, every control `rounded-full` |
| Surface treatment | near-every block is a rounded card on paper; three large rounded dark panels per homepage |
| Imagery | none — 0 `<img>`, no `public/` directory, no photography anywhere in the product |
| Icons | lucide line icons in 60 files, all monochrome, one stroke weight |
| Motion | colour transitions on hover only; no entrance, no lift, no press, no `prefers-reduced-motion` guard |
| Dark mode | absent in the committed baseline (an implementation exists uncommitted — §7) |

## 3. Findings

Ordered by effect on the first impression, not by effort.

**F1 — No product evidence is ever shown.** DriverCompass sells a structured vacancy
record and a verified company dossier. No public page shows either as the product
UI it is: the vacancy card, the verification states, the review with right of
reply. The homepage argues about structured data in prose and small cards instead
of displaying one record. This is the single largest reason the site reads as a
template rather than as this product.

**F2 — One rung of typography.** Every section is eyebrow + headline + body +
card grid, six times on the homepage. The scale between `text-xs`/`text-sm`
(592 uses combined) and the headline leaves a hole where a mid-size editorial
voice should sit, and there is no display treatment for the moments that deserve
one (the pay figure, the rotation, the verification promise).

**F3 — Shape monotony.** Rounded card inside rounded panel inside rounded button,
repeated without relief. No rules, no tables, no full-bleed band, no hard-edged
data surface. The homepage has no horizontal texture at all, which is why the
"airy" spacing reads as empty rather than composed.

**F4 — The category is invisible.** No road, truck, cab, depot, or route. A
driver landing on this page would not know it is about their job until they read a
paragraph. Seriousness is a virtue here; anonymity is not.

**F5 — Four competing primary actions.** "Create account" (nav), "Search jobs"
(hero), "Create a free driver account" (trust band), "See employer plans"
(employer band). Driver and employer paths are never visually separated, so the
page has no single answer to "what do I do here".

**F6 — The pilot state is presented as zeros.** The hero prints "0 verified
employers · 0 structured vacancies · 0 published driver reviews". Honest, but it
reads as an unfinished build on the first screen, and it spends the hero's third
strongest visual position on emptiness.

**F7 — No motion and no reduced-motion policy.** Nothing enters, nothing lifts,
nothing presses. There is also no `prefers-reduced-motion` handling, so any
motion added later must arrive with that guard from the start.

**F8 — The problem cards are too tight.** Four narrow cards carrying the densest,
most persuasive copy on the page (gross vs net, accommodation deducted, rotation,
loading) at `text-xs`, in a row that forces the reader to squint at the argument
the product is built on.

**F9 — No dark mode.** Visitors with a dark system preference receive a bright
`#f6f5f1` page. For a product used by drivers at night, at depots, and on phones,
this is a real gap, not a preference.

## 4. Constraints that shape the direction

- Existing Next.js App Router / React / TypeScript / Tailwind / Drizzle stack stays.
- No new runtime dependencies; no CSS framework change; no component library.
- Every authentication, authorisation, privacy, employer, driver and admin workflow keeps working.
- No invented product claims, no invented reviews, no invented customers, no unlabelled stock photography.
- Mobile usability and accessibility are not traded for visual effect.
- The app workspaces (driver, employer, admin) are operational surfaces; their density must not be sacrificed to the marketing direction.

## 5. Proposed visual direction — "the dossier"

**The idea.** DriverCompass's only real asset is the accuracy of a record. The site
should look like a well-made case file: a document you can trust, with the product
record itself as the hero image, and the road as its context. Not a SaaS brochure,
not a moody trucking site.

**One system, four moves.**

1. **The record is the hero.** The homepage hero becomes a live vacancy dossier
   rendered from the real component (company, direct-employer badge, gross pay
   broken down, rotation, accommodation, home time, verification states), with the
   search fields as its header. Same for the company profile page: the dossier
   leads, the review list sits inside it, not beside a marketing panel.
2. **A two-speed type scale.** Keep Geist for UI. Introduce an editorial register
   for the few things that matter — a pay figure set at 4.5–6rem, a rotation
   line, the one line "Employers do not get to buy a better truth" — and raise the
   body floor from `text-xs` to `text-sm` for argument copy. Section headings stop
   being interchangeable by size alone; two sections per page get a type moment
   instead of a card grid.
3. **Hard edges for data, soft edges for controls.** Data surfaces (dossier,
   comparison table, review) get a 4–6px radius, 1px rules and aligned columns;
   buttons and chips keep the pill. One full-bleed dark band per page, no more.
   This gives the page horizontal structure without adding decoration.
4. **The road, in photographs, once the founder licenses them.** Documentary
   frames of a cab interior, a depot at dawn, a trailer in a yard — used where a
   section is about the work, never as wallpaper, never captioned. Until licensed
   photographs exist, the honest intermediate is the product record plus a
   geometric route/conditions diagram, both of which are real content rather than
   stock.

**Palette.** Keep paper, ink and navy. Demote amber from "primary button colour"
to "attention and verification" only, so a page has one amber element and the
primary action is navy. Add two functional tints already implied by the data
model (verified, action required) instead of reusing success/warning everywhere.

**Motion.** Hero content enters once on load (120–200 ms, no fade on scroll).
Linked cards lift 2px; photographs zoom 1.02 inside their frame; buttons step on
hover and press on active; link underlines draw. Everything rests under
`prefers-reduced-motion: reduce`. No parallax, no scroll-jacking, no card fades.

**Dark mode.** Ship it as part of the system rather than as a bolt-on: tokens
already resolve through CSS variables, so the palette above gets a night variant
(deep navy paper, not black), and every new component is checked in both.

## 6. Page-level proposals

| Page | Change |
| --- | --- |
| `/` | Record-led hero; replace the three zero counters with one honest pilot line; problem section becomes a two-column comparison (what an advert says vs what the record must state) instead of four cramped cards; one type moment; employer band reduced to one action |
| `/jobs` | Results as a dense, aligned list with a sticky filter rail; the vacancy card shows the four conditions that decide a job in the first 40mm of the row; empty state keeps the search, not a slogan |
| `/companies/[slug]` | Dossier header (identity, verification states, direct-employer classification), then conditions table, then reviews with the right-of-reply block; remove the marketing panel that currently sits amongst the data |
| `/for-employers` | One action ("Register a company"), a single structured vacancy example, pricing stated as conditions rather than promises |
| Auth | Keep the two-panel layout; replace the marketing bullets with a single factual line and the privacy promise |
| Dashboards / admin | No layout redesign. Token, focus-state and table-density refinements only |

## 7. Uncommitted work already in the tree

Dark mode was implemented and verified before this directive arrived. It is
**not committed** and is listed here so the decision is explicit:

- `globals.css` — light/dark token sets, `html.dark` palette, `@custom-variant dark`
- `layout.tsx` — blocking inline theme script in `<head>`, `suppressHydrationWarning`, viewport `theme-color`
- `theme-toggle.tsx`, `lib/theme.ts` — three-state control (system / light / dark), persisted
- 20 files: `bg-brand` → `bg-brand-solid` where the brand colour is a fill, `bg-ink` replaces `bg-black` washes, accent/danger/neutral text tokens, card shadows tokenised
- Verified: `tsc` 0 errors, `npm test` 173/173, `npm run build` pass, `npm run test:http` 74/74, browser toggling confirmed in both directions

Options: keep it as the base for the redesign, commit it separately first, or
revert it and rebuild the palette inside the new direction.

## 8. What the skill can and cannot enforce here

| Capability | Status |
| --- | --- |
| Node 22+ requirement | Met — Node 26.13.1 |
| Chrome requirement | Met — `/opt/google/chrome/chrome` 157 (must be passed as `CHROME_PATH`) |
| `shoot.mjs` screenshots against a live app | Works |
| `copy-lint.mjs` | Works on HTML files only; the app renders on the server, so it needs saved snapshots |
| `check.mjs` layout checker | Does not work — assumes the skill's starter markup; fails on a Next.js DOM |
| `consistency.mjs` | Expects skill metas (`page-type`, `site-kind`); would fail without them |
| `gate.mjs` finish gate | Arms, but its checker inherits the failure above — cannot be used as a pass/fail gate on this app |
| Asset kit (`assets/`, 40 MB) | Present but unnecessary: no static starter page is being built |

Consequence: the skill's design judgement, copy rules, motion rules and
checklist are usable here; its automated finish gate is not, and must not be
claimed as a gate that passed.

## 9. Decisions needed before any implementation

1. **Photography** — licence documentary road/cab/depot frames, or proceed with product records and diagrams only?
2. **Scope** — public pages only (recommended), or also reset the workspace tokens and density?
3. **Display face** — stay with Geist at a wider scale (no new asset), or add one licensed display face for headers and the wordmark?
4. **Amber** — demote to attention/verification only (recommended) or keep as the primary button colour?
5. **Dark mode** — keep the current implementation, commit it first, or revert and rebuild inside the new direction?

## 10. Effort, if approved

| Work | Estimate |
| --- | --- |
| Tokens, type scale, radius and motion layer | 1 session |
| Homepage rebuild on the dossier direction | 1–2 sessions |
| Jobs list + vacancy card + company dossier | 2 sessions |
| For-employers, auth, footer, remaining public copy | 1 session |
| Screenshot pass at 390/768/820/1024/1440 + a11y checks | 1 session |

No dependency additions are required for any of it.
