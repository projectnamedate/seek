# Phase B — User-gated execution sequence

**Status as of 2026-05-17:** Mainnet program is deployed, initialized, funded,
upgraded for zero-delay settlement / revised economics, and still upgradeable
under Ledger `GkpXKrovpRLgAgQpkeX7wFC3FDKHJDBED5YzNog2YNtY`. Railway backend
and static legal URLs are live. User reports the active v1.0.1 / versionCode
`2` release is live in the Solana Mobile dApp Store under ticket
`311418671831`. v1.0.2 / versionCode `3` was submitted to review and accepted
on 2026-05-17 by user report under ticket `311747315429`. Current gate: run an
official store-build smoke on Seeker without USB.

**2026-05-17 upgrade custody note:** The earlier failed attempt left `3.4 SOL`
on temp payer `5bGdsBtnmgU96DKyknUX35QwUNcewkNp2x387uZYwZWR`; the local temp
key file is not present, so do not assume that pubkey is controllable. The
successful upgrade used durable git-ignored key storage, and the durable payer
`3EKi2PzKrDi22Ld6NgixdBX7djSKMrZA2TG1utg1tJAS` was drained back to `0 SOL`.
Before any future fee-payer funding or authority work, use only durable
git-ignored key storage with `0600`, verified pubkey, and a backup/drain plan.
Node HID still cannot open Ledger Flex interface 0 directly; avoid Node Ledger
admin scripts until that is fixed.

This file is the historical **execution playbook** used to get to the live
mainnet deploy + Solana dApp Store listing. Current pickup state is in
`tasks/where-we-are.md`; the remaining launch validation is the official
store-build smoke on Seeker.

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

**Status:** Verified during mainnet initialize/admin operations. The Node
Ledger library expects BIP32 path `44'/501'/1'`; Solana CLI uses
`usb://ledger?key=1`.

**Unblocks:** completed Phase C init/admin operations.

---

### B0 — Paste cold Ledger pubkey into `lib.rs` ✅ done
**Time:** 1 min
**Dependency:** Ledger device with the Solana app installed.
**Done:** `EXPECTED_INITIAL_AUTHORITY` is
`GkpXKrovpRLgAgQpkeX7wFC3FDKHJDBED5YzNog2YNtY`.

**Sanity check:**
```bash
solana-keygen pubkey 'usb://ledger?key=1'
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
**Current:** online mainnet preflight passed after deployment on 2026-05-05.
Program account is deployed and upgrade authority remains the Ledger.
**Rule:** do **not** pass `--final`. If using a non-Ledger deploy authority to
avoid hundreds of Ledger buffer-write approvals, create it only in durable
ignored secrets storage, verify the pubkey, set permissions to `0600`, and
define a backup/drain plan before funding. Transfer upgrade authority to the
Ledger immediately after deploy and verify ProgramData shows
`GkpXKrovpRLgAgQpkeX7wFC3FDKHJDBED5YzNog2YNtY`. Keep Ledger as program upgrade
authority until post-launch behavior is stable and any demo/devnet-era tweaks
are complete.

**Unblocks:** safe post-deploy tweaks/upgrades.

---

### B1 — Release keystore generation ✅ generated; backup still required
**Time:** 5 min hands-on, 30 min if including paper backup ceremony
**Runbook:** [`mobile/android/SIGNING.md`](../mobile/android/SIGNING.md)
**Status:** Generated at `.secrets/android/seek-release.keystore`; release APK
verified with `apksigner`. Back it up before submission.

**Original action:**
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

### B2 — Production DNS ✅ done
**Done:** `api.seek.mythx.art` is wired to Railway and returns HTTPS 200.
`seek.mythx.art` resolves to `204.168.242.220`; Caddy issued TLS and serves the
legal/marketing static site.

---

### B3 — Ledger pubkey + 5 SOL mainnet ✅ done
**Time:** Depends on your SOL funding source. ~5 min if you have liquid SOL.
**Status:** Done. Cold Ledger remains protocol authority and program upgrade
authority; current SOL balance after staging upgrade funds is `0.673227433 SOL`.

**Unblocks:** Phase C steps 2-7.

---

### B4 — ~58,824 SKR for house vault ✅ funded 2026-05-05
**Time:** Depends on source. ~10 min if buying via Jupiter aggregator.
**Action:** Acquire ~58,824 SKR (≈ $1000 at $0.017 — intentionally small,
see economic-model section in CLAUDE.md). Send to cold-Ledger SKR ATA. After
protocol init, run `admin.ts fund 58824`.

**Current:** Cold Seek Ledger holds `58,788.411462 SKR` on mainnet.

**Notes:**
- SKR is the official Solana Mobile staking token. Available on
  Jupiter / Raydium / Orca DEX pools. You may already hold some from
  Seeker airdrop.
- The vault is intentionally small to enforce ruin avoidance — the
  mission pool + AI thresholds are tuned for 8-12% target completion rate, not
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

### B5 — Publisher wallet + 0.5 SOL 🟡 generated; portal/backup still required
**Time:** 5 min
**Runbook:** [`dapp-store-publishing/README.md`](../dapp-store-publishing/README.md)
**Status:** Generated at `.secrets/dapp-store/publisher.json`, pubkey
`Dzbqbjh8qowVK7x89vj1vo1ApUz7LNRqmR39yYXehenR`, balance `0.11787386 SOL`
after the v1.0.2 store submission. Top it up before the next Publisher update.

**Original action:**
```bash
mkdir -p .secrets/dapp-store && chmod 700 .secrets/dapp-store
solana-keygen new --outfile .secrets/dapp-store/publisher.json
chmod 600 .secrets/dapp-store/publisher.json
solana-keygen pubkey .secrets/dapp-store/publisher.json   # paste into dapp-store-publishing/config.yaml line 24
# Mainnet: actually transfer 0.5 SOL to that pubkey.
# Back up .secrets/dapp-store/publisher.json to 1Password — losing it = losing the listing.
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

**2026-05-04 progress:** brand audit, logo system source files, app/store
icon, optional feature graphic, and mobile Expo icon refresh are soft-locked by
user approval. The required banner has a screenshot-1 pass pending user visual
approval. Six staged screenshots are now in
`dapp-store-publishing/assets/screenshots/en-US/`, captured from the disposable
devnet capture fork with `hammer.skr` and a burner devnet wallet because dApp
Store review requires screenshots before Seeker distribution is available.
Submission config now uses photos 1, 4, 5, and 6 only; keep all six PNGs in
place for review history.

**Unblocks:** `npx dapp-store create release`.

**Can be parallel with:** B0, B1, B5.

---

### B9 — seek.mythx.art marketing + legal site ✅ legal URLs live
**Time:** Done for dApp Store compliance. Future marketing polish can be
handled separately.
**Why required:** dApp Store policy mandates that `privacy_policy_url`
and `license_url` resolve to real pages. The current `config.yaml`
references `https://seek.mythx.art/privacy` and `/license`. Both need
to actually exist before submission.
**Brief:** [`memory/project_marketing_site.md`](~/.claude/projects/-Users-hammer-Desktop-Claude-seek/memory/project_marketing_site.md)
- Next.js App Router + TypeScript + plain CSS, exported statically from `web/`
  and served by Caddy from `/var/www/seek-web` on the Helsinki Mythx VPS.
- Reference: https://solanamobile.com/seeker — clone the Seeker visual
  language end-to-end (NOT generic Solana brand)
- Pages: `/`, `/privacy`, `/terms`, `/license`
- Bake in `@vercel/analytics` + SEO from day one (per CLAUDE.md global
  rules)
- Lives in repo at top-level `web/` directory. Current build and typecheck pass.

**You provide:** final copy approval for any future marketing polish.

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

Current remaining order:
  1. Clean stale docs so every handoff points at the upgrade-first path.
  2. Audit missions by scenario and patch apartment/office-farmable outliers.
  3. Upgrade the contract/backend/mobile for zero-delay settlement and 2x total
     return, then rebuild/copy IDL.
  4. Remove the success-screen settlement note and rebuild the signed APK.
  5. Verify live readiness, finalizer behavior, signed APK, and Seeker hardware.
  6. Draft the Solana Mobile Store changelog without mentioning payout math or
     2x total return; show it to the user for approval before upload.
  7. Top up the publisher wallet and submit the next Publisher update.

Day 3 → Day 7 (dApp Store review):
  → Phase D: v1.0.1 resubmitted 2026-05-15 via portal-backed CLI.
    1. Release mint: ATChUKmCC4zzqj9g54etDd7bW5uLFtLsxj5Dib2kqzRe
    2. Collection mint: 4PdmCnEsoUCYMgDAw6X8KFjX7nJHKoVAke8zaAYyjpr1
    3. Ticket ID: 311418671831
    4. Wait for review, iterate if needed
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
B9 ────► dApp Store policy compliance ────► Phase D submitted
```

The user now has Solana Mobile hardware available. The 2026-05-06 emulator
dry-run proved release APK launch, age gate, home UI, and live stats/API
reachability, but the remaining gate is the real-device Seeker smoke after the
upgrade-first contract/backend/mobile changes land.

---

## When picking up

1. Do not follow the old mobile-first/no-upgrade path.
2. Finish the mission audit, payout/finalization patch, backend/mobile copy
   alignment, and verification bundle.
3. Before upload, show the exact Solana Mobile Store changelog to the user and
   get approval. The changelog must not mention payout math or `2x` total
   return.

If you discover anything is stale (claim says X, code says Y), STOP and
re-audit before proceeding. Repeated B8 → B9 lesson: don't trust prior
"all closed" claims; verify against current code.
