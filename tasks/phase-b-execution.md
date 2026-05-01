# Phase B — User-gated execution sequence

**Status as of 2026-04-30:** B9 code hardening is still green. B0a Ledger
signing support is now implemented in code for `initialize-protocol.ts` and
cold-admin `admin.ts` paths. The remaining launch gate is user hardware:
connect the Ledger, paste the same pubkey into `EXPECTED_INITIAL_AUTHORITY`,
run preflight, then build/deploy.

This file is the **execution playbook** for getting from here to a live
mainnet deploy + Solana dApp Store listing. Each item is sized in real
clock time (not Claude-Code-collapses-to-seconds time — these involve
actual hardware operations, key generation, fund transfers, etc).

When picking up next session: jump straight to the next unchecked item.
Order matters where flagged. Items not flagged can be parallelized.

---

## The launch items

### B0a — Make init/admin Ledger-signable ✅ code complete
**Time:** 5-10 min real-device smoke once Ledger is connected
**Dependency:** Ledger connected locally.
**Done:** `backend/src/utils/authority-signer.ts` supports
`AUTHORITY_SIGNER=ledger`, `AUTHORITY_LEDGER_PATH`, and
`AUTHORITY_LEDGER_PUBKEY`; `initialize-protocol.ts` and cold-admin paths in
`admin.ts` now sign through that abstraction. `mainnet-preflight.ts` verifies
the Ledger pubkey matches `EXPECTED_INITIAL_AUTHORITY`.

**Still required:** real-device verification with the Solana app open.

**Unblocks:** B0, Phase C steps 6-10 after the Ledger pubkey is known.

---

### B0 — Paste cold Ledger pubkey into `lib.rs` 🔴 NEW from B9-2
**Time:** 1 min
**Dependency:** Ledger device with the Solana app installed.
**Action:**
```bash
solana-keygen pubkey usb://ledger
# Copy the output, then edit:
#   contracts/programs/seek-protocol/src/lib.rs
# Find EXPECTED_INITIAL_AUTHORITY (search for it). Replace the placeholder
# pubkey "11111111111111111111111111111111" with the Ledger pubkey.
# Sanity check:
grep -A1 EXPECTED_INITIAL_AUTHORITY contracts/programs/seek-protocol/src/lib.rs
```
**Why this is first:** Without it, the mainnet `anchor build` will produce
a binary whose `initialize` rejects the cold Ledger as authority (the
constraint also rejects the System Program placeholder). Do not build for
mainnet until the signer that will run `initialize` is the same pubkey pasted
here.

**Unblocks:** mainnet `anchor build`.

### B0b — Verify program stays upgradeable 🟡 critical-path
**Time:** 1 min before deploy, 1 min after deploy
**Dependency:** B0.
**Action:**
```bash
cd backend
npm run preflight:mainnet -- --offline   # before deploy
npm run preflight:mainnet                # after deploy, verifies upgrade authority if account exists
```
**Rule:** deploy with `anchor deploy --provider.cluster mainnet --provider.wallet usb://ledger`
and do **not** pass `--final`. Keep Ledger as program upgrade authority until
post-launch behavior is stable and any demo/devnet-era tweaks are complete.

**Unblocks:** safe post-deploy tweaks/upgrades.

---

### B1 — Release keystore generation 🟡 critical-path
**Time:** 5 min hands-on, 30 min if including paper backup ceremony
**Runbook:** [`mobile/android/SIGNING.md`](../mobile/android/SIGNING.md)
**Action:**
1. `keytool` generates `seek-release.keystore`.
2. Set `SEEK_KEYSTORE_PATH`, `SEEK_KEYSTORE_PASSWORD`, `SEEK_KEY_ALIAS`,
   `SEEK_KEY_PASSWORD` env vars (Gradle reads these in release builds).
3. Back up the keystore: 1Password personal vault + offline USB + paper
   QR-coded backup.
4. **Lose the keystore = permanently locked out of dApp Store updates.**
   Mandatory triple-redundancy.

**Unblocks:** release APK builds → dApp Store submission.

**Can be parallel with:** B5, B9.

---

### B2 — DNS for `api.seek.mythx.art` 🟢 deferred-to-post-deploy
**Time:** 2 min after Phase C step 11 reveals the Railway target
**Action:** CNAME `api.seek.mythx.art` → Railway-provided target (you'll
get this from Railway's custom domain UI after the backend deploys).

**Why deferred:** You don't know the Railway target until the project is
provisioned. Done as part of Phase C, not Phase B.

---

### B3 — Ledger pubkey + 5 SOL mainnet 🟡 critical-path
**Time:** Depends on your SOL funding source. ~5 min if you have liquid SOL.
**Action:** Send ~5 SOL mainnet to the cold-Ledger pubkey from B0. Used
for: program deploy (~3-4 SOL), program upgrade buffer rent, IDL upload,
initial CPIs, vault inits.

**Unblocks:** Phase C steps 2-7.

---

### B4 — ~58,824 SKR for house vault 🟡 critical-path
**Time:** Depends on source. ~10 min if buying via Jupiter aggregator.
**Action:** Acquire ~58,824 SKR (≈ $1000 at $0.017 — intentionally small,
see economic-model section in CLAUDE.md). Send to cold-Ledger SKR ATA. After
protocol init, run `admin.ts fund 58824`.

**Notes:**
- SKR is the official Solana Mobile staking token. Available on
  Jupiter / Raydium / Orca DEX pools. You may already hold some from
  Seeker airdrop.
- The vault is intentionally small to enforce ruin avoidance — the
  mission pool + AI thresholds are tuned for 8-12% target win rate, not
  EV-maximization. See `memory/project_economic_model.md`.

**Unblocks:** real-money play. Until vault has SKR, no win can pay out.

---

### B4b — Fees wallet pubkey confirmed 🟢 already-decided
**Time:** 0 min
**Address:** `Fmv8HqyQPUEp29wkybPimVkGbDverxs9BVji1rn2Y9Hr` (separate Ledger
from cold authority). Receives the 10% rake from each loss.
**Notes:** Rotatable post-init via `admin.ts set-treasury <new>` (cold-
authority signed). The contract has no `withdraw_treasury` — the rake
accumulates as SKR in this Ledger's ATA, user periodically swaps to
USDC/SOL on a DEX (Ledger-signed) and off-ramps to fiat.

**Unblocks:** `initialize_singularity_vault` step in Phase C.

---

### B5 — Publisher wallet + 0.5 SOL 🟡 critical-path-for-dApp-Store
**Time:** 5 min
**Runbook:** [`dapp-store-publishing/README.md`](../dapp-store-publishing/README.md)
**Action:**
```bash
solana-keygen new --outfile ./publisher.json
solana-keygen pubkey ./publisher.json   # paste into dapp-store-publishing/config.yaml line 24
# Mainnet: actually transfer 0.5 SOL to that pubkey.
# Back up publisher.json to 1Password — losing it = losing the listing.
```
Then update `dapp-store-publishing/config.yaml:24` with the pubkey.

**Unblocks:** Publisher NFT mint (one-time) → App NFT → Release NFT.

**Can be parallel with:** B1, B9.

---

### B6 — dApp Store visual assets 🟡 critical-path-for-dApp-Store
**Time:** 2-4 hr for design audit + logo/icon/banner pass; 30-60 min for
screenshots once a dev build is running on Seeker.
**Needs:**
- Design/brand audit against current Solana Mobile dApp Store publishing docs,
  Solana Mobile co-marketing guidance, and official Solana brand constraints.
- Production Seek logo/mark system: app icon variant, monochrome variant,
  dark/light lockups, and usage notes.
- App icon: `dapp-store-publishing/assets/icon.png` (512x512 PNG)
- Required banner: `dapp-store-publishing/assets/banner.png` (1200x600 PNG/JPG)
- At least 4 real screenshots/videos in `dapp-store-publishing/assets/screenshots/en-US/`
- Screenshot images must be at least 1080x1080 and share orientation/aspect ratio
- Optional Editor's Choice feature graphic: `feature-graphic.png` (1200x1200)

**Source checks before producing assets:**
- `https://docs.solanamobile.com/dapp-store/submit-new-app`
- `https://docs.solanamobile.com/marketing/comarketing-guidelines`
- `https://solana.com/branding/`

**Validate:** `cd dapp-store-publishing && node check-assets.mjs`.

**Unblocks:** `npx dapp-store create release`.

**Can be parallel with:** B0, B1, B5.

---

### B9 — seek.mythx.art marketing + legal site 🟡 critical-path-for-dApp-Store
**Time:** Claude can scaffold a strong v1 in ~30-45 min once you say go.
Longer for any custom 3D / video work.
**Why required:** dApp Store policy mandates that `privacy_policy_url`
and `license_url` resolve to real pages. The current `config.yaml`
references `https://seek.mythx.art/privacy` and `/license`. Both need
to actually exist before submission.
**Brief:** [`memory/project_marketing_site.md`](~/.claude/projects/-Users-hammer-Desktop-Claude-seek/memory/project_marketing_site.md)
- Next.js 15 + Tailwind v4 + Framer Motion + Lenis on Vercel
- Reference: https://solanamobile.com/seeker — clone the Seeker visual
  language end-to-end (NOT generic Solana brand)
- Pages: `/`, `/privacy`, `/terms`, `/license`
- Bake in `@vercel/analytics` + SEO from day one (per CLAUDE.md global
  rules)
- Lives in repo at top-level `web/` directory, separate Vercel project

**You provide:** Vercel account + DNS access for `seek.mythx.art`. Claude
does the wiring once you click deploy. Final copy approval.

**Unblocks:** dApp Store policy compliance.

**Can be parallel with:** B0, B1, B5, B6.

---

## Recommended execution order

```
Day 1:
  1. B0 (paste Ledger pubkey) → B0b (preflight)
  2. In parallel after B0/B0b: B1 (keystore), B5 (publisher wallet),
     B9 (marketing site)

Day 1 → Day 2 (waits on user funding):
  - B3 (Ledger SOL, depends on your SOL liquidity)
  - B4 (SKR for vault, depends on DEX availability + price action)
  - B6 (screenshots, needs dev build running on Seeker)

Day 2 (when B3 + B4 + B6 + B9 all done):
  → Phase C: mainnet deploy (sequential, ≤1 day)
    1. anchor build
    2. npm run deploy:mainnet (no --final)
    3. anchor idl init
    4. solana-verify build && solana-verify upload
    5. Generate hot keypair, fund 0.3 SOL
    6. initialize → initialize_house_vault → initialize_singularity_vault
    7. admin.ts set-hot <hot_pubkey>
    8. admin.ts propose-transfer (if rotating cold auth)
    9. confirm Ledger remains program upgrade authority; do not finalize
    10. Transfer SKR + admin.ts fund 58824
    11. Backend → Railway, env vars, Upstash addon, custom domain
    12. mobile/src/config/index.ts already at mainnet (verified by build-time assertion)
    13. ./gradlew assembleRelease (with SEEK_KEYSTORE_* env)
    14. Sideload APK on Seeker, smoke test with real SKR

Day 3 → Day 7 (dApp Store review):
  → Phase D: dApp Store submission (≤1 hr active + 2-5 business days review)
    1. npm i -g @solana-mobile/dapp-store-cli
    2. npx dapp-store create publisher (~0.03 SOL)
    3. npx dapp-store create app (~0.02 SOL)
    4. npx dapp-store create release (~0.1-0.2 SOL)
    5. npx dapp-store publish submit
    6. Wait for review, iterate if needed
    7. Ship 🚀
```

---

## Hard dependencies

```
B0 ───► B0b ────► Phase C (mainnet build + init/admin)
B1 ────► Release APK ────► Phase C step 13
B3 ────► Phase C steps 2-7 (deploy + init)
B4 ────► Real-money play (vault funded)
B4b ───► Phase C step 6 (initialize_singularity_vault — already decided)
B5 ────► Phase D step 2 (publisher NFT)
B6 ────► Phase D step 4 (release NFT)
B9 ────► dApp Store policy compliance ────► Phase D step 5 (publish)
```

---

## When picking up

1. Run `gh run list --limit 1` — confirm CI is green. (As of 2026-04-27 it
   is, but staleness happens.)
2. Run `git log --oneline -5` — confirm latest is `436f2cd` or newer.
3. Re-read `memory/project_pre_mainnet_audit_2026_04_27.md` for the
   B9 fix list and what's deferred.
4. Re-read this file. Pick first unchecked item. Execute.

If you discover anything is stale (claim says X, code says Y), STOP and
re-audit before proceeding. Repeated B8 → B9 lesson: don't trust prior
"all closed" claims; verify against current code.
