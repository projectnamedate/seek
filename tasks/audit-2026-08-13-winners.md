# Seek audit 2026-08-13 — winner legitimacy + gaps (notes only)

Read-only audit. No code, config, or on-chain changes were made.

Method: 3 parallel read-only investigations — (1) full on-chain bounty
forensics via `getProgramAccounts` on mainnet (all 366 bounties, count
cross-checked against `GlobalState.total_bounties_created` = 366, so the scan
is provably complete), (2) code audit of the win-validation/anti-abuse
pipeline, (3) repo-wide drift/dead-code/simplification sweep. Key claims
spot-verified against live files.

---

## 1. Are the winners legit? — Verdict

**No evidence of a new exploit or coordinated cheating ring.** On-chain
economics are healthy. What exists is *legitimate cap-optimization*: a few
unrelated wallets run fast Tier-1 sessions and stop at exactly the 2-wins/day
cap, and broad T1 missions make that easy. Win rate is drifting up.

### On-chain ground truth (366 bounties, full history)

- 39 won / 307 lost / 3 cancelled; 17 stuck non-terminal (14 Pending,
  2 Submitted, 1 ChallengeLost)
- Completion rate (terminal only): **11.3% all-time**, 9.4% since Jul 12,
  **11.7% since Aug 1** — inside the 8–12% band but trending toward the 15%
  hard ceiling
- House P&L: +209,000 SKR entries, −45,000 SKR payouts → **+164,000 SKR net**
- Singularity wins: **0 ever**
- 269 unique player wallets

### Winners of note

- `52vzF8A1…iF6e` — heaviest player (20 hunts, 5 wins, −6,500 SKR lifetime,
  first bounty on launch day, legacy v1 entries). Almost certainly the
  operator/tester wallet — **confirm**. Also owns the only permanently stuck
  `ChallengeLost` (May 17, 1,000 SKR, never finalized for 3 months).
- `3vw6SovW…2Cvv` — known abuser; on-chain record matches the incident report
  exactly (6 T1 hunts in 12.6 min, 5 wins, +2,000 SKR). Already denylisted.
- `Dfui8Dph…BgU6` — 7 hunts, 4 wins (57%), +500 SKR. Watch.
- `4JHm8XDZ…tg55` — 5 hunts, 3 wins (60%). Two wins 2.4 min apart Aug 12,
  another Aug 13 16:45 → **3 wins in 21h20m**. Legal under the UTC-day cap but
  clearly playing the cap boundary.
- Cap-surfing pattern: `FUdvKgLC…ryeX` (2 wins 2.2 min apart Aug 10),
  `Fb8ydm2u…CwLrx` (W,L,W in 6.9 min Aug 10) — all stop at exactly 2/day.
- No sybil funding link found among recent winners (shallow 50-tx scan;
  distinct old wallets / distinct funders). Looks like several real users who
  independently found the same cheap T1 strategy.
- Median accept→resolution is **85s for wins, 75s for losses** (T1 timer is
  180s). Fast rounds are the norm on both outcomes → the 180s timer is not a
  difficulty lever; mission breadth is the only one in force.

---

## 2. How someone COULD cheat today (code audit, ranked)

Structural headline: every metadata control (EXIF, attestation, timestamps,
GPS) is client-spoofable, so the entire anti-fraud burden is Claude Vision +
the win cap — **and the cap is keyed by an identity the player can opt out
of.**

1. **Sybil around the 2-win/day cap — OPEN (biggest hole).** SGT is not
   required to play: `REQUIRE_BOUNTY_SESSION_PROOF: "false"` in
   `backend/deploy/vps/compose.yaml:12` (verified). Cap key =
   `sgt:<mint>` if SGT present, else `wallet:<wallet>`
   (`wallet-bounty-limit.service.ts:20-25`, verified). Fresh wallet = fresh
   2-win/day allowance; wallets are free.
2. **Photo replay — OPEN.** No perceptual hash / cross-submission dedupe
   anywhere. The same genuine photo of a common T1 target can be resubmitted
   forever, by anyone.
3. **EXIF/attestation spoofing — OPEN.** EXIF is unauthenticated
   (`exif.service.ts`); the attestation path is fully self-signed
   (`attestation.service.ts:198-225` only checks sha256 of the attacker's own
   image) and `mergeAttestationMetadata` *overwrites* EXIF with payload
   values. Crafted attestation JSON passes all pre-checks on any image.
4. **AI-generated/screen photos — PARTIAL.** Only the Claude prompt defends
   (thresholds 0.88/0.92/0.95). SGT holders get −0.05 threshold (effective
   0.83/0.87/0.90) — makes borderline fakes easier.
5. **Broad T1 mission farming — PARTIAL.** T1 pool still has ~200 broad
   targets ("public trash bin", "shade tree", "public bench"). A player
   stationed in a park passes legitimately — the known farmer's exact vector.
6. **Griefing side finding:** unauthenticated `/prepare` burns any target
   wallet's 20/day reservation — anyone can DoS a player's daily allowance.
7. Closed: timer gaming (server-side timestamps + expiry sweeper), Claude
   outage fail-open (fail-closed → loss), Redis outage security downgrade
   (fail-closed), prompt injection (best-effort hardened), direct API bypass
   of validation (impossible — resolution is server-side).
8. Inherent residual: the hot key can sign `propose_resolution(true)` for any
   Submitted bounty — insider/compromise path, contained by design.

**Most likely explanation if wins are being farmed right now:** sybil wallets
+ real photos of broad T1 targets (vectors 1+5), possibly aided by a small
library of reused/spoofed photos (2+3).

**Highest-leverage fixes (documented, NOT executed):** flip
`REQUIRE_BOUNTY_SESSION_PROOF=true` (SGT mandatory → win cap soulbound) and
add Redis-backed perceptual-hash dedupe on `/submit`. Those close vectors
1, 2, and 3's reuse path. Also consider rolling-24h win cap instead of
UTC-day (the `4JHm` 3-wins-in-21h case) and tightening T1 mission breadth.

---

## 3. Non-security gaps (repo sweep, prioritized)

- **P1 — ~2.5 months of live production code exists only on this machine.**
  `wip/session-proof-rollout` is 24 commits / 102 files / +8,965 lines ahead
  of `origin/master`, unpushed, including the VPS migration and v1.0.6 hotfix
  currently running in production. No off-machine backup.
- **P1 — AGENTS.md economic north-star is stale:** still describes
  1000/3000/5000 tiers and the ~58k SKR vault; live code is 500/1000/2000
  (`lib.rs:36-45`, `types/index.ts:15-26`) and house is 55,238 SKR. Every
  agent session reads this first — it will mislead tuning decisions.
- **P2 — Railway references linger** in AGENTS.md (5 places), README.md:85
  (claims legacy tiers "currently live"), roadmap.md header (2 releases
  stale), `backend/railway.json` still exists.
- **P2 — `stash@{0}`** (May 30, pre-rebase session-proof WIP, ~551 lines)
  likely superseded by committed work; a future `stash pop` would resurrect
  old code.
- **P2 — mobile config hazards:** `GAME_CONFIG.MIN_CONFIDENCE = 0.70` is dead
  and contradicts real thresholds; `NGROK_URL` overrides the prod URL in ALL
  builds including release (`mobile/src/config/index.ts:4-23`) — flagged in
  the April audit, never remediated. `LINKS` block dead + wrong repo URL.
- **P3 — simplifications:** dual in-memory+Redis write paths in every
  stateful service; per-key `setTimeout` deletion timers where Redis TTL
  suffices; contract `dispute_bounty` has no caller (keep `resolve_dispute`);
  backend package.json version still 0.1.0; uncommitted AGENTS.md edit + 4
  checkpoint files dirtying git status.
- **Backend stats endpoint is not representative:**
  `/api/health/stats` reports "winRate 40%" over a 14-bounty slice vs true
  11.3% on-chain. Do not use it for economic monitoring.
- **Hygiene:** 2 stuck `Submitted` bounties the backend never resolved (Jul
  21/24, ~1,000 SKR player entries in limbo — expiry sweeper only handles
  Pending); 12 stale Pending bounties (refundable by players via
  `cancel_bounty`); 16 legacy active accounts still unreconciled (known).
- Still-open known infra gaps (unchanged): no encrypted off-host Redis
  backup, Sentry disabled.

---

## Suggested follow-ups (not started)

1. Decide on the anti-farm package: session-proof flip, pHash dedupe,
   rolling-24h win cap, T1 tightening.
2. Confirm `52vzF8A1…iF6e` is the operator wallet; finalize or remediate its
   stuck May 17 `ChallengeLost`.
3. Push `wip/session-proof-rollout` to a private remote (single-copy risk).
4. Reconcile the 16 legacy on-chain accounts + 2 stuck Submitted bounties.
5. Refresh AGENTS.md economics/Railway references; drop stale stash.
6. Watch `Dfui8Dph…BgU6` and `4JHm8XDZ…tg55` as they accumulate rounds.
