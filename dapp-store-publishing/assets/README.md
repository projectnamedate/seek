# Seek dApp Store assets

Generated source files:

- `source/brand-audit.md` - brand/design audit against Solana Mobile and
  Solana guidance.
- `source/visual-philosophy.md` - visual direction used for launch assets.
- `source/logo/seek-mark.svg` - production mark.
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
- `screenshots/en-US/02-connect-wallet.png`
- `screenshots/en-US/03-start-hunt.png`
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

Logo rule: Seek needs its own logo system. Do not distort, recolor, frame,
shadow, or otherwise repurpose official Solana/Solana Mobile marks as the Seek
logo.

Current status:

- Done: brand audit, logo system source files, app/store icon, banner, optional
  feature graphic, mobile Expo icon/adaptive icon/splash/favicon refresh.
- Pending: real release-build screenshots or videos captured on device. Do not
  use mock screenshots for final submission.

Validate locally:

```bash
cd dapp-store-publishing
node check-assets.mjs
```
