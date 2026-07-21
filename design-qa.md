# Design QA — 身悠晏 V2.7 Photography Pass

Reference: the supplied English hero screenshot and the three original 1254 × 1254 treatment photographs.

## Visual treatment

- The Japanese and English home pages keep one consistent clothed-bodycare hero.
- The English hero is split into a patterned text panel and an unpatterned image panel. Seigaiha no longer covers skin, faces, hands or clothing.
- The booking page uses the fully covered scalp-care photograph; the Japanese service card uses neck-oil care; the menu head/facial section uses décolleté care.
- New photographs were resized only through WebP encoding and slight saturation normalization. No generative redraw, skin smoothing or sharpening was applied.
- The three new assets retain 1254 × 1254 pixels and average HSL saturation values between 0.449 and 0.458.

## Responsive and accessibility checks

- Desktop English hero uses a two-column layout with text and image separated.
- At 700 px and below, the English hero stacks the clean photograph above the text panel.
- All changed images include accurate descriptive alternative text without staff claims or image-photo labels.
- Existing reservation buttons, language controls and sticky mobile actions are unchanged.

## Functional checks

- All local `src` and `href` references in `index.html`, `menu.html`, `en/index.html` and `booking.html` resolve.
- Booking inline JavaScript parses successfully.
- WhatsApp submission remains wired to `817091659898`, which corresponds to 070-9165-9898 with Japan country code.
- Visual source inspection completed for all three encoded WebP files. A local browser executable was not available in the container, so post-layout browser screenshots must be confirmed on the deployed GitHub Pages URL.

## Severity review

- P0: none
- P1: none
- P2: none

final result: passed
