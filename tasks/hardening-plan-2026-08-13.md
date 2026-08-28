# Seek hardening plan — anti-farm + safety-first rollout

**Status (2026-08-28):** SAVED, NOT EXECUTED. The operator wants an
independent re-audit before any of this runs. Basis:
`tasks/audit-2026-08-13-winners.md`. Do not start Phase 1 until the re-audit
confirms the file:line touchpoints below still hold.

Context: the audit found no active cheating ring, but four open holes (sybil
around the wallet-keyed win cap, photo replay, spoofable attestation/EXIF,
broad T1 missions) plus ops risks (24 commits of live production code
unpushed). This plan implements the agreed fixes in phases, each with feature
flags, tests, verification, and an explicit rollback. Design rule throughout:
**no change ships in enforce mode without a shadow/log period or a
zero-behavior-change default.**

Key facts established during planning (file:line in audit note + investigation):
- Mobile v4 client **already sends session proof** on /prepare, /start, /submit
  (`mobile/src/services/session.service.ts:25-73`, attached at
  `api.service.ts:104,164,264`). The flip is a backend env change, not a client
  build — but store-version confirmation is still required.
- Attestation back-fill of GPS/device is **load-bearing** for real users
  (Android GPS EXIF unreliable; `CameraScreen.tsx:60-82,154-171`). Hard EXIF
  enforcement would hard-reject legit players as on-chain LOSSES. So:
  attestation work is hardening + logging, not enforcement.
- Mission text is NOT hashed on-chain (only mission id:
  `solana.service.ts:158-177`). In-place text edits keep ids stable; never
  insert/remove/reorder seeds (positional ids, `missions.ts:693-705`).
- Deploy = rsync source → VPS builds image → `up -d --build api` (single
  replica, brief 502 window). Rollback = git revert + re-rsync. Config flips
  (compose env) need no rebuild. No tagged images — git is the rollback
  mechanism, which is why Phase 0 matters.
- No pixel-decoding dependency in backend today (only exifr). pHash needs one.

---

## Phase 0 — backup precondition (before touching anything)

1. Push `wip/session-proof-rollout` to the private GitHub remote as a backup
   branch (24 commits / +8,965 lines of live production code currently exist
   only on this machine). Requires user confirmation (git mutation).
2. Verify: `git log origin/wip/session-proof-rollout..HEAD` empty.

## Phase 1 — backend-only anti-fraud (one deploy, no client release)

All four land behind safe defaults; deploy together; none changes behavior for
legit players on day one.

### 1a. pHash dedupe on `/submit` — shadow mode first
- New deps: `jimp` + `blockhash-core` (both pure JS — avoids native-build risk
  in the VPS Docker build; sharp is the fallback if perf matters).
- New `backend/src/services/photo-dedupe.service.ts`:
  - Compute 64-bit pHash from `req.file.buffer` (resize 32x32 grayscale via
    jimp → blockhash-core).
  - Global exact replay: `SET seek:phash:{hash} {wallet} NX EX 2592000` (30d),
    matching the `redisConsumeNonce` house pattern (`redis.service.ts:122`).
  - Per-wallet near-dup: Redis list `seek:phash:wallet:{wallet}` (cap 50),
    hamming distance ≤ 5 = suspect.
  - Insertion point: `bounty.routes.ts` between `checkImageSize` pass (~788)
    and `markBountyValidating` (~884), inside the already-held bounty lock.
  - Failure mode: **fail open + warn log** (dedupe is detective; during a
    Redis outage admission already fails closed upstream, so the fraud window
    is nil).
- Env flag `PHASH_DEDUPE_MODE=log|enforce`, default `log`. In log mode:
  record collisions with wallet/bounty/mission, take no action.
- Tests (node:test, in-memory fallback like `wallet-bounty-limit.test.ts`):
  identical re-encode → same hash; cropped/edited → hamming > 5; distinct
  photos → no collision; fail-open on Redis null.

### 1b. Rolling-24h win cap (replaces UTC-day buckets)
- `wallet-bounty-limit.service.ts`: replace day-bucket INCR with sorted set
  `seek:win:rolling:{identity}` — `ZADD nowMs uniqueMember` +
  `ZREMRANGEBYSCORE -inf nowMs-86400000` + `EXPIRE 86400` on record;
  `ZCARD` after same trim on status check (sorted-set precedent exists:
  `RK.finalizerQueue`). In-memory fallback mirrors with `{ wins: number[] }`.
- Call sites unchanged (`/prepare` check ~299-304, record ~967-984). Public
  response shape unchanged (429 + `{ limit, resetAt }`; resetAt = oldest win
  + 24h).
- Known accepted cutover effect: existing day-bucket counters are ignored by
  new code → win counts reset at deploy. Harmless (cap is 2; worst case a
  capped wallet gets 2 extra wins that day).
- Tests: keep existing pure-function style; add cross-midnight case (win at
  23:59 + 00:01 next day still capped — the `4JHm` hole), 25h expiry, exact
  boundary at 24h.

### 1c. Attestation hardening — fill-only-missing + forensics logging
- `attestation.service.ts` `mergeAttestationMetadata`: never overwrite EXIF
  values that are present; only fill missing fields (verify current behavior
  first — audit said "overwrites", the test asserts back-fill; reconcile and
  pin the safe semantics with a test).
- Log (pino, no PII) when attestation supplies fields EXIF lacked, and when
  attestation and EXIF disagree (timestamp > 60s, GPS > ~500m) — builds the
  evidence base for future TEE enforcement without touching legit flows.
- Explicitly do NOT: require EXIF, block self-signed attestation, or change
  the screenshot pre-check. `AttestationResult.confidence` stays out of the
  Claude path (it already is).
- Tests: EXIF-present fields survive merge; missing fields back-fill;
  disagreement produces the expected log call.

### 1d. Chain-scan monitoring script
- `backend/scripts/bounty-scan.mjs` (read-only, public RPC): enumerate
  program accounts, decode Bounty (offsets proven in the audit), print
  created/won/lost/stuck, completion rate (all-time + trailing 7/30d),
  per-wallet win table, cap-surfing flags. This replaces the misleading
  `/api/health/stats` win rate for economic monitoring.

### Phase 1 deploy + verification
- Gate: `npx tsc --noEmit`, full `npm run test:launch-tools`, mission tests,
  `git diff --check`.
- Deploy: rsync + `up -d --build api` per `backend/deploy/vps/README.md`.
- Smoke: `/api/health/ready` 200; one synthetic pHash log-line check; confirm
  429 path unchanged.
- Rollback: `git revert` the phase commits → re-rsync → rebuild. pHash keys
  in Redis are ignored by old code (harmless).
- Soak: 7 days in log mode, review pHash collision logs for false positives
  (legit near-dups, e.g. burst shots). If clean → follow-up flip to
  `enforce` (Phase 1.5, its own 1-line change + smoke). In enforce mode:
  collision = hard reject ("photo already submitted"), counted via a metric
  log line; alert threshold on rate.

## Phase 2 — T1 mission tightening (data-only, no client)

- In-place rewrite of the ~50 broadest T1 descriptions in
  `backend/src/data/missions.ts` (trash bin / shade tree / paved path /
  bench / grass area class) toward context-bound two-cue targets ("a public
  trash bin beside a posted rules sign"). Same array positions → ids stable.
- Constraints enforced by existing tests (`missions.test.ts`): 600 total,
  splits 140/60-120/80-100/100, unique ids+descriptions, "Find " prefix,
  1-8 keywords, banned-term regex, retired-pool minimums.
  `assertMissionPoolShape` also throws at boot — a bad edit fails fast.
- Fairness caveat: a mission revealed pre-deploy but submitted post-deploy is
  judged against new text. Mitigate: deploy at a low-activity window (check
  active bounties with the Phase 1d scan first; typical actives ≈ 4).
- Verification: mission tests + boot smoke + 7-day win-rate check vs the
  8-12% band using bounty-scan. Target: August's 11.7% drifts back under 11%;
  if it drops under 8%, loosen 10-15 of the rewrites.

## Phase 3 — session-proof flip + explicit thresholds (needs store check)

Preconditions:
1. Confirm which store release carries the v4 session flow (v1.0.5 or v1.0.6
   — the rollout doc says v1.0.5, branch history suggests v1.0.6; verify via
   publisher portal / installed app), and that live traffic is on it
   (check `clientProtocolVersion` in backend logs).
2. Backend grandfathering tweak first: at `/submit`, require proof only when
   `bounty.sessionId` is set (drop the `flag ||` at `bounty.routes.ts:799-803`)
   so in-flight bounties from pre-flip clients can still finish. Tiny change,
   its own test.

Flip:
3. `compose.yaml:12` → `REQUIRE_BOUNTY_SESSION_PROOF: "true"`,
   `MIN_SESSION_CLIENT_PROTOCOL_VERSION=3`, `up -d api` (no rebuild).
   SGT becomes mandatory → win cap keyed by soulbound mint → sybil hole
   closes.
4. Thresholds: SGT bonus now applies to everyone (effective 0.83/0.87/0.90).
   Zero-behavior-change move: write those as explicit
   `TIER_CONFIDENCE_THRESHOLDS` and remove the bonus code path
   (`bounty.routes.ts:930-942`, `SGT_BONUS_CONFIDENCE_REDUCTION`). No silent
   change; tune later with win-rate + complaint data. (Keeping the
   complaint-driven leniency — this preserves it exactly.)
5. Monitor 24-72h: 401/426 rates (old clients), prepare volume, win rate.
6. Rollback: compose env back to `"false"` + `up -d api` — under a minute, no
   rebuild. Threshold/code revert = standard git rollback.

## Phase 4 — follow-ups (scoped, scheduled after 1-3 soak)

- Resubmit-on-reject: on Claude reject with time left, don't resolve loss
  immediately; allow 1-2 fresh photos on the same bounty. Backend flow change
  + mobile UX; the real fix for the false-negative complaint. Design before
  code.
- Stuck-bounty reconciliation (2 Submitted + 14 Pending + 1 ChallengeLost;
  operator approval required for any signing).
- Hygiene batch: AGENTS.md economics + Railway→VPS refresh, drop `stash@{0}`
  (after diff-vs-HEAD confirms nothing unique), delete `backend/railway.json`,
  gate `NGROK_URL` behind `__DEV__`, remove dead `MIN_CONFIDENCE`/`LINKS`
  from mobile config, README tier blurb.

## Explicit non-goals

- No contract changes (no redeploy, no Singularity odds change, no
  `dispute_bounty` removal).
- No global difficulty increase; T2/T3 untouched.
- No EXIF/attestation enforcement against legit flows (deferred to TEE).
- No changes to the 8-12% economic targets or tier amounts.
