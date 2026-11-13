# DriverCompass — Brand Guidelines

Version 1.0 · 13 November 2026 · applies to the web application, documents, email and social.

## 1. Foundation

| | |
| --- | --- |
| Name | DriverCompass |
| Tagline | Know the employer. Choose your next move. |
| Descriptor | A driver-first professional marketplace. |
| Philosophy | Built around drivers. |
| Mission | Give professional drivers the information, independence and voice to choose who they work for. |

**Pillars:** independence, transparency, trust, professionalism, European reach.

**We are not** a recruitment agency, a generic job board, a haulage company or a social network.
Copy must not drift into those voices.

## 2. The mark

A two-tone heading: an amber leading edge over an ink body, apex up, notch at the base.

| Asset | Use |
| --- | --- |
| `public/brand/mark.svg` | the mark on light grounds, 32px and above |
| `public/brand/mark-inverse.svg` | the mark on dark grounds |
| `public/brand/mark-simple.svg` | one colour, 16-31px, print, embroidery |
| `public/brand/logo-primary.svg` | horizontal lockup on light |
| `public/brand/logo-primary-inverse.svg` | horizontal lockup on dark |
| `public/brand/logo-stacked.svg` | square spaces (documents, social cards) |
| `public/brand/app-icon.svg`, `app-icon-maskable.svg`, `icon-192.png`, `icon-512.png` | application icons |
| `public/brand/favicon.svg`, `favicon-16.png`, `favicon-32.png`, `favicon.ico` | browser |
| `public/brand/avatar.svg` | social profile image |

**Do not** rotate the mark, outline it, add a glow, place it on a photograph, or rebuild it from a
stock icon. The geometry is fixed: apex 16,2; base 5,30 and 27,30; notch apex 16,23.

**Clear space.** Half the mark's height on every side, measured from the bounding box. Nothing
enters it — no text, no rule, no neighbouring logo.

**Minimum sizes.** Mark 16px (single-colour form only), 24px for the two-tone form. Horizontal
lockup 96px wide. Stacked lockup 64px wide.

**Backgrounds.** Paper `#F6F5F1`, white `#FFFFFF` and ink `#0A1A2A` only. On photography the mark
is never used; use the paper or ink lockup on a solid panel.

## 3. Colour

| Token | HEX | Role |
| --- | --- | --- |
| Ink | `#0A1A2A` | type, the mark body, primary actions |
| Paper | `#F6F5F1` | page ground |
| Surface | `#FFFFFF` | cards, inputs |
| Muted | `#61707F` | secondary type, labels |
| Line | `#E2E5E1` | rules and borders |
| Line strong | `#CFD6D2` | control borders |
| Accent | `#E8A33D` | the leading edge of the mark; one attention element per screen |
| Brand | `#0B2B45` | link and icon colour on light |
| Success | `#16705A` | verified, confirmed |
| Warning | `#A8640D` | needs action |
| Danger | `#A3271F` | destructive, refused |

Dark theme values live in `src/app/globals.css` under `html.dark`; the brand is expected to work in
both themes and every new component is checked in both.

**Rule: one amber element per screen.** Amber marks the thing the driver should look at. It is not
a second button colour, and it is never used for status.

## 4. Typography

**Geist Sans** for everything, **Geist Mono** for numbers in records and tables. Both are already
self-hosted through the `geist` package — no additional font is loaded.

| Level | Desktop / mobile | Weight | Tracking |
| --- | --- | --- | --- |
| h1 (hero) | 52 / 40px, leading 1.04 | 500 | -3.5% |
| h2 | 48 / 32px, leading 1.08 | 500 | -3% |
| h3, card title | 20 / 18px | 500 | -1% |
| Body | 16 / 16px, leading 1.6 | 400 | 0 |
| Small, labels | 13-14px | 400-500 | 0 |
| Eyebrow | 12px uppercase | 500 | +14% |

Never 700+ outside the wordmark. Headlines are sentence case. Numbers in records are set in Geist
Mono so columns of pay and rotation align.

## 5. Layout and spacing

- One content width: `1280px` maximum, `24px` gutters on phones, `32px` from 640px.
- 12-column grid, 24px gutter. Blocks start on the left line and end on a column line.
- Section rhythm: 120px top, 64px bottom on desktop; 64/40 on phones.
- Corners: `16px` for cards and panels, `8px` for inputs and small chips, full pill for buttons.
- Rules: 1px `#E2E5E1`. No shadows except a single hover shadow on linked cards.

## 6. Buttons and links

| Role | Style |
| --- | --- |
| Primary | ink fill, paper text, pill, 48px tall, `hover:bg-brand-600` |
| Secondary | surface fill, `1px` line-strong border, ink text |
| Quiet | text only, ink-soft, underline draws on hover |
| Destructive | danger-soft fill, danger text, danger border |

Links use the brand navy and draw a 1px underline on hover. Never underline body text to signal a
link; never use amber for a link.

## 7. UI guidance

- Cards: surface, `1px` line border, 16px radius, 20-24px padding, one idea each.
- Status: soft background plus strong text from the same family (success, warning, danger); never a
  solid fill with white text except the verified check.
- Tables: mono figures, right-aligned numbers, 1px row rules inside the content edges only.
- Icons: 16px stroke icons, 1.8 stroke, never mixed with filled icons in the same list.
- Motion: one entrance per page, a 2px card lift, a drawn underline. All of it rests under
  `prefers-reduced-motion`.

## 8. Voice

Plain, specific, dry. Every claim is a field of the record: the deduction, who unloads, whether the
hirer is an agency. No "we", no superlatives, no promises of outcomes, no exclamation marks.
British spelling.

## 9. The reviews proposition

DriverCompass has one differentiator that the market does not: **verified driver reviews of employers**.

**Line:** Real drivers. Real experiences. Better employment decisions.

**Website section:**

> Don't just read the job offer. Hear from the drivers.
>
> Find out what other professional drivers say about the companies they have worked for. Compare
> experiences, understand working conditions, and make your next move with greater confidence.

**Presentation rules that carry the brand's honesty:**

- Every review carries its status in words: **Verified experience**, **Period confirmed**, **Not verified**.
- The recommendation percentage always states its denominator and that only verified experiences count.
- A company reply is labelled **Company reply** and is visually distinct from a driver review. It is never counted as a review or a vote.
- Three kinds of statement are separated everywhere: verified fact, company statement, driver opinion.
- No review is bought, reordered or removed by subscription, and the interface says so where the score is shown.

The design concept for the employer-review section and the driver's optional "My experience" block is
in `docs/design/reviews-concept.html` (rendered views beside it).

## 10. What is deliberately unfinished

- **The wordmark is live text**, not outlined paths: `logo-primary.svg` and `logo-stacked.svg` set
  "DriverCompass" in Geist with a system fallback. In the application the React component sets the
  same wordmark in the real font, so the site is unaffected; exported SVGs fall back to the system
  sans where Geist is not installed. Outlining the wordmark is a follow-up for print.
- **Contact mailboxes remain `@milevana.eu`** until the DriverCompass domain exists. Changing the
  addresses before the domain is owned would break working contact routes.
- **No ® symbol** anywhere: the name is a working brand, not a registered trade mark.
