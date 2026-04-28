# Where we are — Seek

> **Point-in-time snapshot.** Updated at the end of each session. The
> first thing `check-seek` reads. Keep it ≤80 lines so it stays fast to
> scan.

## Last update
**2026-04-27** — end of B9 remediation + drift-prevention guardrails session.

## Current state
- ✅ All 5 CRIT + 9 HIGH + 6 MED items from B8 closed (2026-04-23)
- ✅ All 15 new CRIT/HIGH items from B9 re-audit closed (2026-04-27)
- ✅ CI green on master for the first time (run `25032339240` then `~`)
- ✅ Mission pool ~90% calibrated to 8-12% target win rate
- ✅ dApp Store config.yaml mainnet-correct (testing notes, publisher pubkey runbook)
- ✅ DEPLOY_MAINNET.md step 1 includes EXPECTED_INITIAL_AUTHORITY paste

## Where the user paused
End of B9 remediation + 5 drift-prevention guardrails shipped. Last commits:
- (pending: drift guardrails commit)
- `18171d7` docs: add Phase B execution playbook
- `436f2cd` ci: use committed backend IDL
- `fe92e18` feat(B9): pre-mainnet re-audit + remediation — 15 CRIT/HIGH closed

Drift guardrails active:
- `/check-seek` skill at `~/.claude/skills/check-seek/SKILL.md` — invoke at session start.
- This file (`tasks/where-we-are.md`) is the canonical session-resume snapshot.
- CLAUDE.md "Session-start protocol" mandates `/check-seek` first.
- Global SessionStart hook prints git+CI status when entering any git repo.
- Global Stop hook warns on uncommitted changes after every turn.
- `tasks/lessons.md` § "Verify before claim" codifies the no-propagate-claims rule.

## Next concrete action

**B0 — paste cold Ledger pubkey into `lib.rs` `EXPECTED_INITIAL_AUTHORITY` constant.** 1 minute, unblocks mainnet `anchor build`.

```bash
solana-keygen pubkey usb://ledger
# Edit contracts/programs/seek-protocol/src/lib.rs — replace
# `pubkey!("11111111111111111111111111111111")` with the Ledger pubkey.
grep -A1 EXPECTED_INITIAL_AUTHORITY contracts/programs/seek-protocol/src/lib.rs
```

After B0, the parallelizable Day-1-hour set is **B0 + B1 (keystore) + B5 (publisher wallet) + B9 (marketing site)**. See `tasks/phase-b-execution.md`.

## Open questions (none)

User has approved every fix in B9. No open architectural decisions.

## Risks accepted at launch (Phase E)

- Jackpot multi-bounty grinding — not exploitable until jackpot > $50k. Migrate to Switchboard VRF then.
- `set_treasury` no owner validation — manual cold-Ledger double-check at rotation time.
- `activeBounties` partly in-memory — single-replica Railway launch, restart bypasses `expireAndResolveOldBounties` until next bounty.
- Rate limiters in-memory store — single-replica.

If you scale to multi-replica or jackpot crosses threshold, revisit Phase E (`tasks/roadmap.md`).

## How to update this file

At session END, before pause:
1. Bump "Last update" date.
2. Update "Current state" with what shipped this session.
3. Update "Where the user paused" with last 3 commit hashes + working-tree status.
4. Update "Next concrete action" — should be a single, specific, executable step.
5. Note any new "Open questions" the user needs to decide.
6. Note any new "Risks accepted" if a known issue was deferred to Phase E.
