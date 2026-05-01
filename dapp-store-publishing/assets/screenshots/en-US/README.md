# Screenshot Capture Plan

Use real release-build captures from a Seeker or final Android device. Do not
submit mockups.

Capture all screenshots with the same orientation and aspect ratio. PNG is
preferred. Each image must be at least 1080x1080.

Required slots:

1. `01-home.png` - connected wallet home with tier cards visible.
2. `02-connect-wallet.png` - wallet connection or MWA approval entry point.
3. `03-start-hunt.png` - tier selected and start action visible.
4. `04-mission.png` - revealed mission with timer.
5. `05-validation.png` - validation progress or camera proof state.
6. `06-results.png` - win/loss result screen.

Before upload:

```bash
cd dapp-store-publishing
node check-assets.mjs
```
