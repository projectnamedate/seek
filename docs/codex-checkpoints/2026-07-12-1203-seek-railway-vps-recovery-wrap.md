# Seek Railway-to-VPS recovery checkpoint — 2026-07-12 12:03 PDT

## Status

The production outage is repaired without a paid Railway plan. Seek's API and
dedicated Redis now run healthy on the existing Helsinki Mythx VPS, Caddy has a
valid certificate for `api.seek.mythx.art`, and authoritative DNS points that
hostname to `204.168.242.220`. Some client/Google anycast caches were still
finishing the old 30-minute Railway CNAME TTL at wrap-up.

## Goal

Audit why users could not play, restore the production game path without adding
a Railway bill, preserve hot-authority custody, and leave a reproducible deploy
and handoff.

## Completed

- Proved Railway's expired trial removed both active deployments while leaving
  the project, domains, variables, and Redis volume visible.
- Migrated the validated compatibility backend to `/opt/seek-api` on the Mythx
  VPS with a dedicated persistent Redis container.
- Changed `api.seek.mythx.art` from Railway CNAME to VPS A record and obtained
  a Let's Encrypt certificate through Caddy.
- Fixed the Docker healthcheck false negative by using `127.0.0.1`.
- Preserved the existing hot authority in durable ignored local storage and the
  root-owned VPS env, verified to the expected public key, with no temp paths.
- Documented the new VPS deploy path and current incident state.

## Current State

- Repo: `/Users/hammer/Desktop/vibe/seek`
- Branch: `wip/session-proof-rollout`, no upstream; do not push without explicit
  operator approval.
- Existing stash remains untouched: `stash@{0}` from 2026-05-30.
- VPS: `seek-api` and `seek-redis` containers healthy; API binds only
  `127.0.0.1:3001`; Redis is isolated on the Compose network.
- Strict bounty session enforcement remains explicitly false for v1.0.5
  compatibility.
- Repo changes from this recovery are intended for a local checkpoint commit.
  The pre-existing `AGENTS.md` end-session-sweep hunk is user WIP and must stay
  uncommitted unless separately approved.

## Decisions

- Operator: "i dont want to pay for this" — Railway is retired, not upgraded.
- Reuse the existing Mythx VPS at no additional platform cost.
- Do not sign live-money recovery transactions during infrastructure repair.
- Let remaining DNS caches expire naturally once the service was proven healthy.

## Changed Files

- `backend/Dockerfile` — reliable loopback healthcheck.
- `backend/deploy/vps/compose.yaml` — API plus persistent Redis runtime.
- `backend/deploy/vps/Caddyfile.seek` — production reverse proxy host.
- `backend/deploy/vps/README.md` — deploy and verification runbook.
- `AGENTS.md` — current backend deploy target; separate pre-existing wrap rule
  remains intentional user WIP.
- `tasks/where-we-are.md`, `tasks/todo.md` — incident truth and next actions.

## Verification

- Mandatory `check-seek` startup pass completed.
- Backend/mobile typechecks passed.
- Contract mainnet check passed with known Anchor cfg warnings.
- Contract tests: 25/25; mission tests: 6/6; backend launch tools: 56/56.
- dApp Store assets passed; `git diff --check` passed.
- VPS Compose config and source checksum parity passed.
- Both containers report healthy.
- Public readiness from the VPS returns `ready:true` with RPC, program, and
  Redis OK; session challenge passes with enforcement false; known blocked
  wallet still returns 403.
- No post-migration paid Seeker hunt was run because that would spend 500 SKR.

## Risks / Open Items

- One expired Pending bounty from 2026-07-05 is player-cancellable; one older
  `ChallengeLost` awaits permissionless finalization. Any signing requires
  explicit operator approval.
- Railway Redis contents were not exportable on the free plan, so new Redis
  state began empty. On-chain state remains authoritative.
- Add and restore-test an encrypted off-host backup for the VPS Redis AOF.
- Sentry remains disabled because no DSN was present.
- Run one store-installed Seeker smoke after local DNS caches clear.

## Resume Prompt

Run `/check-seek` first. Verify `api.seek.mythx.art` resolves only to
`204.168.242.220`, check `/api/health/ready`, and inspect both `/opt/seek-api`
containers. Then run one explicitly approved 500 SKR store-installed Seeker
smoke. Do not finalize the old `ChallengeLost` bounty or change session-proof
enforcement without separate operator approval. Add a secure off-host Redis
backup after the smoke.
