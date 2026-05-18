# dApp Store publishing (Seek)

Everything needed to mint Publisher + App + Release NFTs and submit Seek
to the Solana dApp Store.

Verified against Solana Mobile docs on 2026-05-05. The current flow is
Publisher Portal first, then the CLI for release publishing.

## One-time setup

```bash
# Install CLI
npm install -g @solana-mobile/dapp-store-cli

# Dedicated publisher keypair already exists at:
# ../.secrets/dapp-store/publisher.json
solana-keygen pubkey ../.secrets/dapp-store/publisher.json

# Fund it
solana transfer <publisher_pubkey> 0.5 --url mainnet-beta
```

Back up `.secrets/dapp-store/publisher.json` + the seed phrase in 1Password. Losing this key
means losing control of the app listing.

## Current test-device note

User now has a Seeker device. The sideloaded `app.seek.mobile` v1.0.3 /
versionCode `4` hardware-test build was uninstalled after v1.0.2 was accepted,
so the next validation should install/open the official Solana Mobile store
build without USB and run wallet, passive SGT, camera/location, and
finalization smoke.

## Publisher Portal setup

1. Sign up at `https://publish.solanamobile.com`.
2. Complete publisher profile + KYC/KYB.
3. Connect the publisher wallet.
4. Set ArDrive or the selected storage provider.
5. Add the Seek app metadata, screenshots, icon, and banner.
6. Generate a Publisher Portal API key and keep it out of git/chat:

```bash
export DAPP_STORE_API_KEY=<publisher_portal_api_key>
```

## Mint/publish with CLI

```bash
cd dapp-store-publishing

# Legacy/config.yaml NFT flow still uses these commands when the app is not
# yet fully portal-created.
npx dapp-store create publisher -k ../.secrets/dapp-store/publisher.json
npx dapp-store create app -k ../.secrets/dapp-store/publisher.json
npx dapp-store create release -k ../.secrets/dapp-store/publisher.json

# Submit the NFT-backed release for review.
npx dapp-store publish submit \
  -k ../.secrets/dapp-store/publisher.json \
  --requestor-is-authorized \
  --complies-with-solana-dapp-store-policies

# Current portal-backed update flow once the app exists in Publisher Portal.
# Before upload, show the exact --whats-new text to the user and get approval.
# Do not mention payout math or 2x total return in the store changelog.
dapp-store \
  --apk-file ../mobile/android/app/build/outputs/apk/release/app-release.apk \
  --keypair ../.secrets/dapp-store/publisher.json \
  --whats-new "Fixes Seeker camera capture, passive SGT verification, AI validation reliability, and mission settlement flow."
```

## Current live update

v1.0.2 / versionCode `3` was submitted to Solana Mobile dApp Store review on
2026-05-17 with the portal-backed CLI and `--api-key-stdin`. User reported the
update was accepted by Solana Mobile later the same day.

- Release mint: `2jKWGs79qJC2j8LTRfwER6fn4Taz35hymzTWMZvyTBXS`
- Collection mint: `4PdmCnEsoUCYMgDAw6X8KFjX7nJHKoVAke8zaAYyjpr1`
- Ticket ID: `311747315429`
- APK SHA-256:
  `eb3fc8b3559eea2ed0e1650b27ad9aaee82ac3cfb08cecf8de60bb131274cefd`
- Ingestion session: `ed604b1b-6b64-4395-9c1c-f3a9427f7ad8`
- Release ID: `b584d43c-76f2-4c22-a6f6-a9b6a5ec988d`
- Publication session: `13125fd4-2da1-4618-933e-588ea6daf137`
- Idempotency key: `seek-update-1.0.2-v3-20260517`
- Release transaction: `4MxR9kfd5GE2xH7r82tNMyK2cA4nPqvEy1KcCKSYEtcZzrnGXFXGbFAeKqB3HcAzbXQmiMVuaE99XEEKiMjPXQzQ`
- Collection verification transaction: `47GgVWk4TftmyLmbZ37KoD2VDfBZ6tkfNSzfA9ALhANKutT8RPEeyxA13nBqKw2ciWTDpwmS6FyAYhMJcSj7aenR`
- Attestation request ID: `45706633110878826798472252984655`
- Publisher wallet balance after submission: `0.11787386 SOL`

## Last submitted changelog

Approved by the user before upload. Do not mention payout math, `2x` total
return, or economics in future store changelogs.

```text
Fixes Seeker camera capture, passive SGT verification, AI validation reliability, and mission settlement flow.
```

## Next emergency update changelog

Draft for v1.0.3 / versionCode `4`:

```text
Adds camera and location permission preflight before paid hunts.
```

Current local candidate APK SHA-256:
`83d5c49b6b4d010b1d604c65efc6d7221732f8d44e4e444b871d6e7412471a43`

Previous v1.0.1 / versionCode `2` submission: submitted 2026-05-15 under
ticket `311418671831`, release mint
`ATChUKmCC4zzqj9g54etDd7bW5uLFtLsxj5Dib2kqzRe`, APK SHA-256
`cdfb339816ae82405ffff8dda181032b88c021c27983416eb69d6bbc65d9707e`.

Original v1.0.0 submission history: submitted 2026-05-06 under ticket
`310370751180`, release mint
`2xwDFP9Vz1Xf5rDbGBpaLQkvzYYqgx2RsBdFrvWKtzHm`, APK SHA-256
`a420b658897d46315bb3d97f01d4c546562b2a1a627042f6a8554c740a46b8f8`. On
2026-05-15, Solana Mobile support reported an unrecoverable backend ingest
error on their side and requested another submission. Same-APK resubmit with
idempotency key `seek-resubmit-1.0.0-a420b658897d4631-20260515` reached
ingestion session `8e1ac82b-b383-4771-8d49-cabb342bd61f` but failed with
`A release with version code 1 already exists for this app`. Solana Mobile
confirmed a versionCode bump was acceptable, so v1.0.1 / versionCode `2` was
rebuilt and submitted successfully.

Note: the local RTF API-key file is
`/Users/hammer/Desktop/Claude/Solanamobile api.rtf`. It has a label on the
first non-empty line and the actual key on the second non-empty line. Never
paste it in chat or commit it to the repo.

## Submission requirements checklist

1. `config.yaml` -> `publisher.address` is filled with the generated publisher
   wallet `Dzbqbjh8qowVK7x89vj1vo1ApUz7LNRqmR39yYXehenR`.
2. Build a release-signed APK per `mobile/android/SIGNING.md`. Default
   path in config is `../mobile/android/app/build/outputs/apk/release/app-release.apk`.
3. Put `icon.png` (512x512) and `banner.png` (1200x600) in
   `dapp-store-publishing/assets/`.
4. Screenshots: add at least 4 real app screenshots/videos in
   `dapp-store-publishing/assets/screenshots/en-US/`. Images must be at
   least 1080x1080 and share orientation + aspect ratio.
5. Optional: `feature-graphic.png` (1200x1200) for Editor's Choice consideration.
6. Run `node check-assets.mjs` from this directory before upload.
7. Complete Publisher Portal business/profile/API-key setup manually.

## Version bumps (per release)

1. Bump `versionCode` + `versionName` in `mobile/android/app/build.gradle`.
2. Rebuild release APK.
3. Update `release.catalog.en-US.new_in_version` in `config.yaml`.
4. `npx dapp-store create release` -> new Release NFT.
5. `npx dapp-store publish submit`.

## Costs to budget

- Publisher NFT: ~0.03 SOL  *(one-time)*
- App NFT: ~0.02 SOL  *(one-time)*
- Release NFT + Arweave asset upload: ~0.1-0.2 SOL per release

Keep the publisher wallet funded with at least 0.5 SOL so ArDrive/upload
variance does not block submission.

## Rejection iteration

Feedback comes via email to the address in `publisher.email`. Common
reasons: debug-signed APK, over-permissioned manifest, missing privacy
URL, devnet contracts, broken on-device test.

See `../tasks/dapp-store-checklist.md` for the full submission flow
and `../tasks/dapp-store-listing-copy.md` for the copy used in
`config.yaml`.
