---
name: check-seek
description: "Use in the Seek repo whenever the user asks to check Seek, resume the project, verify launch readiness, inspect current status, or find where work left off. This is the first skill to use at session start in /Users/hammer/Desktop/Claude/seek."
---

# check-seek

Produce a tight Seek status briefing and catch drift between docs, memory,
and current code. This exists because prior docs once claimed "complete" and
"CI green" without live verification.

## Scope

Use this skill only for the Seek checkout:

`/Users/hammer/Desktop/Claude/seek`

If the current working directory differs, first confirm the actual repo root
with `pwd` and `git rev-parse --show-toplevel`.

## Read First

Read these files before making launch claims:

1. `CLAUDE.md` - project rules and non-negotiables.
2. `tasks/where-we-are.md` - canonical pickup snapshot.
3. `tasks/roadmap.md` - current phase and launch blockers.
4. `tasks/phase-b-execution.md` - user-gated launch playbook.
5. `tasks/lessons.md` - known failure modes and verification rules.
6. `tasks/audit-2026-08-13-winners.md` - winner-legitimacy audit (on-chain
   forensics: 11.3% completion, no cheating ring, four open anti-farm holes).
7. `tasks/hardening-plan-2026-08-13.md` - staged anti-farm hardening plan.
   SAVED, NOT EXECUTED — an independent re-audit of its file:line touchpoints
   is required before any phase runs. When the operator triggers the
   re-audit, verify the plan's claims against current code and report drift
   in the briefing before recommending execution.
8. Current memory, when available:
   - Codex memory quick pass: search `/Users/hammer/.codex/memories/MEMORY.md`
     for `seek`.
   - Legacy Claude memory is optional and may not exist on this machine:
     `/Users/hammer/.claude/projects/-Users-hammer-Desktop-Claude-seek/memory/`.

Prefer parallel reads. In Codex, use `multi_tool_use.parallel` for independent
file reads and commands.

## Run Health Checks

Run these from the repo root unless a subdirectory is stated:

- `git status --short --branch`
- `git log --oneline -10`
- `gh run list --limit 3`
- `gh run list --branch master --limit 1`
- Backend typecheck: `npx tsc --noEmit --pretty false` in `backend/`
- Mobile typecheck: `npx tsc --noEmit --pretty false` in `mobile/`
- Contract mainnet check: `cargo check --features mainnet --no-default-features`
  in `contracts/`
- Contract tests: `npm test` in `contracts/`

If `gh run list` fails from network sandboxing, rerun it with the normal
approval/escalation path instead of reporting CI as unknown from memory.

## Drift Checks

Flag any drift above the normal briefing:

| Check | Expected |
|---|---|
| Demo residue | `rg -n "addWinnings|DEMO_TARGETS|DEMO_WALLET|DEMO_MODE|useFallbackDemoBounty|isDemoMode|demo mode|demo-mode" mobile/src backend/src` returns no matches. |
| Mission count | `cd backend && node --test -r ts-node/register tests/missions.test.ts` passes, confirming 600 missions and the 140/60, 120/80, 100/100 outdoor/indoor splits. |
| Mainnet init authority | `EXPECTED_INITIAL_AUTHORITY` is still placeholder until the user provides the cold Ledger pubkey; this is a launch blocker, not a code failure. |
| dApp Store assets | `node check-assets.mjs` in `dapp-store-publishing/` should fail until real `icon.png`, `banner.png`, and screenshots exist. |
| Publisher wallet | `dapp-store-publishing/config.yaml` still has `PLACEHOLDER_PUBLISHER_PUBKEY` until B5 is done. |
| Marketing site | top-level `web/` is absent until B9 is built. |
| Redis fail-closed | `backend/src/services/redis.service.ts` should fail closed when `REDIS_URL` is set but Redis is unavailable. |
| Cancel exploit | `cancel_bounty` should accept `Pending` only, not `Submitted`. |
| Reveal/propose timeout | `revealMissionOnChain` and `proposeResolutionOnChain` should use `withTimeout`. |
| Keypair custody | No docs or commands should direct future work to create, store, or fund keypairs in `/tmp`, `/private/tmp`, shell heredocs, terminal scrollback, chat, or any ephemeral path. Generated keypairs must live in durable ignored storage with `0600`, verified pubkey, and backup/drain plan before funding or authority assignment. |

## Report Format

Use this shape:

```markdown
# Seek Status Briefing - YYYY-MM-DD

## Health
- Build:
- Tests:
- CI on master:
- Git:

## Drift Detected
- Only include this section if something unexpected is wrong.

## Where We Are
- Current phase:
- Last session ended:
- Next action:

## Phase B Status
- B0 paste Ledger pubkey:
- B1 keystore:
- B3 Ledger SOL:
- B4 SKR vault:
- B5 publisher wallet:
- B6 dApp Store assets:
- B9 marketing/legal site:

## Recommended Next Move
- One concrete next action.
```

## Rules

- Never claim "CI green" without a fresh `gh run list`.
- Never claim "removed" without a fresh grep.
- Treat memory as a pointer, not proof; verify drift-prone claims against the
  current checkout.
- Do not deploy mainnet or run destructive launch commands from this skill.
- Keep `tasks/where-we-are.md` current if the check changes the state.
- For any keypair, fee payer, publisher wallet, hot wallet, or authority work,
  apply the keypair custody rule before running commands.
