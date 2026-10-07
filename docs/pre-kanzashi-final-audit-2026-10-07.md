# Pre-KANZASHI final audit — 2026-10-07

This document records the final website work that can be completed before the KANZASHI account-level answers arrive. It is an audit/change log, not a claim that Phase 3E or the full final freeze is complete.

## Closed in this cleanup

- Closed stale draft PR #48 as superseded. It was 134 commits behind main and must not be merged.
- Migrated the still-useful FAQ-only facts from #48 without reverting later accessibility/SEO fixes:
  - free foot bath about 3–5 minutes and not counted in treatment time;
  - Body Care 30 minutes is upper or lower body, with 60+ minutes as the whole-body guide;
  - free treatment wear, six aroma scents, tea, and current paid options/prices;
  - in-store salon only; no hotel/home outcall;
  - cancellation/late-arrival wording aligned with the live Booking page.
- Made Body / Foot / Aroma third-party review proof durable: the service-intent keyword remains in each heading, while body copy links to the complete Google Maps / HOT PEPPER Beauty review sets without claiming a particular service review must remain published forever.
- Made the homepage third-party review cards similarly evergreen.
- Aligned zh/ko LocalBusiness opening-hours schema with the January 1 closure already shown in page copy and ja/en structured data.
- Added regression guards for the FAQ facts and holiday schema.
- Updated sitemap lastmod only for pages actually changed.

## Website business truth currently locked

- Address: 東京都大田区蒲田5-12-3 北島ビル4F
- Phone: 03-6874-6808
- JR Kamata East Exit: about 1 minute
- Keikyu Kamata: about 10 minutes
- Hours: 11:00–02:00
- Closed: January 1
- Latest appointment start / final reception: 23:30
- Late-night fee: ¥800 per guest when actual arrival is 23:00 or later
- Payment: cash / credit cards / PayPay
- Treatment space wording on the website: three walls with a curtain entrance; “個室仕様”
- Two guests may request the same room at no room surcharge; availability is confirmed by the salon reply
- Booking submission is a request until the salon replies and confirms it

## Cross-channel findings to resolve outside this website PR

These are not reasons to change the successful website SEO assets.

### HOT PEPPER Beauty

Current public listing agrees on the address, JR Kamata access, 11:00–02:00 hours, January 1 closure and major payment methods.

Items requiring channel-side review:
- Public HPB copy says “24:00以後予約も可能”, while the website's finalized latest appointment start is 23:30.
- HPB uses “全室個室”, while the website deliberately uses the more precise “三方を壁で仕切り、入口はカーテン” / “個室仕様”.
- HPB has platform-specific coupons and prices. These should be treated as channel offers, not automatically copied into the official website price table.

### KLOOK

Current public listing is consistent on JR Kamata access and the salon identity, but it is a channel-specific product with its own package names, late-arrival rules and language claims. KLOOK is not directly integrated with KANZASHI according to the KANZASHI support email.

Before the final cross-channel freeze, confirm that KLOOK's language-support wording and package/service terminology still match actual operations.

## Intentionally unchanged before KANZASHI reply

- Homepage Title/H1
- Body / Foot / Aroma / Late-night successful Title/H1 assets
- Homepage hero booking priority
- Mobile fixed CTA channel priority
- GBP preferred booking link
- Booking architecture
- canonical / robots strategy
- GBP UTM attribution URLs

## Still blocked / pending

- KANZASHI: whether かんざし結 supports EN/ZH/KO self-service booking through confirmation
- KANZASHI: whether the existing multilingual web form can auto-register reservations via API/Webhook/another import method
- Phase 3E final booking architecture
- Final website × GBP × HPB × KLOOK business-truth freeze after the booking architecture is decided
- Final production QA and 28-day freeze
