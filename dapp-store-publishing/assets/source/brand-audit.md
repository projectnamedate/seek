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

- The existing mobile icon is a pale target-grid placeholder. It is legible as
  a generic target but does not read as a production crypto hunt app at store
  size.
- The mobile palette already aligns with the live Seeker page: near-black
  surfaces, off-white text, muted blue-gray support text, and cyan/ice-blue
  accents.
- Existing deck wordmarks use the right color family but rely on a text-only
  hackathon-era mark. Store assets need a standalone mark that works at icon
  size.

## Direction

Seek should own a "reticle compass" mark: a circular hunt target, four precise
corner brackets, a compass diamond, and a small route path. It communicates
real-world search, photo capture, and on-chain destination without copying the
Solana parallelogram mark or using Solana/Solana Mobile marks as decoration.

The launch palette is:

- `#010101` ink black, primary background.
- `#101618` carbon, elevated surfaces.
- `#10282c` deep teal, depth and large support areas.
- `#61afbd` seeker cyan, primary action and mark stroke.
- `#95d2e6` ice blue, secondary highlight.
- `#cfe6e4` frost, high-value reward highlight.
- `#99b3be` mist, support text.
- `#d4a017` signal gold, small prize/path accent only.

Use the cyan/frost system for the main identity and gold only as a 5-10 percent
accent for stake or reward cues. This avoids a one-note blue palette while
keeping the work closer to Seeker than generic Solana green/purple.

## Asset Decisions

- App icon: no text. Use only the reticle compass mark so it remains legible
  after Android adaptive icon masking.
- Banner: use the wordmark, concise product language, and product-like phone UI
  geometry. Avoid a token-price or jackpot-first message.
- Feature graphic: optional, square editorial version of the same system for
  potential store featuring.
- Screenshots: must be real app captures from a Seeker/release build. Do not
  use mock screenshots for final submission.

## QA Checklist

- Icon remains recognizable at 48 px.
- Banner text remains readable at 600 px width.
- No Solana or Solana Mobile logos are altered or embedded in the Seek logo.
- Store assets use product/experience cues, not pure abstract gradients.
- `node check-assets.mjs` passes for icon/banner and should fail only on real
  screenshots until captures are added.
