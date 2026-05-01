# dApp Store publishing (Seek)

Everything needed to mint Publisher + App + Release NFTs and submit Seek
to the Solana dApp Store.

Verified against Solana Mobile docs on 2026-05-01. The current flow is
Publisher Portal first, then the CLI for release publishing.

## One-time setup

```bash
# Install CLI
npm install -g @solana-mobile/dapp-store-cli

# Create a dedicated publisher keypair (NEVER reuse your program Ledger keys)
solana-keygen new --outfile ./publisher.json
solana-keygen pubkey ./publisher.json  # paste into config.yaml `publisher.address`

# Fund it
solana transfer <publisher_pubkey> 0.5 --url mainnet-beta
```

Back up `publisher.json` + the seed phrase in 1Password. Losing this key
means losing control of the app listing.

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
npx dapp-store create publisher -k ./publisher.json
npx dapp-store create app -k ./publisher.json
npx dapp-store create release -k ./publisher.json

# Submit the NFT-backed release for review.
npx dapp-store publish submit \
  -k ./publisher.json \
  --requestor-is-authorized \
  --complies-with-solana-dapp-store-policies

# Current portal-backed update flow once the app exists in Publisher Portal.
dapp-store \
  --apk-file ../mobile/android/app/build/outputs/apk/release/app-release.apk \
  --keypair ./publisher.json \
  --whats-new "Initial mainnet launch."
```

## What needs filling in before first `create release`

1. `config.yaml` -> `publisher.address` (replace `PLACEHOLDER_PUBLISHER_PUBKEY`).
2. Build a release-signed APK per `mobile/android/SIGNING.md`. Default
   path in config is `../mobile/android/app/build/outputs/apk/release/app-release.apk`.
3. Put `icon.png` (512x512) and `banner.png` (1200x600) in
   `dapp-store-publishing/assets/`.
4. Screenshots: add at least 4 real app screenshots/videos in
   `dapp-store-publishing/assets/screenshots/en-US/`. Images must be at
   least 1080x1080 and share orientation + aspect ratio.
5. Optional: `feature-graphic.png` (1200x1200) for Editor's Choice consideration.
6. Run `node check-assets.mjs` from this directory before upload.

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
