# dApp Store publishing (Seek)

Everything needed to mint Publisher + App + Release NFTs and submit Seek
to the Solana dApp Store.

## One-time setup

```bash
# Install CLI
npm install -g @solana-mobile/dapp-store-cli

# Create a dedicated publisher keypair (NEVER reuse your Ledger keys)
solana-keygen new --outfile ./publisher.json
solana-keygen pubkey ./publisher.json  # → paste into config.yaml `publisher.address`

# Fund it
solana transfer <publisher_pubkey> 0.5 --url mainnet-beta   # needs ~0.5 SOL
```

Back up `publisher.json` + the seed phrase in 1Password. Losing this key
means losing control of the app listing.

## Mint the NFTs

```bash
cd dapp-store-publishing

# One-time per publisher (creates Publisher NFT ~0.03 SOL)
npx dapp-store create publisher -k ./publisher.json

# Once per app (creates App NFT ~0.02 SOL)
npx dapp-store create app -k ./publisher.json

# Once per release — do this every version bump
npx dapp-store create release -k ./publisher.json

# Submit for review (2–5 business days)
npx dapp-store publish submit \
  -k ./publisher.json \
  --requestor-is-authorized \
  --complies-with-solana-dapp-store-policies
```

## What needs filling in before first `create release`

1. `config.yaml` → `publisher.address` (replace `PLACEHOLDER_PUBLISHER_PUBKEY`).
2. Build a release-signed APK per `mobile/android/SIGNING.md`. Default
   path in config is `../mobile/android/app/build/outputs/apk/release/app-release.apk`.
3. Put `icon.png` (512×512) and `feature-graphic.png` (1200×630) in
   `dapp-store-publishing/assets/`.
4. Screenshots: add 5–6 PNGs at Seeker aspect ratio (1080×2400 typical)
   in `dapp-store-publishing/assets/screenshots/en-US/`.

## Version bumps (per release)

1. Bump `versionCode` + `versionName` in `mobile/android/app/build.gradle`.
2. Rebuild release APK.
3. Update `release.catalog.en-US.new_in_version` in `config.yaml`.
4. `npx dapp-store create release` → new Release NFT.
5. `npx dapp-store publish submit`.

## Costs to budget

- Publisher NFT: ~0.03 SOL  *(one-time)*
- App NFT: ~0.02 SOL  *(one-time)*
- Release NFT + Arweave asset upload: ~0.1–0.2 SOL per release

Keep the publisher wallet funded with ≥ 0.5 SOL.

## Rejection iteration

Feedback comes via email to the address in `publisher.email`. Common
reasons: debug-signed APK, over-permissioned manifest, missing privacy
URL, devnet contracts, broken on-device test.

See `../tasks/dapp-store-checklist.md` for the full submission flow
and `../tasks/dapp-store-listing-copy.md` for the copy used in
`config.yaml`.
