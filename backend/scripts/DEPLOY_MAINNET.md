# Seek Mainnet Deployment Runbook

Step-by-step to take Seek from the devnet hackathon state to a live mainnet
deployment with Ledger-backed cold authority + Railway-hosted backend.

Prereqs (user-side):
- **Cold authority Ledger** (Ledger #1) with Solana app installed — used for admin ops (fund_house, set_hot_authority, set_treasury, propose/accept_authority_transfer, resolve_dispute) AND program upgrade authority by default
- **Fees wallet Ledger** (Ledger #2): `Fmv8HqyQPUEp29wkybPimVkGbDverxs9BVji1rn2Y9Hr` — separate Ledger that owns the SKR ATA receiving the 10% rake. Signs nothing on-chain in the Seek protocol; rake accumulates as SKR, user periodically swaps to USDC/SOL on a DEX (Ledger-signed) and off-ramps to fiat. Operating expenses are funded separately, not paid from this wallet. **Rotatable** post-init via `admin.ts set-treasury` (cold-signed) — not locked forever.
- ~5 SOL mainnet on cold Ledger for program deploy + rent
- $SKR tokens for house vault (**launch starter ~58,824 SKR ≈ $1000 at $0.017** — intentionally small; mission pool + AI thresholds tuned for ruin avoidance)
- Release keystore generated per `mobile/android/SIGNING.md`
- Railway account + project provisioned
- Upstash Redis instance
- Sentry project DSN
- Domain `api.seek.mythx.art` DNS-ready to CNAME → Railway

**House vault is NOT an EOA.** It is a PDA token account; win payouts are PDA-signed CPIs from the protocol — no human ever signs payouts, so no "hot" wallet for the house is needed.

## 1. Build the mainnet contract binary

**FIRST**: paste the cold-Ledger pubkey into `lib.rs` to lock the
`initialize` instruction. Without this, anyone can front-run the
deploy → init gap and become `global_state.authority`.

```bash
# Get the Ledger pubkey
LEDGER_PUBKEY=$(solana-keygen pubkey usb://ledger)
echo "Cold Ledger pubkey: $LEDGER_PUBKEY"

# Edit contracts/programs/seek-protocol/src/lib.rs and replace the
# placeholder in EXPECTED_INITIAL_AUTHORITY with $LEDGER_PUBKEY:
#   pub const EXPECTED_INITIAL_AUTHORITY: Pubkey =
#       pubkey!("11111111111111111111111111111111");   ← BEFORE
#   pub const EXPECTED_INITIAL_AUTHORITY: Pubkey =
#       pubkey!("YOUR_LEDGER_PUBKEY_HERE");            ← AFTER

# Sanity check — should print your Ledger pubkey, NOT 1111…111:
grep -A1 EXPECTED_INITIAL_AUTHORITY contracts/programs/seek-protocol/src/lib.rs
```

Now build:

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
# Fees wallet — receives the 10% protocol-treasury cut from every loss.
# LOCKED ON-CHAIN at initialize_singularity_vault. Triple-check before init.
export FEES_WALLET=Fmv8HqyQPUEp29wkybPimVkGbDverxs9BVji1rn2Y9Hr
# IMPORTANT: initialize-protocol.ts expects an env keypair today — if you
# want to sign with the Ledger, you'll need to refactor it to take a
# signer. For a one-off init, it's acceptable to use an interim hot
# keypair, then immediately rotate cold authority to Ledger (see step 8).

npx ts-node scripts/initialize-protocol.ts
```

This creates:
- `GlobalState` PDA (owner = authority)
- `house_vault` PDA token account (SKR) — owned by global_state PDA, payouts are PDA-signed
- `singularity_vault` PDA token account (SKR) — same pattern as house_vault
- `protocol_treasury` — the SKR ATA owned by `FEES_WALLET` (Ledger #2). Cold authority pays the ATA rent. **Rotatable post-init** via `admin.ts set-treasury <new_wallet_pubkey>` (cold-signed). The contract has no `withdraw_treasury` instruction (removed 2026-04-23) — under FEES_WALLET-owned-ATA, the Ledger swaps SKR for USDC on a DEX directly and off-ramps to fiat.

## 7. Set hot authority on-chain

```bash
export AUTHORITY_PRIVATE_KEY=<cold keypair that ran init>
cd backend
npx ts-node scripts/admin.ts set-hot <HOT_AUTHORITY_PUBKEY>
```

### 7b. (Optional) Rotate fees wallet later

If FEES_WALLET keys are ever compromised, lost, or need to change for operational reasons:

```bash
# Cold-authority signed. Derives the new ATA, creates it if missing
# (cold authority pays rent), then calls set_treasury on-chain.
npx ts-node scripts/admin.ts set-treasury <NEW_FEES_WALLET_PUBKEY>
```

All future protocol-treasury inflows redirect to the new ATA. Funds already in the old ATA stay under the old wallet's control — sweep them separately via the old Ledger if recoverable.

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

**Launch starter is ~58,824 SKR (≈ $1000)** — intentionally small. Do NOT seed at $170k; the mission pool + AI thresholds + 8-12% target win rate are designed for a small float that grows organically. See `tasks/roadmap.md § B7` and `memory/project_economic_model.md`.

```bash
# First, transfer your SKR holdings to the cold authority's ATA
spl-token transfer SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3 58824 \
  <COLD_AUTHORITY_PUBKEY> --fund-recipient --url mainnet-beta

# Then fund the on-chain house vault via the fund_house instruction
npx ts-node scripts/admin.ts fund 58824    # ~$1k starter
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

# Add custom domain (api.seek.mythx.art) — Railway handles SSL automatically
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
