# Design QA — 身悠晏 Premium V2.2

Reference: Urban Ryokan concept (`exec-b61bbd46-e4a6-45c1-87dc-6991f55c9530.png`)

Implementation checked at desktop viewport and inside a 390 × 844 mobile viewport.

## Reference comparison

- Preserved the reference's warm ivory, ink-green and restrained-gold palette.
- Preserved the split hero, large editorial Japanese headline, direct booking CTA and trust ribbon.
- Replaced concept imagery with the salon's supplied treatment photography.
- Used a text wordmark in the header instead of the supplied metallic logo to retain small-size clarity.
- Added the V2.1 review, menu, access, reservation, English and recruitment content below the premium hero.

## Responsive and accessibility checks

- No horizontal overflow at the desktop viewport.
- Mobile hero stacks image first, copy second, with the booking CTA visible before the first scroll completes.
- Mobile fixed actions retain 48 px minimum targets and safe-area padding.
- Page has a single real H1; treatment images have descriptive alt text.
- Mobile menu opens successfully and updates `aria-label` / `aria-expanded` state.
- Reduced-motion users receive near-zero animation duration.

## Resource and build checks

- All three new WebP treatment images load successfully.
- Gallery images are intentionally inherited from the existing GitHub repository and were verified present there.
- Vite production build completed successfully.

## Severity review

- P0: none
- P1: none
- P2: none

final result: passed
