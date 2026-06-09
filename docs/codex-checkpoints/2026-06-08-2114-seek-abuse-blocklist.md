# Seek Abuse Blocklist Checkpoint - 2026-06-08 21:14 ET

## Status
The reported cheater wallet is blocked in live production, the known soulbound
SGT mint is blocked, and the pushed route-level regression tests cover the
entry gates. No live backend or on-chain state remains that can pay this wallet
again through the normal Seek flow.

## Goal
Verify and harden the emergency block for wallet
`Dfui8Dph4AKDVgzW5deynTvJN4n3UPvam3Sb4aH7BgU6` after the user reported it
cheated another game and had been expected to be blocked already.

## Completed
- Confirmed the original miss: blocklist code existed only in unreleased
  session-proof WIP, not the Railway production backend.
- Deployed narrow backend hotfix to Railway production deployment
  `e3b9b90b-6100-41ff-aa08-09f0f95bf89e`.
- Code-seeded wallet block:
  `Dfui8Dph4AKDVgzW5deynTvJN4n3UPvam3Sb4aH7BgU6`.
- Code-seeded SGT mint block:
  `B1fHfkVLjnqCih7xcN7gDyDfu7eR2PtZxzQvZiupPPDH`.
- Added route-level regression tests covering `/api/bounty/prepare` and
  `/api/bounty/start` denial for the blocked wallet.
- Pushed runtime/test commits through `4b40ddf` before this closeout checkpoint.

## Current State
- Audit worktree:
  `/Users/hammer/.config/superpowers/worktrees/seek/hotfix-block-cheat-wallet-2026-06-08`.
- Branch: `hotfix/block-cheat-wallet-2026-06-08`, tracking `origin/master`.
- Audit worktree status: clean.
- Main checkout `/Users/hammer/Desktop/Claude/seek` remains dirty with unrelated
  session-proof/grant WIP. Do not mix that WIP into this hotfix without review.
- Existing stash: `stash@{0}: On master: wip session-proof before ai hotfix rebase 2026-05-30`.
- Railway `seek-backend` is online at `https://api.seek.mythx.art`.

## Decisions
- Use a narrow production hotfix rather than deploying the broader
  session-proof rollout.
- Block both the wallet and SGT mint. The user clarified SGTs are soulbound,
  so this materially limits bypass risk.
- Leave the contract unchanged. The backend hot authority remains the gate for
  mission reveal and successful resolution; the contract itself has no denylist.

## Changed Files
- `backend/src/services/bounty-blocklist.service.ts` - code-seeded wallet/SGT
  denylist and env override parsing.
- `backend/src/routes/bounty.routes.ts` - denylist checks on prepare, start,
  and submit paths.
- `backend/src/config/index.ts`, `backend/.env.example` - optional denylist env
  variables.
- `backend/tests/bounty-blocklist.test.ts` - helper coverage.
- `backend/tests/bounty-blocklist-routes.test.ts` - route-gate regression
  coverage.
- `backend/package.json` - includes new tests in `test:launch-tools`.
- `tasks/where-we-are.md`, `tasks/lessons.md` - incident state and rule update.

## Verification
- Live `/api/bounty/prepare` for blocked wallet: HTTP `403`.
- Live `/api/bounty/start` for blocked wallet: HTTP `403`.
- Live `/api/bounty/player/<blocked>`: no active bounty.
- Live `/api/health/ready`: `ready: true` with RPC/program/Redis OK.
- Live `/api/health/stats`: pending `0`, validating `0`, finalizer queue `0`.
- On-chain scan for the blocked wallet: 7 historical bounties, all final
  (`4 Won`, `3 Lost`), zero non-final or finalizable states.
- Backend `npx tsc --noEmit --pretty false`: PASS.
- Backend `npm run test:launch-tools` with local test env: PASS 50/50.
- Mobile `npx tsc --noEmit --pretty false`: PASS.
- Contracts `cargo check --features mainnet --no-default-features`: PASS with
  known Anchor cfg warnings.
- Contracts `npm test`: PASS 25/25.
- GitHub CI on `master` run `27176793636`: success.

## Risks / Open Items
- A different wallet with a different Seeker/SGT is not cryptographically tied
  to this human. The known wallet and known SGT are blocked.
- The on-chain program still accepts raw `accept_bounty` transactions from any
  wallet while unpaused. Without backend reveal/propose, raw accepts cannot
  become a new backend-awarded win payout.
- Main checkout contains unrelated WIP; keep future hotfixes isolated unless
  deliberately merging the session-proof branch.

## Resume Prompt
Continue from the clean hotfix state in
`/Users/hammer/.config/superpowers/worktrees/seek/hotfix-block-cheat-wallet-2026-06-08`.
Verify `git status`, `gh run list --branch master --limit 1`, and live
`/api/bounty/prepare` for the blocked wallet before making any new claim. Then
resume the v1.0.4 store-review path or the grant/application work as directed.
