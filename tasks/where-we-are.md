# Where we are — Seek

> **Point-in-time snapshot.** Updated at the end of each session. The
> first thing `check-seek` reads. Keep it ≤80 lines so it stays fast to
> scan.

## Last update
**2026-05-01** — night wrap after mainnet-risk cleanup + B6 design asset planning.

## Current state
- ✅ All 5 CRIT + 9 HIGH + 6 MED items from B8 closed (2026-04-23)
- ✅ All 15 new CRIT/HIGH items from B9 re-audit closed (2026-04-27)
- ✅ CI green on master for the first time (run `25032339240` then `~`)
- ✅ Mission pool ~90% calibrated to 8-12% target win rate
- ✅ dApp Store config.yaml mainnet-correct (testing notes, publisher pubkey runbook)
- ✅ DEPLOY_MAINNET.md step 1 includes EXPECTED_INITIAL_AUTHORITY paste
- ✅ B0a code complete: init/admin scripts support `AUTHORITY_SIGNER=ledger`
  and `mainnet-preflight.ts` checks source constants + upgrade authority.
- 🟡 Mainnet deploy still waits on user hardware/funds/assets: paste Ledger
  pubkey into EXPECTED_INITIAL_AUTHORITY, run Ledger smoke/preflight, fund,
  keystore, publisher wallet, dApp Store assets, marketing/legal site.
- ✅ Local takeover checks on 2026-04-30: backend/mobile typecheck PASS,
  contract mainnet+devnet cargo check PASS, contract unit tests 19/19 PASS,
  backend launch-tool tests PASS, latest master CI PASS (`25032966193`).
- ✅ 2026-05-01 demo cleanup: production source grep for demo-mode residue is
  clean, and `backend/tests/no-demo-residue.test.ts` now guards it.
- ✅ 2026-05-01 residual cleanup: `set_treasury` and initial treasury setup now
  require the treasury owner account and pin protocol treasury to that owner's
  canonical SKR ATA; init/admin scripts and IDL are synced.
- ✅ Active bounties now persist to Redis (`activeBounties`/`bountyByPlayer`
  are read-through caches), rate limiters can use Redis stores, and `/prepare`
  enforces a Redis-backed per-wallet daily bounty cap.
- ✅ dApp Store publishing docs refreshed against current Solana Mobile docs:
  required banner/screenshots are explicit and `check-assets.mjs` validates
  icon/banner/screenshot dimensions before submission.
- ✅ B6 now includes a design/brand audit gate against Solana Mobile dApp Store
  requirements, Solana Mobile co-marketing guidance, and Solana brand constraints.
  Asset work includes a production Seek logo system, new icon, new banner,
  real screenshots/videos, optional feature graphic, and QA.
- ✅ Fresh wrap checks on 2026-05-01: backend launch-tool tests 18/18 PASS,
  backend typecheck PASS, mobile typecheck PASS, contract tests 21/21 PASS,
  contract mainnet cargo check PASS, `git diff --check` PASS, demo-residue grep
  over `backend/src` + `mobile/src` clean.
- 🟡 `dapp-store-publishing/check-assets.mjs` correctly fails until real assets
  exist: missing `icon.png`, `banner.png`, and screenshots.
- ⚠️ `npm audit fix` applied non-breaking backend fixes. Residual audit findings
  are Solana stack advisories (`bigint-buffer`, transitive `uuid`) where npm's
  only proposed fix is a breaking `@solana/spl-token` downgrade.

## Where the user paused
Night wrap after committing the mainnet-readiness, demo-cleanup, residual-risk,
and dApp Store asset-planning sweep. Latest commits:
- `HEAD` chore: close mainnet readiness gaps
- `9aa0e1c` chore: drift-prevention guardrails — session-start protocol, verify-before-claim
- `18171d7` docs: add Phase B execution playbook

Drift guardrails active:
- `/check-seek` skill at `.claude/skills/check-seek/SKILL.md` — invoke at session start.
- This file (`tasks/where-we-are.md`) is the canonical session-resume snapshot.
- CLAUDE.md "Session-start protocol" mandates `/check-seek` first.
- Global SessionStart hook prints git+CI status when entering any git repo.
- Global Stop hook warns on uncommitted changes after every turn.
- `tasks/lessons.md` § "Verify before claim" codifies the no-propagate-claims rule.

## Next concrete action

**Tomorrow first: B6 design/brand audit + production Seek logo/icon/banner direction.**

Use:
- `tasks/roadmap.md` § B6
- `tasks/phase-b-execution.md` § B6
- `dapp-store-publishing/assets/README.md`

Re-check official sources before producing assets:
- `https://docs.solanamobile.com/dapp-store/submit-new-app`
- `https://docs.solanamobile.com/marketing/comarketing-guidelines`
- `https://solana.com/branding/`

After B6 direction is locked, capture real Seeker screenshots and run:

```bash
cd dapp-store-publishing
node check-assets.mjs
```

**Mainnet deploy track still starts at B0 when hardware is ready: connect Ledger,
paste its pubkey into `lib.rs` `EXPECTED_INITIAL_AUTHORITY`, then run launch
preflight.**

```bash
solana-keygen pubkey usb://ledger
# Edit contracts/programs/seek-protocol/src/lib.rs — replace
# `pubkey!("11111111111111111111111111111111")` with the same Ledger pubkey.
grep -A1 EXPECTED_INITIAL_AUTHORITY contracts/programs/seek-protocol/src/lib.rs

cd backend
export AUTHORITY_SIGNER=ledger
export AUTHORITY_LEDGER_PUBKEY=<same Ledger pubkey>
npm run preflight:mainnet -- --offline
```

After B0/B0b, the parallelizable Day-1-hour set is **B1 (keystore) + B5
(publisher wallet) + B6 (assets) + B9 (marketing site)**. See
`tasks/phase-b-execution.md`.

## Open questions (none)

Default remains Ledger cold authority. No open architectural decisions unless the
user wants to override that and accept an interim non-Ledger cold keypair.

## Risks accepted at launch (Phase E)

- Jackpot grinding is mitigated with mission commitment + bounty PDA entropy
  and per-wallet daily caps, but not fully eliminated. Migrate to Switchboard
  VRF when jackpot value justifies the extra on-chain flow.
- Solana JS dependency audit advisories remain until upstream packages publish
  a non-breaking fix; do not run `npm audit fix --force` blindly.

If jackpot value crosses the VRF threshold or upstream Solana packages publish
non-breaking security fixes, revisit Phase E (`tasks/roadmap.md`).

## How to update this file

At session END, before pause:
1. Bump "Last update" date.
2. Update "Current state" with what shipped this session.
3. Update "Where the user paused" with last 3 commit hashes + working-tree status.
4. Update "Next concrete action" — should be a single, specific, executable step.
5. Note any new "Open questions" the user needs to decide.
6. Note any new "Risks accepted" if a known issue was deferred to Phase E.
