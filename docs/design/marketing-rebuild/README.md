# Marketing page rebuild — review request

The public homepage was rebuilt on the design system the rest of the product does not use yet:
a dealt layout (collage hero), one type pairing, one accent, one button shape, and two scripted
moments. The goal was to make the page sell the product rather than describe it, and to stop the
first screen from reading like a documentation index.

Screenshots: `hero-1440.png`, `record-1440.png`, `verification-1440.png`, `hero-390.png`.
Run it: `npm run dev`, then http://localhost:3000/.

## What changed

- The old `src/app/(public)/page.tsx` (Tailwind, seven prose sections) is replaced by
  `src/app/(marketing)/page.tsx` in its own route group with its own nav and footer.
- The page's system is copied into `public/assets/` (layout, cards, motion, moments, one shader
  ground) and mounted after hydration by `src/components/marketing/kit-boot.tsx`.
- Fonts are self-hosted under `public/assets/fonts/` because the site's CSP blocks Google Fonts.
- `src/app/layout.tsx` carries the kit's `data-*` attributes on `<html>`; they are inert outside
  this route.
- `next.config.ts` allows the dev origin `127.0.0.1`, without which Next 16 blocks its own dev
  resources and the page silently never hydrates.

## The design decisions worth arguing about

1. **Hero.** A three-line claim, one hard fact (29 fields per vacancy), two actions, and a live
   vacancy window cut by its frame. The right-hand art is the product, not a mood.
2. **Colour.** The client's existing navy/paper/amber, not the palette a blind deal would have
   given us, so the landing page and the dashboards still read as one company.
3. **Type.** Schibsted Grotesk + JetBrains Mono, self-hosted; headlines at 400 with tight tracking
   rather than heavy weights.
4. **Moments.** A disc opens the dark verification band (`iris-opens`); the statement assembles its
   letters (`letters-assemble`). Both rest completely under reduced motion and on phones.
5. **Copy.** The page keeps the honest tone of the product: no invented reviews, no statistics we
   cannot support, and the pilot disclosure stays visible.

## Open questions for reviewers

- Does the hero claim ("Truck jobs with the conditions written down") say what is sold fast enough,
  or is "29 fields" doing too much of the explaining?
- Is the vacancy window in the hero too dense at 1440? The list has 10 rows and the right pane
  holds 10 fields plus one review.
- The verification band and the statement are the two "designed" moments. Do they earn their
  screens, or should one of them go?
- The page runs to seven screens. For a driver deciding whether to sign up, is anything missing
  before the FAQ (pay examples, countries, a sample review)?

## Known open issues

The static craft checker still lists 11 findings, most of them typographic strictness: one clipped
row under the list fade, the close button counted as a third button style, four headings without a
section noun, the FAQ's last line 30px from the section edge, a full-width rule in the verification
log, the FAQ's side column on a non-standard split line, the FAQ reading as text-only at 390, a
123px overlap of the dark band in the fields tile at 390, and the statement filling 38% of its
screen at 390. None of them block the page; they are the next polish pass.
