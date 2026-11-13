# DriverCompass — Logo Concepts

**Date:** 13 November 2026
**Decision:** Concept B, "Heading", selected and built in `public/brand/`.

Three directions were drawn, rendered at 16px, 32px and 96px on light and dark grounds,
and judged on legibility, distinctiveness, meaning and app-icon behaviour.

## Concept A — Open waypoint

A diamond outline with one edge left open and a dot offset to the north-east.

- **Reads as:** a waypoint on a route, an open path.
- **Strengths:** calm, geometric, not a truck.
- **Weaknesses:** a diamond plus a dot is generic in mapping and navigation products; at 16px
  the dot collapses and the shape becomes any small diamond. On a dark ground the outline alone
  disappears unless inverted, and the inversion loses the open edge.
- **Verdict:** rejected. Not ownable, and the small-size failure is structural.

## Concept B — Heading (selected)

A two-tone kite: an amber leading edge over a solid ink body, apex at the top, a notch cut at the
base. It is a direction of travel abstracted to one silhouette.

- **Reads as:** heading, bearing, forward motion. No dial, no rose, no needle sweep, no vehicle.
- **Strengths:** one strong silhouette that survives 16px as a single shape; two tones let the mark
  carry the amber accent without a second element; it works as a wordmark companion and alone; it
  stacks naturally into an app tile.
- **Weaknesses:** at 16px the two tones merge, so a single-colour simplification is required
  (`mark-simple.svg`, `favicon.svg`); the notch needs to stay above 20px.
- **Verdict:** selected.

## Concept C — Monogram DC

A bold D with an amber dot in the counter, intended to read as D + C.

- **Reads as:** the letter D with a dot. The C never appears without being explained.
- **Strengths:** typographic, quiet.
- **Weaknesses:** it communicates initials, not direction; at 16px only the D survives; on dark it
  becomes a dot.
- **Verdict:** rejected.

## Why B won

| Criterion | A | B | C |
| --- | --- | --- | --- |
| 16px legibility | weak | strong after simplification | weak |
| Distinctiveness | low | medium-high | low |
| Says "direction, informed choice" | partly | yes | no |
| App icon | breaks on dark | works inverted | breaks on dark |
| Works with a long wordmark | yes | yes | yes |

B is the only direction that keeps one readable shape at every size, and the only one whose
silhouette survives inversion. It also gives the brand a repeatable rule: **the amber edge always
leads**, which is the visual form of the positioning line.

## Simplification rule

| Size | Asset | Rule |
| --- | --- | --- |
| 32px and above | `mark.svg` / `mark-inverse.svg` | two tones, notch visible |
| 16-31px, favicons, mono print | `mark-simple.svg` / `favicon.svg` | one colour, no notch, no second tone |
