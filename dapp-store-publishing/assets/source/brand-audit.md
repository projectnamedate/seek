# Seek Brand And Store Asset Audit

Date: 2026-05-01

## Sources Checked

- Solana Mobile dApp Store submission docs:
  `https://docs.solanamobile.com/dapp-store/submit-new-app`
- Solana Mobile co-marketing guidance:
  `https://docs.solanamobile.com/marketing/comarketing-guidelines`
- Solana brand guidance:
  `https://solana.com/branding`
- Live Seeker visual reference:
  `https://solanamobile.com/seeker`

## Requirements That Affect Assets

- Submission requires a release-ready APK, prepared metadata, screenshots, and
  icon assets before review.
- Publisher Portal submission uploads app assets, including APK, icon,
  description, and preview images or videos, to the selected storage provider.
- Review feedback goes to the publisher email and the current review window is
  documented as 3-5 business days.
- Co-marketing should focus on decentralized apps and exclusive programs or
  activations for the Solana Mobile community. Non-product economics should not
  dominate launch copy.
- Solana marks need clearspace and must not be shadowed, outlined, stretched,
  used as an image frame, placed on low-contrast colors, or repurposed as
  another product logo.

## Current State

- The existing mobile icon was a pale target-grid placeholder. It was legible
  as a generic target but did not read as a production camera-native hunt app
  at store size.
- The mobile palette already aligns with the live Seeker page: near-black
  surfaces, off-white text, muted blue-gray support text, and cyan/ice-blue
  accents.
- The app already had a primitive camera shutter/iris animation on the splash
  screen. The production identity should promote that primitive into the shared
  app/store/site mark instead of leaving it isolated on one screen.
- Existing deck wordmarks use the right color family but rely on a text-only
  hackathon-era mark. Store assets need a standalone mark that works at icon
  size.

## Direction

Seek should own a camera shutter iris mark: a circular lens instrument with
six curved aperture blades, a central iris opening, and no decorative target
brackets or off-palette signal accents.
It communicates camera capture first, then real-world search and on-chain
settlement. It does not copy the Solana parallelogram mark or use Solana/Solana
Mobile marks as decoration.

The launch palette is:

- `#010101` ink black, primary background.
- `#101618` carbon, elevated surfaces.
- `#10282c` deep teal, depth and large support areas.
- `#61afbd` seeker cyan, primary action and mark stroke.
- `#95d2e6` ice blue, secondary highlight.
- `#cfe6e4` frost, high-value reward highlight.
- `#99b3be` mist, support text.

Use the cyan/frost system for the main identity. Do not use yellow/gold in the
core logo; it does not appear in the extracted Seeker identity reference and
it pulls the product away from the Seeker-native system.

## Asset Decisions

- App icon: no text. Use only the camera shutter iris mark so it remains
  legible after Android adaptive icon masking.
- Banner: use the wordmark, concise product language, and product-like phone UI
  geometry. Avoid a token-price or bonus-pool-first message.
- Current banner source has a screenshot-1 pass with the app home screen as a
  smaller secondary proof panel. The app UI should support the Seek lockup and
  tagline, not dominate or collide with them. Treat it as pending visual
  approval before submission.
- Feature graphic: optional, square editorial version of the same system for
  potential store featuring.
- Screenshots: must be real app captures from a Seeker/release build. Do not
  use mock screenshots for final submission.

## QA Checklist

- Icon remains recognizable at 48 px.
- Banner text remains readable at 600 px width.
- Iris separator curves are generated from one repeated path, rotated around
  one center, and clipped within the inner lens circle before the opening is
  drawn.
- No Solana or Solana Mobile logos are altered or embedded in the Seek logo.
- Store assets use product/experience cues, not pure abstract gradients.
- `node check-assets.mjs` is a dimension/shape guard. Passing with generated
  draft screenshots does not make those screenshots final for submission.
