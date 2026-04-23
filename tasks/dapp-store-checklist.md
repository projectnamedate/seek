# Solana dApp Store Submission Checklist

Source: docs.solanamobile.com/dapp-publishing (April 2026).

## Pre-submission requirements

### Required before running CLI

- [ ] Release-signed APK (NEW keystore, not Play Store signing key)
- [ ] Publisher wallet funded with ~0.5 SOL
- [ ] Program + token on Solana mainnet (dApp Store reviewers will likely reject devnet-only listings for apps with on-chain economics)
- [ ] Backend live at HTTPS production URL
- [ ] Privacy policy URL (public web page, not just in-app)
- [ ] Terms of Service URL (public web page)
- [ ] Developer contact email

### Required assets

- [ ] App icon at 512×512 (high quality PNG, not alpha blend)
- [ ] 4-6 app screenshots at Seeker aspect ratio (~1080×2400)
- [ ] Feature graphic (landscape, typically 1200×630)
- [ ] Short description (<80 chars) — one-liner tagline
- [ ] Long description (<4000 chars) — pulled from README/deck
- [ ] Category: Games (Casino/Gambling is a separate flag to consider)
- [ ] Age rating — recommend 18+ given economic staking
- [ ] Localization — English required, optional others

### Copy to prepare

- **Short description (≤80):** "Pokemon GO for crypto on your Seeker. Hunt real-world targets, win $SKR."
- **Long description:** draft from deck + README — highlight commit-reveal, AI validation, MWA integration.
- **What's new (per release):** short changelog.

## CLI Flow (April 2026 reference)

```bash
npm install -g @solana-mobile/dapp-store-cli
# or use npx
cd <project>
npx dapp-store init
# Edit config.yaml with metadata pointing to release APK, icon, screenshots

# One-time: mint publisher NFT
npx dapp-store create publisher -k ~/seek-publisher.json

# Per app: mint app NFT
npx dapp-store create app -k ~/seek-publisher.json

# Per release: mint release NFT + upload to Arweave
npx dapp-store create release -k ~/seek-publisher.json

# Submit for review
npx dapp-store publish submit \
  -k ~/seek-publisher.json \
  --requestor-is-authorized \
  --complies-with-solana-dapp-store-policies
```

## Likely review scrutiny areas

1. **APK signing validity** — debug-signed = instant reject.
2. **Age gate for economic apps** — our app has an AgeGateScreen, good. Must be real (can't skip).
3. **Permissions match manifest** — no unused perms.
4. **Backend liveness** — reviewers will install and try to connect. If backend is down, reject.
5. **Crash on launch** — R8 misconfig, missing keep rules, etc. Test release APK on Seeker before submit.
6. **Deep links** — must use registered scheme, not `exp+` dev scheme.
7. **Privacy policy content** — must cover wallet address collection, photo upload, AI validation, SKR balance reading.
8. **ToS for gambling/stakes** — disclaimers about skill vs chance, regional eligibility.
9. **Mainnet requirement** — dApps with financial value on devnet-only are typically rejected.

## Rejection iteration plan

- Average: 1-2 review cycles before approval for new apps.
- Feedback arrives via email to publisher wallet's registered address.
- Fix → re-build APK → `dapp-store create release` (new release NFT) → resubmit.

## Estimated costs

- Publisher NFT: ~0.03 SOL (one time)
- App NFT: ~0.02 SOL (one time)
- Release NFT + Arweave uploads: ~0.1–0.2 SOL per release (APK bundle size dependent)
- Keep 0.5 SOL minimum in publisher wallet.

## Post-launch update flow

Each app update:
1. Bump `versionCode` in `build.gradle` (must be monotonic).
2. Update `versionName` in `build.gradle` and `config.yaml`.
3. Build + sign release APK.
4. `npx dapp-store create release` → new release NFT.
5. `npx dapp-store publish submit`.
6. Wait 2-5 days for review.

**Keystore stewardship:** losing the release keystore = cannot ever update the app. Multi-party backup mandatory (1Password team vault + paper backup + offline storage).
