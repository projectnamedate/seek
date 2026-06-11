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

User now has a Seeker device. The v1.0.4 test-app smoke passed before
Publisher upload, and v1.0.4 / versionCode `5` is live per the 2026-06-09
Publisher Portal screenshot. For the v1.0.5 session-proof update, install the
release-signed APK on the Seeker before upload and smoke: wallet connect, SGT
status, one off-chain session signature, one on-chain `accept_bounty_v2`
approval, camera/location capture, no wallet prompt during photo submit,
funded hunt resolution, balance refresh, Try Again navigation, and finalization.

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
  --whats-new "Adds secure bounty sessions and strengthens Seeker Genesis Token verification for paid hunts."
```

Candidate v1.0.5 changelog to show the user before upload:

```text
Adds secure bounty sessions and strengthens Seeker Genesis Token verification for paid hunts.
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
Adds secure bounty sessions and strengthens Seeker Genesis Token verification for paid hunts.
```

## Current submitted update

v1.0.5 / versionCode `6` was submitted to Solana Mobile dApp Store review on
2026-06-11 with the portal-backed CLI and `--api-key-stdin`.

```text
Adds secure bounty sessions and strengthens Seeker Genesis Token verification for paid hunts.
```

- Release mint: `2oMPtiGumKGVsvyK2NBe2GXcoKDskgRoMsUUPCa9mb4L`
- Collection mint: `4PdmCnEsoUCYMgDAw6X8KFjX7nJHKoVAke8zaAYyjpr1`
- Ticket ID: `314741840579`
- APK SHA-256:
  `7a867ac83852d44909b319d346279d73afcb65cd50f4d681ef808deaff8e4c72`
- Ingestion session: `393e6329-4a02-43a9-9471-691684350fc9`
- Release ID: `3ec1276d-b3a3-48cd-a911-85d4dcb7fb5b`
- Publication session: `e1424d63-6a78-4cca-b178-8952c58cb488`
- Idempotency key: `seek-update-1.0.5-v6-20260611`
- Release transaction:
  `2KUEjBDzmyGFzgxTXuraRyJXmmoEXcdqQmUEMpy5Fk6xzF73Nx6tSTwexoqf19NDPwyZAv9dZNffw74LunA9p5pX`
- Collection verification transaction:
  `5C6kYPWz7u7Zpuci5XVWSWFBymcRuBZxtAvnr3WZ99ikiCacada3JJiLjEDY6eEbNLJpwpGXiRLgqNhEaqaU12Ee`
- Attestation request ID: `32557393368506399883497423818849`
- Publisher wallet balance after submission: `0.05588918 SOL`

## Previous submitted update

v1.0.4 / versionCode `5` was submitted to Solana Mobile dApp Store review on
2026-05-19 with the portal-backed CLI and `--api-key-stdin`.

```text
Updates SKR hunt tiers and refreshes the mission pool for more globally available targets.
```

- Release mint: `DvXz61SCghoPMwD3jED8qDj3CBXtXRXoLXiRVku7zMWg`
- Collection mint: `4PdmCnEsoUCYMgDAw6X8KFjX7nJHKoVAke8zaAYyjpr1`
- Ticket ID: `312122131169`
- APK SHA-256:
  `5ed166ca0d7da0f3cec2e30de6d94ccab1fcbeb7457e210cb66384cd473b842b`
- Ingestion session: `4322b65e-8b0c-4441-bc12-ef08d84f8ed1`
- Release ID: `5b2e62d8-38d4-4365-b97e-b1b7c3ba0847`
- Publication session: `e5ea4d2e-fe43-491e-8a8a-0be876c7ac15`
- Idempotency key: `seek-update-1.0.4-v5-20260519`
- Release transaction:
  `5MCL4spjg1u43cjLKNAubeWAxj6KovHXijFUvLh1ssr584zaY5DGxdSGfe2akmr2ZaVZSt6JvBU9J9gSECvsACMF`
- Collection verification transaction:
  `3fLoBEGmg2rsJD6R99kVZZuH9nuW94ZeF71qTGUr1pDFEakpzacCL6doTDPt81LAS5TcTmtsk8r7qstWJPuUhmiX`
- Attestation request ID: `17985067346990183540214621176997`
- Publisher wallet balance after submission: `0.07655074 SOL`

## Earlier submitted update

v1.0.3 / versionCode `4` was submitted to Solana Mobile dApp Store review on
2026-05-18 with the portal-backed CLI and `--api-key-stdin`.

```text
Adds camera and location permission preflight before paid hunts.
```

- Release mint: `UPyAUVgG29eKicQNTXEDfw5cYw83GnxZbTttATrjv4g`
- Collection mint: `4PdmCnEsoUCYMgDAw6X8KFjX7nJHKoVAke8zaAYyjpr1`
- Ticket ID: `311926974167`
- APK SHA-256:
  `83d5c49b6b4d010b1d604c65efc6d7221732f8d44e4e444b871d6e7412471a43`
- Ingestion session: `bf81b531-e1fb-4fa2-b69e-727cfbb50bf4`
- Release ID: `96332cdd-cf73-4074-b0b1-1cdcd915e7c1`
- Publication session: `6a60d162-3db2-4d3a-90b4-c4fdacfe6c46`
- Idempotency key: `seek-update-1.0.3-v4-20260518`
- Release transaction: `5yK6poi6Y1X5NFrdVvSEFwcLVQEqxiMzfbSj5hat9dbebEuJsZQh5Zs7n19dBgXACqcZCLxmXVXG6BcDanaZvrVY`
- Collection verification transaction: `24252CaZRC7y2ESMLRS9iAaup5k3BqXmcgiH7iMbSUq8vcd8X7Sczr2Q2eTaWc3hYys9qXz3wBUzwiGS1GYhJu7D`
- Attestation request ID: `56610741437357918902244398451996`
- Publisher wallet balance after submission: `0.0972123 SOL`

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
