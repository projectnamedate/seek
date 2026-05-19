# Seek Mainnet Deployment Runbook

Step-by-step to take Seek from the devnet hackathon state to a live mainnet
deployment with Ledger-backed cold authority + Railway-hosted backend.

Prereqs (user-side):
- **Cold authority Ledger** (Ledger #1) with Solana app installed — used for admin ops (fund_house, pause/resume, withdraw unreserved house funds, withdraw Singularity while paused with zero active bounties, set_hot_authority, set_treasury, propose/accept_authority_transfer, resolve_dispute) AND program upgrade authority by default
- **Fees wallet Ledger** (Ledger #2): `Fmv8HqyQPUEp29wkybPimVkGbDverxs9BVji1rn2Y9Hr` — separate Ledger that owns the SKR ATA receiving the 10% rake. Signs nothing on-chain in the Seek protocol; rake accumulates as SKR, user periodically swaps to USDC/SOL on a DEX (Ledger-signed) and off-ramps to fiat. Operating expenses are funded separately, not paid from this wallet. **Rotatable** post-init via `admin.ts set-treasury` (cold-signed) — not locked forever.
- SOL on the cold Ledger for Ledger-signed admin/IDL transactions, plus a
  durable git-ignored upgrade payer funded only after pubkey/permission
  verification for program upgrade fees, buffer rent, and drain-after-upgrade
  cleanup
- $SKR tokens for house vault (**launch starter ~58,824 SKR ≈ $1000 at $0.017** — intentionally small; mission pool + AI thresholds tuned for ruin avoidance)
- Release keystore generated per `mobile/android/SIGNING.md`
- Railway account + project provisioned
- Upstash Redis instance
- Sentry project DSN
- Domain `api.seek.mythx.art` DNS-ready to CNAME → Railway

**House vault is NOT an EOA.** It is a PDA token account; win payouts are PDA-signed CPIs from the protocol — no human ever signs payouts, so no "hot" wallet for the house is needed. The cold Ledger can withdraw only unreserved house surplus; active payout liability remains locked for accepted bounties.

## 1. Build the mainnet contract binary

**FIRST**: paste the cold-Ledger pubkey into `lib.rs` to lock the
`initialize` instruction. Without this, anyone can front-run the
deploy → init gap and become `global_state.authority`.

The TypeScript init/admin scripts now support `AUTHORITY_SIGNER=ledger`.
Use the same Ledger pubkey here, in `AUTHORITY_LEDGER_PUBKEY`, and on the
physical Ledger prompt.

Current Seek cold-authority selection for launch:
- CLI signer URL: `'usb://ledger?key=1'`
- Ledger app derivation path for backend init/admin scripts: `44'/501'/1'`
- Cold authority pubkey: `GkpXKrovpRLgAgQpkeX7wFC3FDKHJDBED5YzNog2YNtY`

```bash
# Get the Ledger pubkey
LEDGER_URL='usb://ledger?key=1'
LEDGER_PATH="44'/501'/1'"
LEDGER_PUBKEY=$(solana-keygen pubkey "$LEDGER_URL")
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

Run the offline preflight before building:

```bash
cd backend
export SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
export SOLANA_NETWORK=mainnet-beta
export SEEK_PROGRAM_ID=DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v
export SKR_MINT=SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3
export FEES_WALLET=Fmv8HqyQPUEp29wkybPimVkGbDverxs9BVji1rn2Y9Hr
export AUTHORITY_SIGNER=ledger
export AUTHORITY_LEDGER_PATH=$LEDGER_PATH
export AUTHORITY_LEDGER_PUBKEY=$LEDGER_PUBKEY
npm run preflight:mainnet -- --offline
cd ../contracts
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
LEDGER_URL='usb://ledger?key=1'
solana-keygen pubkey "$LEDGER_URL"       # → COLD_AUTHORITY_PUBKEY
solana config set --keypair "$LEDGER_URL"
```

Send ~5 SOL to that pubkey (mainnet).

## 3. Deploy the program

This is the big irreversible step. Program ID stays the same as devnet
(`DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v`) — Anchor uses the
existing `target/deploy/seek_protocol-keypair.json`.

**2026-05-17 custody rule:** never create, store, or fund deploy, buffer,
fee-payer, hot-authority, or publisher keypairs in `/tmp`, `/private/tmp`,
shell heredocs, terminal scrollback, or chat. Direct Ledger deploy can ask for
repeated approvals during buffer upload. If a non-Ledger buffer or fee-payer key
is needed to avoid repeated approvals, create it directly under durable
git-ignored storage, set `0600`, verify the pubkey, define a backup or drain
plan, and drain remaining SOL after the upgrade. Do not use `--final`.

```bash
cd "$(git rev-parse --show-toplevel)"

# Confirm cluster. Set RPC_URL in your shell or load it from an ignored env file;
# do not paste private RPC keys in chat or docs.
: "${RPC_URL:?set RPC_URL to a mainnet RPC endpoint first}"
LEDGER_URL='usb://ledger?key=1'
LEDGER_PUBKEY=GkpXKrovpRLgAgQpkeX7wFC3FDKHJDBED5YzNog2YNtY
PROGRAM_ID=DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v
UPGRADE_KEYPAIR=.secrets/solana/seek-upgrade-payer-20260517.json
UPGRADE_BUFFER_KEYPAIR=.secrets/solana/seek-upgrade-buffer-20260517.json
EXPECTED_UPGRADE_PUBKEY=3EKi2PzKrDi22Ld6NgixdBX7djSKMrZA2TG1utg1tJAS
EXPECTED_UPGRADE_BUFFER_PUBKEY=C3y6AWfaM4vR5vocLa8Bozv768PkeyDwmaQWhM3buH2i

# Must pass immediately before funding or deploying.
test "$(solana address -k "$LEDGER_URL")" = "$LEDGER_PUBKEY"

mkdir -p .secrets/solana
chmod 700 .secrets .secrets/solana
git check-ignore -q "$UPGRADE_KEYPAIR"
git check-ignore -q "$UPGRADE_BUFFER_KEYPAIR"

# Create only if these durable ignored keys do not already exist.
test -f "$UPGRADE_KEYPAIR" || solana-keygen new --outfile "$UPGRADE_KEYPAIR"
test -f "$UPGRADE_BUFFER_KEYPAIR" || solana-keygen new --outfile "$UPGRADE_BUFFER_KEYPAIR"
chmod 600 "$UPGRADE_KEYPAIR" "$UPGRADE_BUFFER_KEYPAIR"

UPGRADE_PUBKEY=$(solana-keygen pubkey "$UPGRADE_KEYPAIR")
UPGRADE_BUFFER_PUBKEY=$(solana-keygen pubkey "$UPGRADE_BUFFER_KEYPAIR")
test "$UPGRADE_PUBKEY" = "$EXPECTED_UPGRADE_PUBKEY"
test "$UPGRADE_BUFFER_PUBKEY" = "$EXPECTED_UPGRADE_BUFFER_PUBKEY"
solana-keygen verify "$EXPECTED_UPGRADE_PUBKEY" "$UPGRADE_KEYPAIR"
solana-keygen verify "$EXPECTED_UPGRADE_BUFFER_PUBKEY" "$UPGRADE_BUFFER_KEYPAIR"

# Fund only after the paths, permissions, pubkeys, and drain/backup plan are verified.
# The 2026-05-17 durable payer pubkey is
# `3EKi2PzKrDi22Ld6NgixdBX7djSKMrZA2TG1utg1tJAS`; it was verified at 0600 and
# drained to 0 SOL after the last upgrade. Reverify before reuse.
#
# The cold Ledger remains the program upgrade authority. The durable keypair is
# only the fee payer, and the durable buffer keypair avoids temp/random buffer
# custody. Do NOT add --final; the program must remain upgradeable under Ledger.
solana -u "$RPC_URL" \
  -k "$UPGRADE_KEYPAIR" \
  program deploy contracts/target/deploy/seek_protocol.so \
  --program-id "$PROGRAM_ID" \
  --buffer "$UPGRADE_BUFFER_KEYPAIR" \
  --upgrade-authority "$LEDGER_URL" \
  --fee-payer "$UPGRADE_KEYPAIR" \
  --use-rpc

# Verify ProgramData upgrade authority is still the Ledger and the program is not final.
solana -u "$RPC_URL" program show "$PROGRAM_ID"

# Upgrade the already-published IDL on-chain (so indexers/explorers can decode)
(cd contracts && anchor idl upgrade \
  --provider.cluster mainnet \
  --provider.wallet "$LEDGER_URL" \
  --filepath target/idl/seek_protocol.json \
  "$PROGRAM_ID")
```

## 4. Optionally publish a verified build

```bash
# One-time install
cargo install solana-verify

# Build + upload reproducible binary hash to on-chain attestation
solana-verify build --library-name seek_protocol
solana-verify upload \
  --url https://api.mainnet-beta.solana.com \
  --wallet "$LEDGER_URL" \
  DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v
```

## 5. Generate + fund the HOT authority

The hot authority lives on the backend and signs only `reveal_mission` +
`propose_resolution` + `finalize_bounty` (the last is permissionless but
we use this key by default). Generate it only under durable ignored storage.

```bash
mkdir -p ../.secrets/solana && chmod 700 ../.secrets ../.secrets/solana
solana-keygen new --outfile ../.secrets/solana/seek-hot.json
chmod 600 ../.secrets/solana/seek-hot.json
solana-keygen pubkey ../.secrets/solana/seek-hot.json   # → HOT_AUTHORITY_PUBKEY
solana-keygen verify <HOT_AUTHORITY_PUBKEY> ../.secrets/solana/seek-hot.json

# Fund with 0.3 SOL for tx fees. Top up monthly via a cron.
solana transfer <HOT_AUTHORITY_PUBKEY> 0.3 --url mainnet-beta --keypair "$LEDGER_URL"
```

## 6. Initialize protocol on mainnet

The existing `scripts/initialize-protocol.ts` handles the 3-step init
(`initialize` → `initialize_house_vault` → `initialize_singularity_vault`).
It must sign with the same pubkey compiled into `EXPECTED_INITIAL_AUTHORITY`.

```bash
cd backend

# Set env (one-off run — can write to .env then `source` it, or export inline)
export SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
export SOLANA_NETWORK=mainnet-beta
export SKR_MINT=SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3
export SEEK_PROGRAM_ID=DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v
# Fees wallet — receives the 10% protocol-treasury cut from every loss.
# Set at initialize_singularity_vault and rotatable later via set_treasury.
# Triple-check before init anyway.
export FEES_WALLET=Fmv8HqyQPUEp29wkybPimVkGbDverxs9BVji1rn2Y9Hr
export AUTHORITY_SIGNER=ledger
export AUTHORITY_LEDGER_PATH="44'/501'/1'"
export AUTHORITY_LEDGER_PUBKEY=$LEDGER_PUBKEY
# Optional; defaults to true on mainnet-beta. Leave true for launch so the
# Ledger displays the pubkey before signing.
export AUTHORITY_LEDGER_CONFIRM_PUBKEY=true

# Online preflight verifies the source constants and, if the program is already
# deployed, confirms it is still upgradeable and controlled by this Ledger.
npm run preflight:mainnet

npx ts-node scripts/initialize-protocol.ts
```

This creates:
- `GlobalState` PDA (owner = authority)
- `house_vault` PDA token account (SKR) — owned by global_state PDA, payouts are PDA-signed
- `singularity_vault` PDA token account (SKR) — same pattern as house_vault
- `protocol_treasury` — the canonical SKR ATA owned by `FEES_WALLET` (Ledger #2). Cold authority pays the ATA rent. The contract validates the owner account plus canonical ATA on init and rotation. **Rotatable post-init** via `admin.ts set-treasury <new_wallet_pubkey>` (cold-signed). The contract has no `withdraw_treasury` instruction (removed 2026-04-23) — under FEES_WALLET-owned-ATA, the Ledger swaps SKR for USDC on a DEX directly and off-ramps to fiat.

## 7. Set hot authority on-chain

```bash
# Uses the same AUTHORITY_SIGNER=ledger env from step 6.
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

### 7c. Cold-Ledger emergency controls

These are explicit public admin instructions. They are not hidden backdoors:

```bash
# Stop or resume new accept_bounty calls. Existing bounties can still resolve.
npx ts-node scripts/admin.ts pause
npx ts-node scripts/admin.ts resume

# Withdraw only house funds not reserved for active payout liability.
npx ts-node scripts/admin.ts withdraw-house <AMOUNT_IN_SKR>

# Withdraw Singularity funds. Protocol must be paused with zero active bounties.
npx ts-node scripts/admin.ts withdraw-singularity <AMOUNT_IN_SKR>
```

Before withdrawing, check:

```bash
npx ts-node scripts/admin.ts status
npx ts-node scripts/admin.ts balances
```

## 8. Rotate cold authority to Ledger (only if an interim keypair was used)

Preferred path after B0a: initialize directly with the Ledger, so this step is
not needed. If the operator explicitly accepted an interim non-Ledger init
keypair, run the two-step transfer: current authority proposes, Ledger accepts.

```bash
# As current interim cold authority
export AUTHORITY_PRIVATE_KEY=<interim init keypair base58>
npx ts-node scripts/admin.ts propose-transfer <LEDGER_PUBKEY>

# Switch to Ledger signing for the accept step.
export AUTHORITY_SIGNER=ledger
export AUTHORITY_LEDGER_PATH="44'/501'/1'"
export AUTHORITY_LEDGER_PUBKEY=$LEDGER_PUBKEY
npx ts-node scripts/admin.ts accept-transfer
```

## 9. Keep program upgrade authority on Ledger

```bash
# Still with Ledger as current upgrade authority (step 3).
# Recommended during launch: leave as-is so the program can be upgraded while
# you tune anything discovered after devnet/demo.
solana program show DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v --url mainnet-beta

# Optional later: set to a different Ledger account.
# solana program set-upgrade-authority -k "$LEDGER_URL" \
#   DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v \
#   --new-upgrade-authority <NEW_LEDGER_PUBKEY>

# To revoke (make program immutable — CAREFUL, no future upgrades):
# solana program set-upgrade-authority -k "$LEDGER_URL" \
#   DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v --final
```

Do not use `--final` until after launch behavior is stable and you have made a
separate irreversible-lock decision.

## 10. Fund house vault

**Launch starter is ~58,824 SKR (≈ $1000)** — intentionally small. Do NOT seed at $170k; the mission pool + AI thresholds + 8-12% target completion rate are designed for a small float that grows organically. See `tasks/roadmap.md § B7` and `memory/project_economic_model.md`.

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
npx ts-node scripts/admin.ts status
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
railway variables set HOT_AUTHORITY_PRIVATE_KEY=<hot keypair base58>
railway variables set ANTHROPIC_API_KEY=<your claude key>
railway variables set REDIS_URL=<upstash redis URL>
railway variables set SENTRY_DSN=<your sentry DSN>
railway variables set NODE_ENV=production

# Add custom domain (api.seek.mythx.art) — Railway handles SSL automatically
```

Do **not** set the cold Ledger/private authority key in Railway runtime env.
The backend signs only hot-path `reveal_mission` / `propose_resolution`
transactions with `HOT_AUTHORITY_PRIVATE_KEY`; cold admin ops stay local.

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

# 3. Verify signing + install on the Solana Mobile test app device
keytool -printcert -jarfile app/build/outputs/apk/release/app-release.apk
adb install -r app/build/outputs/apk/release/app-release.apk
```

Smoke-test the full upgraded flow end-to-end after the program upgrade and
backend deploy, before submitting any Solana Mobile dApp Store update. Confirm
the test app receives the 500 / 1000 / 2000 tier payload, signs
`accept_bounty_v2`, starts a bounty, captures camera/location proof, and
reaches a validation/result state.

## 13. Submit to Solana dApp Store

Do not submit until the pre-release audit gate and the post-upgrade Solana
Mobile test-app smoke both pass, and the user approves the exact "What's new"
text.

Follow `dapp-store-publishing/README.md`:
1. Fund publisher wallet with 0.5 SOL, back up `.secrets/dapp-store/publisher.json`, and finish Publisher Portal KYC/KYB.
2. Add icon, required banner, and at least 4 screenshots/videos; run `cd dapp-store-publishing && node check-assets.mjs`.
3. Export `DAPP_STORE_API_KEY` from Publisher Portal.
4. Publish the signed release APK with `dapp-store --apk-file ../mobile/android/app/build/outputs/apk/release/app-release.apk --keypair ../.secrets/dapp-store/publisher.json --whats-new "..."`
5. If using the direct NFT/config flow, run `create publisher`, `create app`, `create release`, then `publish submit --requestor-is-authorized --complies-with-solana-dapp-store-policies`.
6. Wait 3-5 business days for review.

## 14. Post-launch monitoring

- Railway logs: live tail for error bursts
- Sentry: new issues, crash-free session rate
- `npx ts-node scripts/admin.ts status` — watch house balance, completion rate, total bounties
- Upstash dashboard — Redis memory + request count
- Helius dashboard — RPC request volume

Set alerts: house balance < 30,000 SKR, active liability near available house balance, finalizer queue depth > 50, error rate > 1%.
