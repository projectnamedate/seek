# Where we are - Seek - 2026-07-28 - paid mission recovery fix in review

## Current State

- The paid-mission handoff incident is contained and fixed. The operator
  already refunded the ten identified accounts; this session did not issue or
  duplicate refunds and did not sign cancel/resolve/finalize transactions for
  those accounts.
- Production backend repair is live on the Helsinki VPS. `/start` now recovers
  exact paid PDAs without requiring another transaction, prepared mission
  secrets persist for 24 hours, resolution/finalization reconcile ambiguous
  RPC outcomes, and stale `validating` records with a persisted outcome resume
  safely. Deployed source hashes match local and `/opt/seek-api/.env` remained
  unchanged at mode `0600`.
- Paid starts are open so the currently live v1.0.5 remains usable while
  v1.0.6 is reviewed. At the operator's direction, the incident pause key was
  deleted and the API restarted to clear its cached copy. A no-payment request
  using v1.0.5's exact client protocol version `3` returned HTTP `200` from
  `/prepare`; Redis confirms the pause key is absent. No transaction was built,
  signed, or sent.
- v1.0.5 benefits from the repaired idempotent backend but cannot persist an
  ambiguous MWA handoff across a full app crash. The operator explicitly
  accepted that residual risk and will personally handle any exceptional
  refunds until v1.0.6 replaces it. v1.0.6 removes that device-side gap.
- Final read-only on-chain state after deploy is unchanged: 218 total bounties,
  comprising 183 Lost, 25 Won, 7 Pending, 2 Submitted, and 1 ChallengeLost.
  `active_bounty_count=10` and active payout liability is `13,000 SKR`.
- Mobile v1.0.6 / versionCode `7` durably saves the expected PDA, prepare ID,
  recent blockhash, and last-valid block height before opening MWA. App restart,
  missing wallet signature return, delayed RPC indexing, and lost `/start`
  responses all resume the same payment. A second payment is allowed only
  after chain evidence proves atomic failure or expiry without landing.
- The signed release APK is
  `mobile/android/app/build/outputs/apk/release/app-release.apk`, SHA-256
  `497f54cf14c7e4d5a99181ea104b23d96198155ecca228414ee39e6fae7d9ae6`.
  Package is `app.seek.mobile`, versionName `1.0.6`, versionCode `7`; signer
  certificate SHA-256 remains
  `c50d2751f3ede1c7e3e04aab312f497783e79b95b28a1835ee23b668d80af17c`.
- v1.0.6 is submitted to Solana Mobile dApp Store review:
  ticket `325451334378`, release mint
  `FtooC9RXFo8VYheHiyLXcvRxCRCYHqGKqh3ShVuPpmYn`, ingestion session
  `397833df-6aa5-42bd-9722-edfe16c2bf8c`, release ID
  `2b144155-a0d6-4ef4-8ab6-2da5c9161c2a`, publication session
  `96d98e90-ce7c-41c4-94f5-0b8bbd9a16e3`, and attestation request
  `82554495546019744436956909714113`. Publisher balance after submission is
  `0.03522762 SOL`.
- Validation PASS: backend launch suite 68/68; backend build/typecheck; mobile
  typecheck; contract tests 25/25; mainnet cargo check with known Anchor cfg
  warnings; dApp assets; signed release assembly; APK package/signature;
  `git diff --check`; live source parity, readiness, protocol-v3 admission,
  stats, logs, and unchanged chain counts.
- Latest three commits before this incident closeout are `d990303`,
  `4c65999`, and `d23bf3d`. The branch has no upstream and remains local-only.
  The pre-existing user-owned `AGENTS.md` change, three generated Codex
  checkpoints, and `stash@{0}` remain preserved and intentionally uncommitted.
- Incident implementation is committed locally as `5acae4c`. The required
  AgentMemory project/session closeout is pushed separately as vault commit
  `ecb7930`.
- Next concrete action: watch ticket `325451334378`. Once the portal shows
  v1.0.6 live, install/update from the dApp Store, verify versionCode `7`, and
  run a launch/connect/mission smoke on the Seeker. Paid starts are already
  admitted; do not recreate the incident pause unless new loss evidence or
  settlement lag requires containment.

---

# Historical state - 2026-07-21 - repeat-win abuse contained on VPS

## Current State

- 2026-07-21 abuse response is live. Wallet
  `3vw6SovWwMAWJeKEqeFuDG2JndEnNp3o7TqDWL4W2Cvv` and its soulbound SGT
  `6PbD4qYLYG3n5K3dEaXMZjbhX2Jq44V1uLdvkxdVj1vV` are code-seeded in the
  production bounty denylist. Live `/api/bounty/prepare` and
  `/api/bounty/start` both return HTTP `403` with the generic eligibility
  denial. The block follows the SGT as well as the current wallet.
- Forensics found six Easy hunts in 13 minutes with five wins (83.3%). The
  five wins explain the VPS cohort's completion-rate spike; excluding this
  session, the observed cohort was 1 win in 16 hunts (6.25%). Photos were
  distinct, geographically coherent captures around a Tbilisi
  university/store area. Evidence supports rapid location farming of broad
  Easy targets, not duplicate-image replay. Standard camera attestation was
  present but is low-confidence and non-cryptographic until Seeker TEE support
  exists.
- A Redis-backed streak breaker now allows at most two wins per UTC day per
  identity, keyed by soulbound SGT when available and wallet otherwise. Both
  `/prepare` and `/start` fail with HTTP `429` after the cap; successful
  resolutions record the win. VPS Compose pins
  `MAX_WINS_PER_IDENTITY_PER_DAY=2`. A live synthetic cap probe returned `429`
  and its temporary Redis key was deleted afterward.
- Production is healthy after deploy and drift cleanup: both containers are
  healthy; readiness is HTTP `200` with RPC/program/Redis OK; pending `0`,
  validating `0`, finalizer queue `0`; house `87,888 SKR`; Singularity
  `12,600 SKR`. The latest sampled historical win rate is `27.3%` (6 wins,
  16 losses) because it
  includes the already-settled abuse wins; the new cap affects future hunts.
- One pre-existing Redis bounty was stuck locally as `validating`, but its
  on-chain PDA was already closed. The orphaned active/player/mission indexes
  were removed and the API restarted; no signing or fund movement occurred.
- Validation: backend launch-tool suite PASS `59/59`; backend typecheck PASS;
  `git diff --check` PASS; Compose validation PASS; deployed runtime/config
  SHA-256 hashes match local. The route regression was observed RED (`500`)
  before the streak breaker and GREEN (`429`) after implementation.
- Latest relevant local commits before this closeout are `4c65999` (abuse
  response handoff), `d23bf3d` (wallet/SGT block plus daily win cap), and
  `a0ab2f2` (VPS recovery handoff). The branch still has no upstream and
  remains intentionally unpushed; the pre-existing user-owned `AGENTS.md`
  hunk and `stash@{0}` remain untouched.
- Next concrete action: after 24 hours of real traffic, inspect production
  `403`/`429` counts and `seek:win:daily:*` counters, then compare the new
  completion rate against the 8-12% target before changing mission difficulty
  or the two-win cap.
- 2026-07-12 production incident: `api.seek.mythx.art` returned Railway `404
  Application not found` because the Railway free trial expired and Railway
  removed the active `seek-backend` and Redis deployments. The project,
  variables, custom domain, and Redis volume remained, but Railway refused any
  redeploy until a paid plan was selected. The operator explicitly chose not to
  pay Railway.
- Backend and Redis are now running at no new platform cost on the existing
  Helsinki Mythx VPS (`204.168.242.220`) under `/opt/seek-api`. Runtime is the
  tracked `backend/deploy/vps/compose.yaml`: a dedicated `seek-api` container on
  `127.0.0.1:3001`, a dedicated persistent `seek-redis` container, and Caddy for
  `api.seek.mythx.art`. Both containers report healthy. Caddy configuration was
  backed up before the new host block, validated, reloaded, and obtained a
  Let's Encrypt certificate after DNS changed from the Railway CNAME to an A
  record for the VPS.
- VPS readiness PASS: `/api/health/ready` reports RPC, deployed program, and
  Redis all OK. Forced-origin production checks PASS for `/api/health`,
  `/api/health/ready`, `/api/health/stats`, POST `/api/session/challenge`, input
  validation, and the known blocked-wallet denial. Session enforcement remains
  explicitly off for compatibility (`REQUIRE_BOUNTY_SESSION_PROOF=false`).
- DNS propagation is mixed only in stale caches. Authoritative Namecheap DNS,
  Cloudflare, Quad9, and the VPS resolver serve `204.168.242.220`; an unforced
  public HTTPS readiness request from the VPS returns `ready:true`. Some Google
  anycast nodes and this Mac's OS cache still serve the removed Railway CNAME
  with roughly 23 minutes of the old TTL remaining. Do not call propagation
  universal until those caches expire.
- Railway Redis data cannot be exported without reactivating a paid deployment,
  so the new Redis starts clean. Current on-chain truth is 92 created, 15 won,
  75 lost, one `Pending` bounty from 2026-07-05, and one older
  `ChallengeLost` awaiting permissionless finalization. The Pending player can
  cancel after the expiry grace period. Finalizing the old loss requires a
  live signing transaction and must not be done without explicit operator
  approval.
- The dedicated VPS Redis persists through a Docker volume and AOF, but it does
  not yet have an encrypted off-host backup. Treat that as the main remaining
  infrastructure-resilience warning because mission secrets are required to
  resolve accepted bounties after a host loss. Sentry is also disabled because
  no `SENTRY_DSN` was present in the Railway environment.
- Existing hot authority custody was preserved without exposing or regenerating
  a key. Durable local backup:
  `backend/.secrets/solana/seek-hot-authority-railway-backup.env`; VPS runtime:
  `/opt/seek-api/.env`. Both are mode `0600`; the containing local secrets
  directory is mode `0700`; both derive the expected hot-authority pubkey
  `Gm6x8CZU7SQFVVHx2VnCQGteqT8gYnHFgEmdr3eqGdLk`. Railway remains a secondary
  recovery source while the project exists. No temp path was used.
- Validation for the incident repair: backend typecheck PASS; mobile typecheck
  PASS; contract mainnet check PASS with known Anchor cfg warnings; contract
  tests PASS 25/25; mission tests PASS 6/6; backend launch-tool tests PASS
  56/56; dApp Store assets PASS; Compose config PASS; `git diff --check` PASS.
- Latest recovery/product commits before this handoff note are `d4833fe`
  (Railway-to-VPS recovery), `ea96f1c` (shared-memory pointer), and `37148b2`
  (v1.0.5 store-review checkpoint). They remain local-only on the no-upstream
  WIP branch.
- Next concrete action: after DNS caches finish expiring, run one store-installed
  Seeker smoke through the VPS backend. Then add an encrypted off-host Redis
  backup and separately decide whether to approve permissionless finalization
  of the old `ChallengeLost` bounty.
- 2026-06-11 14:04 EDT release status: v1.0.5 / versionCode `6` was submitted
  to Solana Mobile dApp Store review after a successful Seeker smoke. Ticket
  ID is `314741840579`; release mint
  `2oMPtiGumKGVsvyK2NBe2GXcoKDskgRoMsUUPCa9mb4L`; collection mint
  `4PdmCnEsoUCYMgDAw6X8KFjX7nJHKoVAke8zaAYyjpr1`; ingestion session
  `393e6329-4a02-43a9-9471-691684350fc9`; release ID
  `3ec1276d-b3a3-48cd-a911-85d4dcb7fb5b`; publication session
  `e1424d63-6a78-4cca-b178-8952c58cb488`; attestation request ID
  `32557393368506399883497423818849`; idempotency key
  `seek-update-1.0.5-v6-20260611`.
- The final release-signed APK is at
  `mobile/android/app/build/outputs/apk/release/app-release.apk`. Verification:
  package `app.seek.mobile`, versionName `1.0.5`, versionCode `6`, APK SHA-256
  `7a867ac83852d44909b319d346279d73afcb65cd50f4d681ef808deaff8e4c72`, signer
  certificate `CN=Seek, OU=Mobile, O=Projectnamedate LLC, L=Miami, ST=Florida,
  C=US`, signer SHA-256
  `c50d2751f3ede1c7e3e04aab312f497783e79b95b28a1835ee23b668d80af17c`.
  The same APK was reinstalled on Seeker device `SM02G4061996755`.
- Seeker smoke PASS on the installed v1.0.5 APK: wallet displayed as
  `hammathyme.skr`; Easy hunt started with a 500 SKR entry; the session path
  created the off-chain bounty session, then one on-chain `accept_bounty_v2`
  approval started the paid hunt; mission revealed as `PERMIT BOARD`; photo
  submit did not ask for another wallet prompt; validation/finalization
  completed as a loss. Final live stats: pending `0`, validating `0`, won `0`,
  lost `1`, finalizer queue `0`, house `78,638 SKR`, Singularity `9,100 SKR`.
  Tester balance moved from `753.024 $SKR` to `253.024 $SKR`, matching the
  500 SKR Easy entry loss.
- User corrected the loss-result copy during smoke. The submitted build now
  says `MISSION FAILED` instead of `MISSION MISSED`; the how-to splash holds
  for `4000ms` instead of `2000ms`; dApp Store listing/testing copy now says
  `failed mission` instead of `missed mission`.
- Railway compatibility backend remains live on production deployment
  `d970186b-8bfc-478a-b0e0-9c22944e6b06`. Strict session enforcement is still
  off: `REQUIRE_BOUNTY_SESSION_PROOF` is not explicitly set in Railway, so the
  code default is `false`. Final live checks: `/api/health/ready` returned
  `ready: true` with RPC/program/Redis OK, `/api/session/challenge` returned
  `success: true` and `sessionRequired: false`, and `/api/health/stats` showed
  finalizer queue `0`. No backend source changed after the compatibility
  deploy, so no no-op Railway redeploy was needed.
- Next concrete action: wait for dApp Store review/live status for ticket
  `314741840579`. After the official store serves v1.0.5 / versionCode `6`,
  install/update from the store path, run one live smoke, then flip
  `REQUIRE_BOUNTY_SESSION_PROOF=true` and smoke old-client rejection. Do not
  flip enforcement before the store build is live.
- 2026-06-11 13:45 EDT prep status: `wip/session-proof-rollout` has been
  rebased onto current `origin/master` (`8fb4714`). Safety branch
  `backup/session-proof-pre-rebase-20260611` preserves the pre-rebase state at
  `27c996f`. Branch is still local-only; do not push unfinished
  anti-abuse/session-proof work to the public GitHub remote unless the user
  explicitly asks.
- Release metadata is submitted for v1.0.5 / versionCode `6` in
  `mobile/package.json`, `mobile/package-lock.json`, `mobile/app.json`,
  `mobile/android/app/build.gradle`, and the in-app home-screen version label.
  dApp Store changelog:
  `Adds secure bounty sessions and strengthens Seeker Genesis Token verification for paid hunts.`
- Validation for this prep: backend `npx tsc --noEmit --pretty false` PASS;
  backend `npm run test:launch-tools` PASS after the rebase; mobile
  `npx tsc --noEmit --pretty false` PASS; contract
  `cargo check --features mainnet --no-default-features` PASS with known Anchor
  cfg warnings; contract `npm test` PASS 25/25; `git diff --check` PASS;
  `cd dapp-store-publishing && node check-assets.mjs` PASS.
- Latest local `wip/session-proof-rollout` commits before this handoff note:
  `83d5d5a` chore: submit v1.0.5 dapp store update, `63d1ebb` docs:
  record Seeker charge state before smoke, `211d5e4` docs: update v1.0.5
  smoke handoff.
- Latest local `wip/session-proof-rollout` commits: `f6236da` saved the
  session-proof rollout plan and deprecated-host correction, `fe2cf58` refreshed
  the site-repair handoff, and `74c46ae` published the Super Hunts grant deck.
  Branch is local-only and has no upstream yet.
- 2026-06-10 website outage repaired. `seek.mythx.art` DNS still pointed to
  the Helsinki Mythx VPS (`204.168.242.220`) and `/var/www/seek-web` still held
  the static export, but HTTPS failed during TLS handshake because the active
  `/etc/caddy/Caddyfile` had been reloaded on 2026-06-09 with only the
  `api.agentify.nexus` block. Restored a narrow `seek.mythx.art` static block
  on the VPS, backed up the previous Caddyfile before editing, validated Caddy,
  and reloaded the service. Verification after reload: `https://seek.mythx.art/`,
  `/grant`, `/privacy`, `/terms`, `/store`, `/license`, and `/sitemap.xml`
  return HTTPS 200; `openssl s_client` verifies `CN=seek.mythx.art`; backend
  readiness at `https://api.seek.mythx.art/api/health/ready` remains
  `ready: true` with RPC/program/Redis OK.
- Follow-up same outage: `mythx.art` and `www.mythx.art` were also missing
  from the active Caddyfile. The local WordPress/PHP service on
  `localhost:8080` was still alive, so restored the previous `mythx.art`
  reverse proxy and `www.mythx.art` redirect blocks, backed up the config as
  `/etc/caddy/Caddyfile.bak-20260610T160051Z`, validated Caddy, and reloaded.
  Verification after reload: `https://mythx.art/` returns HTTPS 200 with the
  WordPress body, `https://www.mythx.art/` 301s to the apex then 200s, and
  `openssl s_client` verifies certificates for `mythx.art`, `www.mythx.art`,
  and `seek.mythx.art`.
- 2026-06-09 abuse incident response PASS. Wallet
  `Dfui8Dph4AKDVgzW5deynTvJN4n3UPvam3Sb4aH7BgU6` was supposed to be blocked
  but production did not include the local session-proof WIP where the original
  blocklist lived. The verified SGT for that wallet is
  `B1fHfkVLjnqCih7xcN7gDyDfu7eR2PtZxzQvZiupPPDH`.
- Narrow backend hotfix `1be5161` adds a code-seeded bounty denylist plus
  optional `BLOCKED_PLAYER_WALLETS` / `BLOCKED_SGT_MINTS` env overrides. Guards
  now run on `/api/bounty/prepare`, `/api/bounty/start`, and
  `/api/bounty/submit`, blocking both the wallet and the SGT mint.
- Railway production deploy `e3b9b90b-6100-41ff-aa08-09f0f95bf89e` completed
  from the isolated `hotfix/block-cheat-wallet-2026-06-08` worktree. Public
  verification after deploy: `/api/bounty/prepare` for the blocked wallet
  returned HTTP `403` with `This wallet is not eligible for Seek bounties`;
  `/api/bounty/start` for the blocked wallet also returned HTTP `403`;
  `/api/health/ready` returned `ready: true` with RPC/program/Redis OK;
  `/api/health/stats` showed pending `0`, validating `0`, finalizer queue `0`,
  house `78,288 SKR`, and Singularity `9,000 SKR`.
- Validation for the hotfix: backend `npx tsc --noEmit --pretty false` PASS;
  `node --test -r ts-node/register tests/bounty-blocklist.test.ts` PASS 4/4;
  `node --test -r ts-node/register tests/bounty-blocklist-routes.test.ts` PASS
  2/2; backend `npm run test:launch-tools` PASS 50/50 with local test env
  values; mobile `npx tsc --noEmit --pretty false` PASS; contract
  `cargo check --features mainnet --no-default-features` PASS with known Anchor
  cfg warnings; contract `npm test` PASS 25/25; `git diff --check` PASS.
- On-chain audit for the blocked wallet found 7 historical bounty accounts:
  4 final `Won`, 3 final `Lost`, and zero `Pending`, `Submitted`,
  `ChallengeWon`, `ChallengeLost`, or `Disputed` accounts. There is no
  existing finalizable win for this wallet.
- Latest relevant pushed commits before this closeout note:
  `4b40ddf` test: cover bounty blocklist route gates;
  `1e32ee2` docs: update abuse hotfix closeout;
  `3b85203` docs: record abuse blocklist hotfix.
- The broader session-proof rollout remains unreleased WIP. Do not assume any
  local session-proof routes are live unless production endpoints prove it.
- Latest three master commits remain: `9b0ff85` AI validation hotfix,
  `f29d617` device test build cleanup docs, `6e3b6c5` v1.0.4 tier reprice.
  Current working branch remains `wip/session-proof-rollout` with the
  pre-existing session-proof WIP plus the grant deck/site changes.
- Next concrete action: on the next morning session, resume the session-proof
  release from `tasks/session-proof-rollout-2026-05-25.md` through the
  compatibility deploy and Seeker smoke path. Superteam Instagrant remains the
  main non-blocking grant follow-up after attaching/verifying the 200+ dApp
  Store reviews screenshot.
- 2026-06-08 grant pipeline update: user submitted Solana Mobile Builder Grant
  and MonkeFoundry applications. Superteam Instagrant and Colosseum Eternal
  setup packets now live in `tasks/superteam-instagrant-2026-06-08.md` and
  `tasks/colosseum-eternal-2026-06-08.md`. Recommended Superteam ask is
  `$10,000` for the first Super Hunts milestone: multi-token event quests and
  organizer playbook. Colosseum Eternal is prepared as a venture-scale 4-week
  Super Hunts sprint, but the official Colosseum page currently says Eternal is
  paused and not accepting new participants, so do not start the timer until it
  reopens. Both packets preserve the canonical deck URL
  `https://seek.mythx.art/grant`, preserve Breakpoint London 2026 as flagship
  go-live, and mark the 200+ dApp Store reviews metric as user-reported until a
  screenshot is attached.
- 2026-06-08 grant deck update shipped. Canonical deck is live at
  `https://seek.mythx.art/grant`, served from the static `web/` export on the
  Helsinki Mythx VPS (`/var/www/seek-web`). It is now grant-program agnostic
  while preserving Breakpoint London 2026 as the flagship Super Hunts go-live
  target. The deck now explicitly leads with the product truth that Seek is live
  in the Solana dApp Store and already won the Solana Mobile Monolith 2026
  hackathon. The title slide now uses the large Seek logo, explains Seek as
  real-world scavenger hunts on Seeker, and then frames Super Hunts as the next
  growth step: a Pokemon Go-level event co-marketing solution for partners. It
  asks for `$30K`. The solution slide copy uses the current
  `500 / 1000 / 2000 SKR` ladder, but `02-home.png` has been restored to the
  real app UI screenshot after the v1.0.4 store-marketing mockup looked wrong;
  that screenshot still shows the older `1000 / 2000 / 3000 SKR` ladder. The standalone
  Vercel mirror was removed at the user's request; `https://grant-deck.vercel.app`
  and known raw Vercel deployment URLs now return 404. Verification: `web`
  typecheck PASS, `web` static build PASS including `/grant`, `grant-deck`
  typecheck/build PASS before retirement, live `seek.mythx.art/grant` /
  `/privacy` / `/store` all return 200, old `$25K` / `$20K` / `Solana Mobile
  Builder Grant` deck-wrapper strings no longer appear in live deck bodies, and
  browser screenshots checked desktop/mobile hero; the solution screenshot
  should be refreshed from the running app before using it as current tier proof.
- 2026-05-30 user complaint traced: wallet
  `AfHbufmvMfTU7oty25nv9GBoBDZzZuuWyKEbSR3Mexpx` is SGT-verified via mint
  `CwyvfwhNxmskhXz1j6fbpxXPtki1QRmcjyQDQgjPm1sH` and played one 500 SKR
  tier-1 bounty (`AYVuNRZ39b6DpajW7K2PuK8FUgS8A6FqZo1cC4o5tQtD`) for mission
  `t1-178`, "Find a dumbbell rack." Railway logs show Claude recognized "a
  dumbbell rack with multiple sets of hex dumbbells" in a home gym at 85%
  confidence, but production rejected it because Tier 1 was running at a 91%
  threshold and the SGT-adjusted threshold was still 86%. This was a threshold
  false negative, not a commercial-gym-only prompt issue. Hotfix commit
  `9b0ff85` is pushed and deployed to Railway deployment
  `59639557-eaa3-4083-b761-7b2cda6f0225`; master now restores Tier 1 to 88%,
  adds prompt language against inventing unstated location/style/venue
  constraints, and adds regression coverage for the 85% verified-Seeker path.
- 2026-05-30 cleanup: session-proof WIP is isolated on branch
  `wip/session-proof-rollout` on top of hotfix `9b0ff85`. The original dirty
  state is preserved in `stash@{0}` (`wip session-proof before ai hotfix rebase
  2026-05-30`) until this branch is verified; do not drop that stash
  prematurely.
- Latest three master commits: `9b0ff85` AI validation hotfix, `f29d617`
  device test build cleanup docs, `6e3b6c5` v1.0.4 tier reprice.
- 2026-05-25 anti-abuse patch is on this WIP branch for wallet-signed bounty
  sessions with SGT mint binding. Rollout plan:
  `tasks/session-proof-rollout-2026-05-25.md`. Deploy backend first with
  `REQUIRE_BOUNTY_SESSION_PROOF=false`, test v3 mobile on the Seeker, submit the
  dApp Store update, then flip enforcement only after the v3 store build is
  live. This path does not require a contract upgrade and does not add any
  extra on-chain transaction approval beyond `accept_bounty_v2`.
- Mainnet program `DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v` is
  deployed, initialized, IDL-published, and still upgradeable under Ledger
  `GkpXKrovpRLgAgQpkeX7wFC3FDKHJDBED5YzNog2YNtY`. Never use `--final`.
- Global State PDA: `8KUctm4YQRns3788cQWyjc7SFtKSnws4m4FTZ72YDfYm`;
  latest live health on 2026-05-19 shows house vault `66,888 SKR`,
  Singularity `4,600 SKR`, no pending/validating bounties, finalizer queue `0`,
  total bounties `10`, win rate `10.0%`, and no finalizer safety pause.
- The live production ladder is now `500 / 1000 / 2000 SKR` with the same
  `180s / 120s / 60s` timers, `2x` total-return payout math, zero-delay
  finalization config, and the globally refreshed 600-mission pool.
- 2026-05-19 v1.0.4 shipped through the full required sequence: pre-release
  audit, user approval, Ledger program upgrade with durable payer/buffer,
  ProgramData authority/hash verification, backend deploy, signed APK rebuild,
  Solana Mobile test-app smoke, and Publisher Portal upload.
- 2026-06-09 user-provided Publisher Portal screenshot shows v1.0.4 /
  versionCode `5` status `Live` with upload date 2026-05-19. The remaining
  validation is the official Solana dApp Store Seeker smoke, not waiting for
  ticket review.
- The upgraded program uses
  `accept_bounty_v2(tier, entry_amount, timestamp, commitment)` with explicit
  tier+amount validation so `1000 SKR` is Tier 2 for new clients. Legacy
  `accept_bounty` remains available temporarily for installed old clients.
- Cold Ledger is `usb://ledger?key=1` / `44'/501'/1'`,
  `GkpXKrovpRLgAgQpkeX7wFC3FDKHJDBED5YzNog2YNtY`. After the successful
  2026-05-19 upgrade, payer/buffer drain, and follow-up smoke tests, its
  verified balance is `3.936988993 SOL`.
- 2026-05-19 local Ledger probe recovered after the user connected and unlocked
  the Ledger Flex with the Solana app open. `solana address -k
  'usb://ledger?key=1'` returned
  `GkpXKrovpRLgAgQpkeX7wFC3FDKHJDBED5YzNog2YNtY` three times in a row. A
  read-only `solana program show` also confirmed the program upgrade authority
  is `GkpXKrovpRLgAgQpkeX7wFC3FDKHJDBED5YzNog2YNtY`. Rerun the Ledger probe
  immediately before any actual upgrade.
- Hot authority pubkey is `Gm6x8CZU7SQFVVHx2VnCQGteqT8gYnHFgEmdr3eqGdLk`. The
  prior local temp files `/tmp/seek-mainnet-hot-authority.json` and
  `/tmp/seek-mainnet-hot-authority.env` are not present in the current session.
  Treat local custody as unresolved unless recovered from durable secrets or
  Railway secret state without exposing private key material.
- The old temp mainnet deploy wallet pubkey
  `6zZG7iKLdtWdzjKEBY478PoZpNPDjzPyp25qeRAezSUt` still has
  `0.167563443 SOL`, but its `/tmp/seek-mainnet-fee-payer.json` key file is
  not present in the current session. The 2026-05-17 upgrade temp payer pubkey
  `5bGdsBtnmgU96DKyknUX35QwUNcewkNp2x387uZYwZWR` holds `3.4 SOL`, but
  `/private/tmp/seek-upgrade-fee-payer.json` is not present in the current
  session. Future generated keypairs must be created directly in durable
  git-ignored secrets storage, `0600`, pubkey-verified, and backed up or paired
  with a drain plan before funding.
- Current durable upgrade payer candidates are under `.secrets/solana/`:
  `seek-upgrade-payer-20260517.json` ->
  `3EKi2PzKrDi22Ld6NgixdBX7djSKMrZA2TG1utg1tJAS` and
  `seek-upgrade-buffer-20260517.json` ->
  `C3y6AWfaM4vR5vocLa8Bozv768PkeyDwmaQWhM3buH2i`. On 2026-05-19 the directory
  was verified `0700`, both files `0600`, all paths git-ignored by
  `.gitignore:23`, public keys derived with `solana address -k`, and both
  balances were `0 SOL`. `solana-keygen verify` was blocked by the local
  approval guard, so re-run a full pubkey verify before funding if the guard
  allows it.
- Current upgrade checks are using `https://api.mainnet-beta.solana.com`.
  On 2026-05-15 Railway `SOLANA_RPC_URL` was moved there because the Helius
  endpoint returned `429 max usage reached`; keep Helius as a future paid-RPC
  option after quota is restored. Do not paste or commit RPC keys.
  During the paused 2026-05-17 upgrade attempt, one command briefly sourced the
  private project RPC from `backend/.env`; no config or repo file was changed,
  and `solana config set --url https://api.mainnet-beta.solana.com` was run
  afterward. Current Solana CLI config should show public mainnet RPC.
- Publisher wallet exists at `.secrets/dapp-store/publisher.json`, pubkey
  `Dzbqbjh8qowVK7x89vj1vo1ApUz7LNRqmR39yYXehenR`, balance
  `0.07655074 SOL` after the v1.0.4 update submission. It is durable,
  git-ignored, `0600`, and derives to the expected pubkey through the local
  Solana JS check; `solana-keygen verify` is blocked by the local approval
  guard in this environment. Top it up before the next release/update attempt.
- Publisher Portal API key is stored outside the repo at
  `/Users/hammer/Desktop/Claude/Solanamobile api.rtf`; do not paste it in chat. The
  RTF's first non-empty line is a label and the second non-empty line is the
  actual key.
- User reports Solana Mobile dApp Store v1.0.1 / versionCode `2` is live.
  Release mint: `ATChUKmCC4zzqj9g54etDd7bW5uLFtLsxj5Dib2kqzRe`; collection
  mint: `4PdmCnEsoUCYMgDAw6X8KFjX7nJHKoVAke8zaAYyjpr1`; ticket ID:
  `311418671831`.
- v1.0.2 / versionCode `3` was submitted to Solana Mobile dApp Store review on
  2026-05-17 with the approved changelog and no payout-math language. Release
  mint: `2jKWGs79qJC2j8LTRfwER6fn4Taz35hymzTWMZvyTBXS`; collection mint:
  `4PdmCnEsoUCYMgDAw6X8KFjX7nJHKoVAke8zaAYyjpr1`; ticket ID:
  `311747315429`. User reported Solana Mobile accepted the update and the app
  store listing now serves this build.
- 2026-05-18 incident response: reports said the app could crash around
  permission grant after a paid hunt started. Root cause class is mobile/backend
  ordering, not contract logic: older clients could sign `accept_bounty` before
  camera/location permission was proven usable. The v1.0.3 update gates paid
  flow on camera + foreground-location permission and backend `/prepare`
  requires an explicit permission preflight before returning transaction data.
- v1.0.3 / versionCode `4` was the permission-preflight hotfix. Changelog:
  "Adds camera and location permission preflight before paid hunts."
- v1.0.3 / versionCode `4` was submitted to Solana Mobile dApp Store review on
  2026-05-18 with idempotency key `seek-update-1.0.3-v4-20260518`. Release
  mint: `UPyAUVgG29eKicQNTXEDfw5cYw83GnxZbTttATrjv4g`; collection mint:
  `4PdmCnEsoUCYMgDAw6X8KFjX7nJHKoVAke8zaAYyjpr1`; ticket ID:
  `311926974167`.
- v1.0.4 / versionCode `5` was submitted to Solana Mobile dApp Store review on
  2026-05-19 with idempotency key `seek-update-1.0.4-v5-20260519`. Release
  mint: `DvXz61SCghoPMwD3jED8qDj3CBXtXRXoLXiRVku7zMWg`; collection mint:
  `4PdmCnEsoUCYMgDAw6X8KFjX7nJHKoVAke8zaAYyjpr1`; ticket ID:
  `312122131169`. User-provided Publisher Portal screenshot on 2026-06-09
  shows this build is now `Live`.
- The sideloaded/debug hardware-test package was removed from the Seeker on
  2026-05-17 before unplugged store testing. Removed package:
  `app.seek.mobile`, version `1.0.3` / versionCode `4`,
  `installerPackageName=null`.
- The sideloaded v1.0.4 test-app package was removed from the connected Seeker
  on 2026-05-19 after Publisher upload. Removed package: `app.seek.mobile`,
  version `1.0.4` / versionCode `5`, `installerPackageName=null`. ADB
  verification after uninstall returned `Unable to find package:
  app.seek.mobile`.
- Release Android keystore/env exist under `.secrets/android/`. Back them up
  before store submission; losing the keystore means losing update ability.
- Release APK exists at `mobile/android/app/build/outputs/apk/release/app-release.apk`,
  package `app.seek.mobile`, version `1.0.4` / versionCode `5`, SHA-256
  `5ed166ca0d7da0f3cec2e30de6d94ccab1fcbeb7457e210cb66384cd473b842b`.
  This is the v1.0.4 tier/mission update candidate submitted to Solana Mobile
  review on 2026-05-19.
- Local dependency audit on 2026-05-17 applied normal `npm audit fix` updates
  in backend, mobile, and contracts. Remaining production high-severity audit
  finding is the Solana `@solana/spl-token` transitive `bigint-buffer`
  advisory; npm's offered `--force` fix is a breaking downgrade and should not
  be applied without a deliberate Solana SDK migration plan.
- User has Solana Mobile hardware available. The v1.0.4 test-app smoke passed
  before submission; the remaining validation is a short official-store,
  unplugged Seeker smoke after v1.0.4 acceptance.
- Railway project `seek` is live with `seek-backend` + Redis. Health:
  `https://seek-backend-production-0134.up.railway.app/api/health` and
  `https://api.seek.mythx.art/api/health`. Current v1.0.4 Railway deployment:
  `8e0a85cd-f957-461a-8150-5d0f6118dfee`.
- Solana Mobile support reported an unknown/unrecoverable backend ingest error
  on their side for the original v1.0.0 ticket and asked for another
  submission. A same-APK resubmit was tried on 2026-05-15 with idempotency key
  `seek-resubmit-1.0.0-a420b658897d4631-20260515`; ingestion session
  `8e1ac82b-b383-4771-8d49-cabb342bd61f` failed with:
  `A release with version code 1 already exists for this app`. Solana Mobile
  confirmed a versionCode bump was acceptable, so v1.0.1 / versionCode `2` was
  rebuilt and submitted successfully.
- Cold-Ledger admin controls are public on-chain instructions:
  `pause`/`resume`, `withdraw-house` capped to unreserved house surplus, and
  `withdraw-singularity` only while paused with zero active bounties.
- Brand/app design is protected; only fix clear store rejection risks,
  unreadable states, capture quality, or approved banner polish.
- Six store screenshots are in `dapp-store-publishing/assets/screenshots/en-US/`;
  submission config uses photos 1, 4, 5, and 6. Keep all six files in place;
  do not move, delete, or rename screenshot slots.
- The screenshot set has been refreshed locally for v1.0.4 tier economics and
  all six PNGs are 1440x2880. They were used for the 2026-05-19 v1.0.4
  Publisher Portal submission.
- `api.seek.mythx.art` is wired through Railway and returns HTTPS 200.
- `seek.mythx.art` legal/marketing site is built from `web/` as a static export
  and deployed on the Helsinki Mythx VPS at `/var/www/seek-web` behind Caddy.
  Namecheap DNS resolves `seek.mythx.art` to `204.168.242.220`; Caddy issued
  a Let's Encrypt certificate for `seek.mythx.art`; `/privacy`, `/terms`,
  `/license`, and `/store` return HTTPS 200. `/store` is the post-friendly
  Solana Mobile dApp Store wrapper for
  `solanadappstore://details?id=app.seek.mobile`.
- This WIP branch currently contains unpublished session-proof rollout changes
  plus the deployed AI validation hotfix merge resolution. Keep local
  screenshots, logs, build output, and secret material out of git.

## Fresh Checks

- 2026-05-30 hotfix worktree verification PASS from clean `origin/master`:
  backend focused test `node --test -r ts-node/register
  tests/ai-hard-reject.test.ts tests/missions.test.ts` PASS 8/8; backend
  `npx tsc --noEmit --pretty false` PASS; backend `npm run test:launch-tools`
  PASS 44/44; `git diff --check` PASS. Tests ran with non-secret test env
  values in the external worktree because the worktree intentionally does not
  copy local `.env` secrets.
- 2026-05-30 AI hotfix deploy verification PASS: GitHub Actions run
  `26697431882` on commit `9b0ff85` succeeded; Railway deployment
  `59639557-eaa3-4083-b761-7b2cda6f0225` is `SUCCESS`; live
  `https://api.seek.mythx.art/api/health/ready` returns `ready: true` with
  RPC/program/Redis OK; `/api/health/stats` shows pending `0`, validating `0`,
  finalizer queue `0`, house `76,488 SKR`, Singularity `8,200 SKR`, total
  bounties `2`, win rate `0.0%`.
- 2026-05-30 current master CI lookup after the hotfix PASS: `gh run list
  --limit 3` shows latest master CI success `26697431882`.
- 2026-05-30 session-proof WIP cleanup verification PASS: conflict-marker scan
  returned no matches; `git diff --check` PASS; backend `npx tsc --noEmit
  --pretty false` PASS; mobile `npx tsc --noEmit --pretty false` PASS; backend
  focused `node --test -r ts-node/register tests/ai-hard-reject.test.ts
  tests/missions.test.ts` PASS 10/10; backend `npm run test:launch-tools`
  PASS 54/54.
- 2026-05-30 mandatory `check-seek` before the session-proof cleanup PASS:
  `gh run list --limit 3` and `gh run list --branch master --limit 1` showed
  then-latest master CI success `26122564805`; backend `npx tsc --noEmit
  --pretty false` PASS; mobile `npx tsc --noEmit --pretty false` PASS;
  contracts `cargo check --features mainnet --no-default-features` PASS with
  known Anchor cfg warnings; contracts `npm test` PASS 25/25; mission pool test
  PASS 6/6; demo-residue grep returned no matches; dApp Store asset validator
  PASS.
- 2026-05-19 local v1.0.4 patch verification PASS: `anchor build` PASS and
  `backend/src/idl/seek_protocol.json` regenerated; Solana `rust_autofixer`
  reported no issues; backend `npx tsc --noEmit --pretty false` PASS; mobile
  `npx tsc --noEmit --pretty false` PASS; backend
  `npm run test:launch-tools` 42/42 PASS; contracts `npm test` 25/25 PASS;
  contracts `cargo check --features mainnet --no-default-features` PASS with
  known Anchor cfg warnings; dApp Store `node check-assets.mjs` PASS;
  `git diff --check` PASS; country-specific mission grep returned no matches
  in production mission/list/generator surfaces. Backend launch-tools now also
  assert the hardcoded `accept_bounty` discriminators and
  `accept_bounty_v2` arg/account order against the regenerated IDL.
- 2026-05-19 18:29Z read-only live gate check PASS: `solana program show`
  reports ProgramData authority
  `GkpXKrovpRLgAgQpkeX7wFC3FDKHJDBED5YzNog2YNtY`; `api.seek.mythx.art`
  readiness returns `ready: true`; health stats show pending `0`, validating
  `0`, finalizer queue `0`, and no safety pause.
- 2026-05-19 release-runbook custody check PASS: the upgrade runbook
  keeps the cold Ledger as `--upgrade-authority`, uses the durable payer only
  as `--fee-payer`, uses the durable buffer key via `--buffer`, runs
  `anchor idl upgrade` from `contracts/`, and requires exact Ledger, payer, and
  buffer pubkey matches before funding or deploying.
- 2026-05-19 v1.0.4 live deployment and store submission PASS: program upgrade
  transaction
  `tJuxgbdoizbyiN4hWg4VNfwmw5VUoVQ9Fd5rSfshBFaEmcEZfe5QdoaE752X7r6zwUWv9GLWVSMTx5QVZjGEMTW`;
  on-chain program hash matched local
  `47f11b75827318512b285d4eb5f3bcc6a6af587536ad3b32216630a1de760456`;
  durable payer/buffer are drained to `0 SOL`; backend deployment
  `8e0a85cd-f957-461a-8150-5d0f6118dfee` is live; `/api/health/ready` returns
  `ready: true`; `/api/health/stats` shows pending `0`, validating `0`,
  finalizer queue `0`, house `66,888 SKR`, Singularity `4,600 SKR`, total
  bounties `10`, win rate `10.0%`.
- 2026-05-19 v1.0.4 store submission PASS using `--api-key-stdin` and
  idempotency key `seek-update-1.0.4-v5-20260519`. APK SHA-256
  `5ed166ca0d7da0f3cec2e30de6d94ccab1fcbeb7457e210cb66384cd473b842b`;
  ingestion session `4322b65e-8b0c-4441-bc12-ef08d84f8ed1`; release ID
  `5b2e62d8-38d4-4365-b97e-b1b7c3ba0847`; publication session
  `e5ea4d2e-fe43-491e-8a8a-0be876c7ac15`; release tx
  `5MCL4spjg1u43cjLKNAubeWAxj6KovHXijFUvLh1ssr584zaY5DGxdSGfe2akmr2ZaVZSt6JvBU9J9gSECvsACMF`;
  collection tx
  `3fLoBEGmg2rsJD6R99kVZZuH9nuW94ZeF71qTGUr1pDFEakpzacCL6doTDPt81LAS5TcTmtsk8r7qstWJPuUhmiX`;
  attestation request ID `17985067346990183540214621176997`; ticket ID
  `312122131169`; publisher balance after submission `0.07655074 SOL`.
- 2026-05-18 v1.0.3 permission-preflight verification PASS: backend
  `npm run build`; backend `npm run test:launch-tools` 34/34; mobile
  `npx tsc --noEmit --pretty false`; contracts `npm test` 23/23; dApp Store
  asset validator PASS; release APK build PASS; `apksigner verify` PASS; `aapt`
  confirms `app.seek.mobile`, version `1.0.3` / versionCode `4`.
- 2026-05-18 v1.0.3 store submission PASS using `--api-key-stdin` and
  idempotency key `seek-update-1.0.3-v4-20260518`. Ingestion session:
  `bf81b531-e1fb-4fa2-b69e-727cfbb50bf4`; release ID:
  `96332cdd-cf73-4074-b0b1-1cdcd915e7c1`; publication session:
  `6a60d162-3db2-4d3a-90b4-c4fdacfe6c46`; release tx:
  `5yK6poi6Y1X5NFrdVvSEFwcLVQEqxiMzfbSj5hat9dbebEuJsZQh5Zs7n19dBgXACqcZCLxmXVXG6BcDanaZvrVY`;
  collection tx:
  `24252CaZRC7y2ESMLRS9iAaup5k3BqXmcgiH7iMbSUq8vcd8X7Sczr2Q2eTaWc3hYys9qXz3wBUzwiGS1GYhJu7D`;
  attestation request ID: `56610741437357918902244398451996`; ticket ID:
  `311926974167`.
- 2026-05-18 Railway hotfix deploy PASS. Deployment
  `d458d67b-3599-4ad1-9f7c-7adf4492b002` promoted successfully. Public
  readiness returned `ready: true`; `/api/bounty/prepare` without
  `permissionsConfirmed` returns validation error before transaction data; the
  new-client path with `permissionsConfirmed: true` still returns prepare data.
  `/api/health/stats` shows pending `0`, validating `0`, finalizer queue `0`,
  and no safety pause.
- Backend/mobile typecheck PASS; backend launch-tool tests 19/19 PASS;
  contract tests 21/21 PASS.
- `npm run build` in `backend/` PASS; Railway deployment
  `af6c3d3b-c565-4de6-9c81-17b6c637b6b2` SUCCESS.
- `npm run build` and `npm run typecheck` in `web/` PASS after static-export
  setup; public DNS resolvers `1.1.1.1`, `8.8.8.8`, and `9.9.9.9` return
  `204.168.242.220` for `seek.mythx.art`; legal pages verified over HTTPS.
- Contracts mainnet `cargo check` PASS with known Anchor cfg warnings.
- Mainnet `npm run preflight:mainnet` PASS after deploy; program account is
  owned by the upgradeable loader and upgrade authority is the Ledger.
- 2026-05-15 mainnet preflight PASS using public mainnet RPC after Helius quota
  exhaustion; program is upgradeable under Ledger
  `GkpXKrovpRLgAgQpkeX7wFC3FDKHJDBED5YzNog2YNtY`.
- `anchor build` PASS; mainnet binary hash
  `94902289c477be734b85cfd54349cd6bc7fbcf9d419ae488ec8fc375ac88d428`;
  on-chain deployed bytecode hash matched local.
- dApp Store assets validator PASS.
- Portal-backed `@solana-mobile/dapp-store-cli` publish PASS using
  `--api-key-stdin`, APK SHA-256
  `a420b658897d46315bb3d97f01d4c546562b2a1a627042f6a8554c740a46b8f8`, and
  idempotency key `seek-initial-1.0.0-a420b658897d4631`.
- 2026-05-15 same-APK portal resubmit attempt reached portal ingestion but
  failed before review submission because versionCode `1` already exists.
- 2026-05-15 v1.0.1 / versionCode `2` resubmission PASS using
  `--api-key-stdin`, APK SHA-256
  `cdfb339816ae82405ffff8dda181032b88c021c27983416eb69d6bbc65d9707e`, and
  idempotency key `seek-resubmit-1.0.1-v2-20260515`. Ingestion session:
  `da680a7c-f986-4df7-bced-e6af6c269d6d`; release ID:
  `9d8eea78-6b9c-4729-a6c4-18fe2c83091d`; publication session:
  `74c15749-888a-448d-bd82-2008bb214a8f`; ticket ID: `311418671831`.
- Android release build PASS; `apksigner verify` PASS; permissions are
  `CAMERA`, `INTERNET`, `VIBRATE`, Android photo picker/media read, and
  `ACCESS_NETWORK_STATE` only. No `RECORD_AUDIO`, legacy external storage, or
  `exp+seek` dev scheme in badging. Current APK badging confirms
  `app.seek.mobile`, version `1.0.1` / versionCode `2`.
- Release APK emulator smoke PASS on `SeekDryRun_API35`: installed the signed
  APK, launched `app.seek.mobile/.MainActivity`, accepted the 18+ gate, reached
  the home screen, loaded live protocol stats from `api.seek.mythx.art`, and
  logcat showed no fatal exception, activity-start failure, ANR, or React
  TypeError/ReferenceError. This is not a substitute for Seeker/MWA/SGT
  hardware validation.
- `git diff --check` PASS.
- 2026-05-15 Railway readiness PASS:
  `/api/health/ready` returned `ready: true` with RPC/program/Redis OK, and
  `/api/health/stats` returned house vault `58,788` SKR.
- 2026-05-16 v1.0.2 bugfix verification PASS:
  backend `npx tsc --noEmit --pretty false`; mobile
  `npx tsc --noEmit --pretty false`; backend `npm run test:launch-tools`
  22/22; contract `cargo check --features mainnet --no-default-features`
  PASS with known Anchor cfg warnings; contract `npm test` 21/21.
- 2026-05-16 Android release build PASS with release signer loaded from local
  `.secrets/android/`; `apksigner verify --print-certs` PASS. APK badging:
  `app.seek.mobile`, version `1.0.2` / versionCode `3`, permissions
  `CAMERA`, `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `INTERNET`,
  `VIBRATE`, Android media/photo picker reads, and `ACCESS_NETWORK_STATE`.
- 2026-05-16 v1.0.2 SHA-256:
  `8f2e712f7ab66ea48ee484236c01cb3d7ef3b8ef953990459d4057ac944fff7e`.
- 2026-05-17 release-signing drift check found the older hardware-test v1.0.3
  artifact was debug-signed because `assembleRelease` fell back to the debug
  keystore when signing env was absent. `mobile/android/app/build.gradle` now
  fails release artifact tasks unless `SEEK_KEYSTORE_*` env is present. Rebuilt
  with `.secrets/android/seek-release.env`; `apksigner verify --print-certs`
  reported `CN=Seek, OU=Mobile, O=Projectnamedate LLC, L=Miami, ST=Florida,
  C=US`, version `1.0.3` / versionCode `4`, SHA-256
  `3016039351a47be9975bcce2486310e68e35f7df6a5dde8481c263ec6c0abc21`.
- 2026-05-16 Railway hotfix deploy PASS. Deployment
  `a79d3e97-37ef-4ef3-9fd2-2dd23d4a655e` promoted successfully with Docker
  image digest `sha256:57b644b2ff290480c4741ba692e23a82fb2f26660e853df2d78ad2b262c0506d`.
  Public readiness after promotion: `/api/health/ready` returned
  `ready: true` with RPC/program/Redis OK. Deployment logs show Redis
  connected, workers started, and one active bounty restored from Redis; no
  `>=400` HTTP logs were returned for the new deployment at check time.
- 2026-05-17 finalization-upgrade preflight PASS before mutation:
  local rebuilt program size `470888` bytes, local SHA-256
  `9fc273b43c3c92bd3517539daa2dc621ebb09cefdf10e4fef090241884abac4a`;
  live ProgramData size `470240` bytes, authority
  `GkpXKrovpRLgAgQpkeX7wFC3FDKHJDBED5YzNog2YNtY`; live Global State account
  length `274`, matching current `GlobalState::SIZE`, so no Anchor account
  migration is required.
- 2026-05-17 upgrade attempt paused before any program mutation. Ledger transfer
  signature `LsAZJPCMMZUbXyV166i1kuT83oB6bZYcHeZzpn5R9sHxfuXbZyPAiyk1RH4bsGbtZeZrbrh4E295UuL1zc7CE5Q`
  moved `3.4 SOL` to temp payer `5bGdsBtnmgU96DKyknUX35QwUNcewkNp2x387uZYwZWR`.
  Two `program extend` attempts against public mainnet RPC requested Ledger
  approvals but failed sending the RPC request and did not land. Verified
  afterward: ProgramData remained `470240`, Ledger balance `0.673227433 SOL`,
  temp payer balance `3.4 SOL`.
- 2026-05-17 temp payer recovery check is now FAIL in the current session:
  `/private/tmp/seek-upgrade-fee-payer.json` is not present, local searches did
  not find the keypair, and no local Time Machine destination or data-volume
  snapshot is configured. Do not treat the temp payer pubkey as controllable
  unless the keypair is recovered from another durable source and verified.
- 2026-05-17 CLI Ledger state at pause: macOS and browser/Solflare path could
  see the Ledger, but Solana CLI local probes such as
  `solana address -k 'usb://ledger?key=1'` returned `Error: no device found`.
  Do not run upgrade/extend commands again until this local-only address probe
  returns the expected Ledger authority pubkey.
- 2026-05-17 restart Ledger recovery check PASS: `solana address -k
  'usb://ledger?key=1'` returned
  `GkpXKrovpRLgAgQpkeX7wFC3FDKHJDBED5YzNog2YNtY` three times in a row.
  macOS IORegistry sees a Ledger Flex, `node-hid` lists Ledger interfaces 0 and
  2, and `@ledgerhq/hw-transport-node-hid` lists the interface-0 transport
  path. Caveat: direct Node HID open of interface 0 currently fails with
  `cannot open device`, while interface 2 opens; use Solana CLI for the program
  upgrade path and do not rely on Node Ledger admin scripts until that is fixed.
  The mobile app settings version display was corrected for the local
  hardware candidate; final submitted store build is `1.0.2`.
- 2026-05-17 final local verification after the approved mission/economics
  patch: backend typecheck PASS; backend launch-tool tests 32/32 PASS; mobile
  typecheck PASS; contract cargo check PASS with known Anchor cfg warnings;
  contract tests 23/23 PASS; `git diff --check` PASS; dApp Store asset
  validator PASS; mainnet offline preflight PASS when provided public launch
  env values; live `/api/health/ready` returned `ready: true` with RPC/program/
  Redis OK; Solana CLI confirmed the program remains upgradeable under Ledger
  `GkpXKrovpRLgAgQpkeX7wFC3FDKHJDBED5YzNog2YNtY`.
- 2026-05-17 final publish verification PASS: release build completed with
  `.secrets/android/seek-release.env`; `apksigner verify --print-certs` PASS;
  `aapt dump badging` confirms `app.seek.mobile`, version `1.0.2` /
  versionCode `3`; exact old success-screen copy
  `funds will settle in your wallet in 5 minutes` is absent from source and
  release bundle; dApp Store asset validator PASS; portal-backed CLI submission
  PASS using `--api-key-stdin` and idempotency key
  `seek-update-1.0.2-v3-20260517`.

## Where The User Paused

The reported cheater wallet and its soulbound verified SGT are blocked in live
production, route-level regression coverage is pushed, and no non-final
on-chain bounty exists for that wallet. On-chain mainnet upgrade, Railway
backend update, public legal URLs, store assets, Solana Mobile test-app smoke,
and the Solana Mobile Publisher Portal v1.0.4 update submission/acceptance are
otherwise complete. v1.0.4 / versionCode `5` is live; ticket
`312122131169` is historical review context. Do not paste API keys or private
keys in chat.

## Next Concrete Action

Finish reviewing the `wip/session-proof-rollout` branch, run backend/mobile
verification from this branch, and keep `REQUIRE_BOUNTY_SESSION_PROOF=false`
for the first backend deploy.

If the abuse block is questioned later, first rerun the production probe:
`POST /api/bounty/prepare` for
`Dfui8Dph4AKDVgzW5deynTvJN4n3UPvam3Sb4aH7BgU6` must return HTTP `403`.
v1.0.4 / versionCode `5` is live; the next store upload needs publisher-wallet
balance checked first.

Launch risks: Singularity grinding remains until VRF; Solana JS advisories remain.
