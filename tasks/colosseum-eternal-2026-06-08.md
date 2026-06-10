# Colosseum Eternal - Seek Super Hunts sprint packet

Created: 2026-06-08
Status: prepared, but **not currently submittable** because the official
Colosseum Eternal page says Eternal is paused and is not accepting new
participants at this time.

Official page:
https://colosseum.com/eternal

Dashboard:
https://arena.colosseum.org/

Canonical deck:
https://seek.mythx.art/grant

## Current program truth

Colosseum Eternal is framed as an in-between-hackathons product sprint. The
official page says teams submit a crypto product to be considered for $250,000
in pre-seed funding, acceptance into a future Colosseum accelerator cohort, and
the Eternal Award.

The same page currently says Eternal is paused and is not accepting new
participants. The setup work to do now is:

1. Create/sign into the Colosseum builder account.
2. Prepare the sprint thesis, repo, demo plan, and weekly updates.
3. Start the timer only when Eternal reopens and the 4-week sprint can be
   executed cleanly.

## Positioning

Colosseum should not receive the same framing as an Instagrant. Pitch Seek as a
venture-scale consumer crypto company, not as a one-off grant project.

Company:
**Seek**

Sprint title:
**Super Hunts: the proof-of-action layer for real-world Solana events**

One-liner:
Seek is a live Seeker-native scavenger hunt app. Super Hunts expands it into a
geofenced, token-agnostic event layer where communities and partners can turn
physical participation into on-chain quests, rewards, leaderboards, and
measurable distribution.

## Core application answers

### What problem are you solving?

Crypto communities generate enormous attention at events, meetups, and partner
campaigns, but very little of that attention becomes measurable on-chain action.
People show up, take photos, collect swag, and leave. Sponsors and protocols
have no reliable way to turn that foot traffic into wallet opens,
transactions, token engagement, or provable participation.

Seek solves this by making real-world participation playable and settled on
Solana.

### What is the product?

Seek is a real-world scavenger hunt app live on Seeker. Players stake a token,
receive a physical mission, prove completion with a photo, and settle the result
on Solana. It currently runs with $SKR and uses Mobile Wallet Adapter, SGT
gating, Claude Vision validation, and an Anchor program for settlement.

Super Hunts is the next evolution: event-scale hunts for partner activations.
Organizers can configure geofenced missions, seed prize pools, run live
leaderboards, and eventually use assets beyond $SKR, including $SOL, $BONK, or
partner SPL tokens. That turns Seek from a game into a distribution layer for
Solana communities.

### Why now?

Seek has already shipped the hard part: mobile-native UX, mainnet settlement,
AI proof validation, dApp Store distribution, and real token stakes. The next
step is scale and repeatability. Breakpoint London 2026 is the natural flagship
target, but the product should work for Superteam events, hacker houses,
partner booths, community meetups, and token launches.

### Why Solana?

This loop only works if settlement is cheap, fast, mobile-friendly, and tied to
active token communities. Solana gives Seek instant transactions, low fees,
Mobile Wallet Adapter, Seeker distribution, $SKR alignment, and a dense network
of communities that can use Super Hunts as an event-growth primitive.

### Why this can be big

Every crypto event and community needs proof that their activation worked.
Super Hunts can become the default way to turn physical attention into
on-chain action:

- For events: quests, leaderboards, and attendee engagement.
- For sponsors: measurable booth visits and campaign participation.
- For token projects: token-native reward flywheels.
- For Solana Mobile: a flagship reason to pull out a Seeker in public.

This starts with Seek but expands into an event operating layer for many Solana
projects.

## 4-week Eternal sprint plan

Only start this sprint when the Eternal dashboard reopens. The sprint must
produce visible weekly progress and a final product submission.

### Week 1 - Super Hunts foundation

Deliver:
- Event Hunt spec covering geofence rules, organizer config, mission-pool
  templates, reward pools, and leaderboard data model.
- Repo cleanup plan for reviewability: secrets excluded, docs clear, build
  commands documented.
- Initial event schema in code or a standalone spec if code scope would collide
  with session-proof rollout.

1-minute update script:
This week I turned Seek's live scavenger-hunt loop into a concrete Super Hunts
event spec. The focus is making event quests configurable: venue rules,
mission pools, sponsor pools, leaderboards, and a path from $SKR-first rewards
to partner-token activations.

### Week 2 - Organizer and partner flow

Deliver:
- Organizer setup flow or prototype: event title, venue, mission set, token,
  prize pool, start/end time.
- Partner booth/activation model.
- Draft public Event Hunt Kit docs.

1-minute update script:
This week I built the organizer flow for Super Hunts: how a host defines the
event, selects missions, attaches sponsors, and creates a live quest layer for
attendees. The product is moving from a single app loop to repeatable partner
activation infrastructure.

### Week 3 - Token and proof layer

Deliver:
- Token support architecture for $SKR today and partner SPL tokens next.
- Prototype/dev branch for reward-pool abstraction, or a technical walkthrough
  if contract changes are intentionally deferred.
- Live stats/dashboard sketch for event operators.

1-minute update script:
This week I focused on the economic layer. Seek works with $SKR today, but
Super Hunts needs to power multiple project flywheels. I mapped the reward-pool
architecture for $SOL, $BONK, and partner SPL assets while preserving the
existing safety model around covered payout liability.

### Week 4 - Demo, submission, and launch packet

Deliver:
- Demo video or narrated walkthrough.
- Final deck link and technical walkthrough.
- Clean repo/readme for reviewers.
- Breakpoint/Superteam pilot launch packet.

1-minute update script:
This week I packaged the Super Hunts sprint into a submission: demo, technical
walkthrough, deck, and launch packet. Seek is already live; the Eternal sprint
shows how it becomes a repeatable event and token-distribution layer for Solana
communities.

## Final Eternal submission checklist

- [ ] Confirm Eternal is accepting new participants.
- [ ] Start timer in the Eternal dashboard only when four uninterrupted sprint
  weeks are realistic.
- [ ] Add clean README section for reviewers.
- [ ] Ensure repo has no secrets, APKs, local screenshots, or generated build
  output.
- [ ] Decide whether the submitted GitHub repo is public or private with
  reviewer access.
- [ ] Record a 2-3 minute technical walkthrough.
- [ ] Record a 60-90 second product demo.
- [ ] Submit canonical deck: `https://seek.mythx.art/grant`.
- [ ] Avoid the removed Vercel URL.
- [ ] Do not claim multi-token support is live until it is implemented.

## Technical walkthrough outline

1. Mobile app: Seeker-native React Native app, MWA flow, SGT verification,
   camera/location permissions, mission reveal, result screen.
2. Backend: Node/TypeScript API, Redis-backed mission state, Claude Vision
   validation, finalizer worker, health/stats endpoints.
3. Program: Anchor protocol, commit-reveal missions, $SKR token accounts, PDA
   house/singularity vaults, covered payout liability, hot/cold authority
   split.
4. Super Hunts extension: event config, geofenced mission pools, sponsor pools,
   leaderboards, partner-token architecture.
5. Safety: no uncovered payout liability, rate limits, Redis fail-closed,
   permission preflight, AI false-negative handling.

## Metrics and traction

Paste-ready:

Seek is live on Solana mainnet and available in the Solana dApp Store as
`app.seek.mobile`, v1.0.4. It won the Solana Mobile Monolith 2026 hackathon,
has 200+ user-reported Solana dApp Store reviews, and has processed real
SGT-attested on-chain quests through the app. Current live vault metrics:
78,288 $SKR in the house vault, 9,000 $SKR in the Singularity bonus pool, 0
pending/validating bounties, and finalizer queue size 0.

More precise version:

Production usage includes 10 mainnet quests undertaken before the latest
rolling stats cleanup/reset, with 1 currently visible in the live stats
endpoint. The live endpoint currently reports house vault 78,288 $SKR,
Singularity bonus pool 9,000 $SKR, and no pending finalizer backlog. The 200+
dApp Store review count is user-reported and should be supported with a
screenshot before final submission.

## How to answer "what changed during the sprint?"

Before sprint:
Seek is a live Seeker scavenger hunt with $SKR staking and AI validation.

After sprint:
Seek has a Super Hunts event layer: organizer config, event mission templates,
partner prize-pool architecture, live leaderboard path, public launch packet,
and a clear technical route to multi-token reward pools.

## Do not say

- Do not say Super Hunts is a separate app.
- Do not say multi-token rewards are already live unless implemented.
- Do not say Seek owns or controls the $SKR mint.
- Do not cite outdated 40% completion-rate marketing.
- Do not frame this as only a grant project; Colosseum is evaluating startup
  velocity and venture-scale potential.
