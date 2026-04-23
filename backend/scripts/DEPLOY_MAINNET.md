# Seek Mainnet Deployment Runbook

Step-by-step to take Seek from the devnet hackathon state to a live mainnet
deployment with Ledger-backed cold authority + Railway-hosted backend.

Prereqs (user-side):
- Ledger hardware wallet with the Solana app installed
- ~5 SOL mainnet for program deploy + rent
- $SKR tokens for house vault (10M recommended starter ≈ $170k at $0.017)
- Release keystore generated per `mobile/android/SIGNING.md`
- Railway account + project provisioned
- Upstash Redis instance
- Sentry project DSN
- Domain (seek.app or chosen alt) DNS-ready to point to Railway

## 1. Build the mainnet contract binary

```bash
cd contracts
anchor build                # default features = mainnet
# Verify the resulting binary targets mainnet constants:
grep -A2 'SKR_MINT: Pubkey' programs/seek-protocol/src/lib.rs | head -5
# → should show SKRbvo6Gf…mainnet mint
```

The binary lives at `contracts/target/deploy/seek_protocol.so` plus the
program keypair at `contracts/target/deploy/seek_protocol-keypair.json`.

## 2. Prepare the Ledger

Install Solana app on the Ledger. Get your pubkey:

```bash
solana-keygen pubkey usb://ledger       # → COLD_AUTHORITY_PUBKEY
solana config set --keypair usb://ledger
```

Send ~5 SOL to that pubkey (mainnet).

## 3. Deploy the program

This is the big irreversible step. Program ID stays the same as devnet
(`DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v`) — Anchor uses the
existing `target/deploy/seek_protocol-keypair.json`. The deploy authority
is initially the Ledger.

```bash
# Confirm cluster
solana config set --url mainnet-beta
solana config set --keypair usb://ledger

# Deploy (~3-4 SOL for buffer + rent)
cd contracts
anchor deploy --provider.cluster mainnet --provider.wallet usb://ledger

# Publish IDL on-chain (so indexers/explorers can decode)
anchor idl init \
  --provider.cluster mainnet \
  --provider.wallet usb://ledger \
  --filepath target/idl/seek_protocol.json \
  DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v
```

## 4. Optionally publish a verified build

```bash
# One-time install
cargo install solana-verify

# Build + upload reproducible binary hash to on-chain attestation
solana-verify build --library-name seek_protocol
solana-verify upload \
  --url https://api.mainnet-beta.solana.com \
  --wallet usb://ledger \
  DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v
```

## 5. Generate + fund the HOT authority

The hot authority lives on the backend and signs only `reveal_mission` +
`propose_resolution` + `finalize_bounty` (the last is permissionless but
we use this key by default).

```bash
solana-keygen new --outfile ./seek-hot.json
solana-keygen pubkey ./seek-hot.json   # → HOT_AUTHORITY_PUBKEY

# Fund with 0.3 SOL for tx fees. Top up monthly via a cron.
solana transfer <HOT_AUTHORITY_PUBKEY> 0.3 --url mainnet-beta --keypair usb://ledger
```

## 6. Initialize protocol on mainnet

The existing `scripts/initialize-protocol.ts` handles the 3-step init
(`initialize` → `initialize_house_vault` → `initialize_singularity_vault`).
Run it with the Ledger as authority:

```bash
cd backend

# Set env (one-off run — can write to .env then `source` it, or export inline)
export SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
export SOLANA_NETWORK=mainnet-beta
export SKR_MINT=SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3
export SEEK_PROGRAM_ID=DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v
# IMPORTANT: initialize-protocol.ts expects an env keypair today — if you
# want to sign with the Ledger, you'll need to refactor it to take a
# signer. For a one-off init, it's acceptable to use an interim hot
# keypair, then immediately rotate cold authority to Ledger (see step 8).

npx ts-node scripts/initialize-protocol.ts
```

This creates:
- `GlobalState` PDA (owner = authority)
- `house_vault` PDA token account (SKR)
- `singularity_vault` PDA token account (SKR)
- `protocol_treasury` (pass a pre-created token account — see script)

## 7. Set hot authority on-chain

```bash
export AUTHORITY_PRIVATE_KEY=<cold keypair that ran init>
cd backend
npx ts-node scripts/admin.ts set-hot <HOT_AUTHORITY_PUBKEY>
```

## 8. Rotate cold authority to Ledger

Two-step. Run with the interim init keypair first to propose, then
with the Ledger to accept.

```bash
# As current cold authority
export AUTHORITY_PRIVATE_KEY=<interim init keypair base58>
npx ts-node scripts/admin.ts propose-transfer <LEDGER_PUBKEY>

# Switch AUTHORITY_PRIVATE_KEY to a Ledger-signed keypair
# (You'll need to wire Ledger signing into admin.ts — see follow-up)
# Or: generate a cold keypair here, fund it, use it as the cold signer
# on mainnet. The Ledger plan is a follow-up once admin.ts supports it.
npx ts-node scripts/admin.ts accept-transfer
```

*(Note: current admin.ts loads a base58 private key from env. Ledger
integration needs a refactor to use `solana-ledger-wallet` or similar.
For launch, an encrypted cold keypair on an airgapped machine is a
reasonable interim. Track in task #5.)*

## 9. Transfer program upgrade authority to Ledger

```bash
# Still with Ledger as current upgrade authority (step 3)
# Optional: set to a different Ledger account or leave as-is.
# To revoke (make program immutable — CAREFUL, no future upgrades):
# solana program set-upgrade-authority -k usb://ledger \
#   DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v --final

# Or transfer to a new upgrade authority:
# solana program set-upgrade-authority -k usb://ledger \
#   DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v \
#   --new-upgrade-authority <NEW_LEDGER_PUBKEY>
```

## 10. Fund house vault

```bash
# First, transfer your SKR holdings to the cold authority's ATA
spl-token transfer SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3 10000000 \
  <COLD_AUTHORITY_PUBKEY> --fund-recipient --url mainnet-beta

# Then fund the on-chain house vault via the fund_house instruction
npx ts-node scripts/admin.ts fund 10000000    # 10M SKR
```

Verify:
```bash
npx ts-node scripts/admin.ts balances
```

## 11. Deploy backend to Railway

```bash
# Connect Railway to your GitHub repo (Dockerfile-based build)
railway login
railway link         # pick your project
railway up           # deploys from current branch

# Set env vars via Railway dashboard or CLI:
railway variables set SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=<your-helius-key>
railway variables set SOLANA_NETWORK=mainnet-beta
railway variables set SEEK_PROGRAM_ID=DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v
railway variables set SKR_MINT=SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3
railway variables set AUTHORITY_PRIVATE_KEY=<cold keypair base58>
railway variables set HOT_AUTHORITY_PRIVATE_KEY=<hot keypair base58>
railway variables set ANTHROPIC_API_KEY=<your claude key>
railway variables set REDIS_URL=<upstash redis URL>
railway variables set SENTRY_DSN=<your sentry DSN>
railway variables set NODE_ENV=production

# Add custom domain (api.seek.app) — Railway handles SSL automatically
```

## 12. Update mobile app + build release APK

```bash
# 1. Edit mobile/src/config/index.ts
#    export const NETWORK: '...' = 'mainnet-beta';

# 2. Build the release APK with your keystore (see mobile/android/SIGNING.md)
export SEEK_KEYSTORE_PATH="$HOME/keys/seek-release.keystore"
export SEEK_KEYSTORE_PASSWORD=<from 1password>
export SEEK_KEY_ALIAS=seek
export SEEK_KEY_PASSWORD=<from 1password>

cd mobile/android
./gradlew clean
./gradlew assembleRelease
# → mobile/android/app/build/outputs/apk/release/app-release.apk

# 3. Verify signing + install on Seeker
keytool -printcert -jarfile app/build/outputs/apk/release/app-release.apk
adb install -r app/build/outputs/apk/release/app-release.apk
```

Smoke-test the full flow end-to-end with real SKR before submitting.

## 13. Submit to Solana dApp Store

Follow `dapp-store-publishing/README.md`:
1. Fund publisher wallet with 0.5 SOL
2. `npx dapp-store create publisher`
3. `npx dapp-store create app`
4. `npx dapp-store create release`
5. `npx dapp-store publish submit --requestor-is-authorized --complies-with-solana-dapp-store-policies`
6. Wait 2–5 business days for review.

## 14. Post-launch monitoring

- Railway logs: live tail for error bursts
- Sentry: new issues, crash-free session rate
- `npx ts-node scripts/admin.ts status` — watch house balance, win rate, total bounties
- Upstash dashboard — Redis memory + request count
- Helius dashboard — RPC request volume

Set alerts: house balance < 1M SKR, finalizer queue depth > 50, error rate > 1%.
