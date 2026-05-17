# Screenshot Capture Runbook

Use the closest available app build capture path. Do not submit generated SVG
comps, framed screenshots, or edited phone renders.

Capture all screenshots with the same device, orientation, and aspect ratio.
PNG is preferred. Each image must be at least 1080x1080.

## Capture Passes

1. Dry-run capture: use an Android or Seeker test device to review layout,
   text fit, copy, and obvious dApp Store rejection risks. These images are not
   submission finals.
2. Staged submission capture: when dApp Store access blocks organic Seeker
   screenshots, use a disposable capture fork that preserves the real app
   layout and stages only wallet-gated data. These PNGs replace draft comps in
   this folder.
3. Post-review recapture: after distribution or Seeker test access exists, use
   the exact signed APK intended for release on one final Android or Seeker
   device.

## Submission Capture Status

2026-05-04 submission screenshots in this folder were captured from a
disposable devnet capture fork because dApp Store submission requires
screenshots before Seeker distribution is available. The capture build stages
wallet-gated states with `hammer.skr`, a burner devnet wallet, and clean SKR
balances. Do not ship the capture-mode code; only these PNGs belong in the
submission package.

The dApp Store submission config uses photos 1, 4, 5, and 6:
`01-home.png`, `04-mission.png`, `05-validation.png`, and `06-results.png`.
Keep all six PNGs in place for review history.

2026-05-06: `01-home.png` was corrected for the final portal upload so the
visible tiers read Easy 1000 SKR, Medium 3000 SKR, and Hard 5000 SKR. The
layout and staged `hammer.skr` wallet state were otherwise preserved.

## Dry Run Status

2026-05-04 dry-run captures from the current release build are in:

```text
dapp-store-publishing/assets/review/screenshots-dry-run-20260504/
```

The emulator pass reached the first-run age gate and disconnected home.

Required slots:

1. `01-home.png` - connected wallet home with tier cards visible.
2. `02-connect-wallet.png` - wallet connection or MWA approval entry point.
3. `03-start-hunt.png` - tier selected and start action visible.
4. `04-mission.png` - revealed mission with timer.
5. `05-validation.png` - validation progress or camera proof state.
6. `06-results.png` - win/loss result screen.

## Safety Rules

- Use a burner screenshot wallet only.
- Do not reveal seed phrases, private keys, recovery QR codes, or personal
  wallet balances.
- Do not redesign the app for screenshots. Only fix unreadable states,
  stale copy, broken layout, or submission-risk issues.
- After distribution or Seeker test access exists, recapture `04-mission`,
  `05-validation`, and `06-results` from one controlled hunt.

## Commands

Check device resolution:

```bash
adb shell wm size
```

Capture each slot:

```bash
bash dapp-store-publishing/scripts/capture-screenshot.sh 01-home
bash dapp-store-publishing/scripts/capture-screenshot.sh 02-connect-wallet
bash dapp-store-publishing/scripts/capture-screenshot.sh 03-start-hunt
bash dapp-store-publishing/scripts/capture-screenshot.sh 04-mission
bash dapp-store-publishing/scripts/capture-screenshot.sh 05-validation
bash dapp-store-publishing/scripts/capture-screenshot.sh 06-results
```

If multiple Android devices are connected, pass the adb serial:

```bash
bash dapp-store-publishing/scripts/capture-screenshot.sh 01-home R5CT123ABC
```

For dry-run captures, keep output outside the final upload folder:

```bash
SCREENSHOT_OUT_DIR=dapp-store-publishing/assets/review/screenshots-dry-run-20260504 \
  bash dapp-store-publishing/scripts/capture-screenshot.sh 01-home
```

Before upload:

```bash
cd dapp-store-publishing
node check-assets.mjs
```
