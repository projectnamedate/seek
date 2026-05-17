# Seek dApp Store assets

Draft source files:

- `source/brand-audit.md` - brand/design audit against Solana Mobile and
  Solana guidance.
- `source/visual-philosophy.md` - visual direction used for launch assets.
- `source/logo/seek-mark.svg` - draft mark pending user approval.
- `source/logo/seek-mark-mono.svg` - monochrome mark.
- `source/logo/seek-lockup-dark.svg` - dark lockup.
- `source/logo/seek-lockup-light.svg` - light lockup.
- `source/icon.svg` - source for app/store icon.
- `source/banner.svg` - source for dApp Store banner.
- `source/feature-graphic.svg` - source for optional feature graphic.

Required before first submission:

- Production Seek logo/mark source files and usage notes.
- `icon.png` - 512x512 PNG. Generated from `source/icon.svg`.
- `banner.png` - 1200x600 PNG or JPG. Generated from `source/banner.svg`.
- `screenshots/en-US/01-home.png`
- `screenshots/en-US/04-mission.png`
- `screenshots/en-US/05-validation.png`
- `screenshots/en-US/06-results.png`

Screenshots must be real app captures, at least 1080x1080, and all must use
the same orientation and aspect ratio. Use Seeker captures for final submit.

Optional:

- `feature-graphic.png` - 1200x1200, for Editor's Choice consideration.
  Generated from `source/feature-graphic.svg`.

Design audit sources:

- Solana Mobile app submission requirements: `https://docs.solanamobile.com/dapp-store/submit-new-app`
- Solana Mobile co-marketing guidance: `https://docs.solanamobile.com/marketing/comarketing-guidelines`
- Solana brand constraints and official colors/assets: `https://solana.com/branding/`

Logo rule: Seek needs its own camera shutter iris logo system. Do not distort,
recolor, frame, shadow, or otherwise repurpose official Solana/Solana Mobile
marks as the Seek logo.

Current status:

- Soft-locked: iris logomark, wordmark, store icon, dark/light lockups, and
  optional feature graphic. Do not churn these without a concrete submission or
  brand-fit reason.
- Banner note: `source/banner.svg` and
  `review/finals-approval/store/06-dapp-store-banner-1200x600.png` use
  screenshot 1 as the app visual. The lower-left decorative wave/dots and
  covered lower text have been removed for the Publisher Portal crop. The
  current banner is a full-bleed composition with the phone mock bleeding off
  the bottom edge so the generated PNG has no white or black footer band.
- Protected: preserve the in-app mobile design during screenshot review unless
  there is a clear dApp Store rejection risk, stale copy, broken state, or
  unreadable capture.
- Screenshots: six staged captures are in `screenshots/en-US/`, captured from
  the disposable devnet capture fork with `hammer.skr` and a burner devnet
  wallet. The dApp Store submission config uses only photos 1, 4, 5, and 6;
  keep all six files in place for review history.
- Submitted: Publisher Portal release review ticket `310370751180`.
- Do not use generated comps or phone renders as final submission captures.

Validate locally:

```bash
cd dapp-store-publishing
node check-assets.mjs
```
