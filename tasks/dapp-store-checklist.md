# Solana dApp Store Submission Checklist

Source: docs.solanamobile.com/dapp-store (verified 2026-05-05).

## Pre-submission requirements

### Required before running CLI

- [x] Release-signed APK (NEW keystore, not Play Store signing key)
- [x] Publisher Portal account/app created and approved to publish
- [x] Publisher wallet generated and funded (`0.4 SOL` at
  `Dzbqbjh8qowVK7x89vj1vo1ApUz7LNRqmR39yYXehenR`)
- [x] `DAPP_STORE_API_KEY` generated in Publisher Portal and stored outside git/chat
- [x] Program + token on Solana mainnet
- [x] Backend live at HTTPS production URL
  (`https://api.seek.mythx.art/api/health`)
- [x] Privacy policy URL (`https://seek.mythx.art/privacy`)
- [x] Terms of Service URL (`https://seek.mythx.art/terms`)
- [x] Developer contact email (`jeff@projectname.date`)
- [x] Release APK emulator smoke: launch, age gate, home screen, live stats,
  and no fatal app crash on `SeekDryRun_API35`
- [x] Post-upgrade Solana Mobile test-app smoke before v1.0.4 submission:
  MWA signing, funded 500 SKR hunt flow, camera/location capture, finalizer
  settlement, balance refresh, and Try Again navigation.
- [ ] Official store-build smoke on Seeker after v1.0.4 acceptance:
  MWA connect/signing, SGT status, camera/location capture, funded-wallet hunt
  flow from the store-delivered build.

### Required assets

- [x] App icon: `dapp-store-publishing/assets/icon.png`, 512x512 PNG
- [x] Banner graphic: `dapp-store-publishing/assets/banner.png`, 1200x600 PNG/JPG
- [x] Screenshots/videos: at least 4 in `dapp-store-publishing/assets/screenshots/en-US/`
- [x] Screenshot images are at least 1080x1080, same orientation, same aspect ratio
- [x] Optional feature graphic: `dapp-store-publishing/assets/feature-graphic.png`, 1200x1200
- [x] Run `cd dapp-store-publishing && node check-assets.mjs`
- [x] Short description/subtitle filled in Publisher Portal
- [x] Long description filled in Publisher Portal
- [x] Category selected in Publisher Portal
- [x] Age rating filled in Publisher Portal
- [x] Localization — English required

## Submission status

- [x] Portal-backed release submitted to review on 2026-05-06.
- Release mint: `2xwDFP9Vz1Xf5rDbGBpaLQkvzYYqgx2RsBdFrvWKtzHm`
- Collection mint: `4PdmCnEsoUCYMgDAw6X8KFjX7nJHKoVAke8zaAYyjpr1`
- Ticket ID: `310370751180`
- Publisher wallet balance after v1.0.4 submission: `0.07655074 SOL`
- 2026-05-15: Solana Mobile support reported an unrecoverable backend ingest
  error on their side and requested another submission. Same-APK resubmit with
  idempotency key `seek-resubmit-1.0.0-a420b658897d4631-20260515` reached
  ingestion session `8e1ac82b-b383-4771-8d49-cabb342bd61f` but failed with
  `A release with version code 1 already exists for this app`.
- [x] VersionCode bump approved by Solana Mobile support; v1.0.1 /
  versionCode `2` submitted to review on 2026-05-15 with idempotency key
  `seek-resubmit-1.0.1-v2-20260515`.
- Active release mint:
  `ATChUKmCC4zzqj9g54etDd7bW5uLFtLsxj5Dib2kqzRe`
- Active collection mint:
  `4PdmCnEsoUCYMgDAw6X8KFjX7nJHKoVAke8zaAYyjpr1`
- Active ticket ID: `311418671831`
- v1.0.1 APK SHA-256:
  `cdfb339816ae82405ffff8dda181032b88c021c27983416eb69d6bbc65d9707e`
- Portal ingestion session: `da680a7c-f986-4df7-bced-e6af6c269d6d`
- [x] v1.0.2 / versionCode `3` submitted to review on 2026-05-17 with
  idempotency key `seek-update-1.0.2-v3-20260517`.
- v1.0.2 release mint:
  `2jKWGs79qJC2j8LTRfwER6fn4Taz35hymzTWMZvyTBXS`
- v1.0.2 collection mint:
  `4PdmCnEsoUCYMgDAw6X8KFjX7nJHKoVAke8zaAYyjpr1`
- v1.0.2 ticket ID: `311747315429`
- v1.0.2 APK SHA-256:
  `eb3fc8b3559eea2ed0e1650b27ad9aaee82ac3cfb08cecf8de60bb131274cefd`
- v1.0.2 portal ingestion session:
  `ed604b1b-6b64-4395-9c1c-f3a9427f7ad8`
- v1.0.2 release ID:
  `b584d43c-76f2-4c22-a6f6-a9b6a5ec988d`
- v1.0.2 publication session:
  `13125fd4-2da1-4618-933e-588ea6daf137`
- 2026-05-17: user reported Solana Mobile accepted v1.0.2 and updated the app
  listing.
- [x] v1.0.3 / versionCode `4` submitted to review on 2026-05-18 with
  idempotency key `seek-update-1.0.3-v4-20260518`.
- v1.0.3 release mint:
  `UPyAUVgG29eKicQNTXEDfw5cYw83GnxZbTttATrjv4g`
- v1.0.3 collection mint:
  `4PdmCnEsoUCYMgDAw6X8KFjX7nJHKoVAke8zaAYyjpr1`
- v1.0.3 ticket ID: `311926974167`
- v1.0.3 APK SHA-256:
  `83d5c49b6b4d010b1d604c65efc6d7221732f8d44e4e444b871d6e7412471a43`
- v1.0.3 portal ingestion session:
  `bf81b531-e1fb-4fa2-b69e-727cfbb50bf4`
- v1.0.3 release ID:
  `96332cdd-cf73-4074-b0b1-1cdcd915e7c1`
- v1.0.3 publication session:
  `6a60d162-3db2-4d3a-90b4-c4fdacfe6c46`
- [x] v1.0.4 / versionCode `5` submitted to review on 2026-05-19 with
  idempotency key `seek-update-1.0.4-v5-20260519`.
- v1.0.4 release mint:
  `DvXz61SCghoPMwD3jED8qDj3CBXtXRXoLXiRVku7zMWg`
- v1.0.4 collection mint:
  `4PdmCnEsoUCYMgDAw6X8KFjX7nJHKoVAke8zaAYyjpr1`
- v1.0.4 ticket ID: `312122131169`
- v1.0.4 APK SHA-256:
  `5ed166ca0d7da0f3cec2e30de6d94ccab1fcbeb7457e210cb66384cd473b842b`
- v1.0.4 portal ingestion session:
  `4322b65e-8b0c-4441-bc12-ef08d84f8ed1`
- v1.0.4 release ID:
  `5b2e62d8-38d4-4365-b97e-b1b7c3ba0847`
- v1.0.4 publication session:
  `e5ea4d2e-fe43-491e-8a8a-0be876c7ac15`
- v1.0.4 release transaction:
  `5MCL4spjg1u43cjLKNAubeWAxj6KovHXijFUvLh1ssr584zaY5DGxdSGfe2akmr2ZaVZSt6JvBU9J9gSECvsACMF`
- v1.0.4 collection verification transaction:
  `3fLoBEGmg2rsJD6R99kVZZuH9nuW94ZeF71qTGUr1pDFEakpzacCL6doTDPt81LAS5TcTmtsk8r7qstWJPuUhmiX`
- v1.0.4 attestation request ID:
  `17985067346990183540214621176997`
- 2026-05-17: sideloaded/debug package `app.seek.mobile` v1.0.3 / versionCode
  `4` was uninstalled from the Seeker so official store tests use the
  store-delivered build.
- 2026-05-19: sideloaded/test package `app.seek.mobile` v1.0.4 / versionCode
  `5` was uninstalled from the connected Seeker after the v1.0.4 Publisher
  upload. Official post-acceptance testing should use the store-delivered
  build.

### Copy to prepare

- **Short description (≤80):** "Real-world scavenger hunts on Seeker with on-chain SKR rewards."
- **Long description:** draft from deck + README — highlight commit-reveal, AI validation, MWA integration.
- **What's new (v1.0.2 submitted):**
  "Fixes Seeker camera capture, passive SGT verification, AI validation reliability, and mission settlement flow."
- **What's new (v1.0.4 submitted):**
  "Updates SKR hunt tiers and refreshes the mission pool for more globally available targets."
- **v1.0.4 APK SHA-256:**
  `5ed166ca0d7da0f3cec2e30de6d94ccab1fcbeb7457e210cb66384cd473b842b`
  Do not mention payout math or `2x` total return in the store changelog.

## Legacy/config.yaml CLI flow

```bash
npm install -g @solana-mobile/dapp-store-cli
# or use npx
cd <project>
npx dapp-store init
# Edit config.yaml with metadata pointing to release APK, icon, screenshots

# One-time: mint publisher NFT
npx dapp-store create publisher -k ../.secrets/dapp-store/publisher.json

# Per app: mint app NFT
npx dapp-store create app -k ../.secrets/dapp-store/publisher.json

# Per release: mint release NFT + upload to Arweave
npx dapp-store create release -k ../.secrets/dapp-store/publisher.json

# Submit for review
npx dapp-store publish submit \
  -k ../.secrets/dapp-store/publisher.json \
  --requestor-is-authorized \
  --complies-with-solana-dapp-store-policies
```

## Current Publisher Portal CLI flow (May 2026)

After the app exists in Publisher Portal and the App NFT is minted:

```bash
export DAPP_STORE_API_KEY=<from Publisher Portal settings>
cd dapp-store-publishing
dapp-store \
  --apk-file ../mobile/android/app/build/outputs/apk/release/app-release.apk \
  --keypair ../.secrets/dapp-store/publisher.json \
  --whats-new "Adds secure bounty sessions and strengthens Seeker Genesis Token verification for paid hunts."
```

Do not paste `DAPP_STORE_API_KEY` in chat. Store it in a local ignored env file
or export it in the terminal running the CLI. Before upload, show the exact
`--whats-new` text to the user and get approval.

2026-05-06 submission used `--api-key-stdin`. The local RTF file is
`/Users/hammer/Desktop/Claude/Solanamobile api.rtf`; it has a label on the
first non-empty line and the actual API key on the second non-empty line.

## Likely review scrutiny areas

1. **APK signing validity** — debug-signed = instant reject.
2. **Age gate for economic apps** — our app has an AgeGateScreen, good. Must be real (can't skip).
3. **Permissions match manifest** — no unused perms.
4. **Backend liveness** — reviewers will install and try to connect. If backend is down, reject.
5. **Crash on launch** — R8 misconfig, missing keep rules, etc. Emulator
   release smoke passes; test release APK on Seeker when hardware is available.
6. **Deep links** — must use registered scheme, not `exp+` dev scheme.
7. **Privacy policy content** — must cover wallet address collection, photo upload, AI validation, SKR balance reading.
8. **ToS for paid-entry skill contests** — disclaimers about skill basis, regional eligibility.
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

## Next update candidate

v1.0.5 / versionCode `6` is the session-proof client update candidate. Exact
`--whats-new` text to show the user before upload:

```text
Adds secure bounty sessions and strengthens Seeker Genesis Token verification for paid hunts.
```

**Keystore stewardship:** losing the release keystore = cannot ever update the app. Multi-party backup mandatory (1Password team vault + paper backup + offline storage).
