# dApp Store Listing Copy — Seek

Review + edit before submission. All fields referenced in the dApp Store
`config.yaml` that `@solana-mobile/dapp-store-cli` uses.

## App identity

- **Name:** Seek
- **Portal subtitle (≤ 50 chars):** Real-world hunts for $SKR rewards
- **Brand tagline:** Hunt. Capture. Win.
- **Package name:** `app.seek.mobile`
- **Category:** `GAME_ACTION` (primary) / `GAME_ADVENTURE` (secondary)
- **Developer name:** Projectnamedate LLC
- **Support email:** jeff@projectname.date  *(verify before submit)*
- **Website:** https://seek.mythx.art
- **Privacy policy URL:** https://seek.mythx.art/privacy  *(host the in-app privacy policy content on web)*
- **Terms of service URL:** https://seek.mythx.art/terms  *(host the in-app ToS content on web)*
- **Age rating:** 18+  *(paid SKR entry and cash-prize contest restrictions)*

## Short description (≤ 80 chars, NO emoji)

> Real-world scavenger hunts on Seeker with on-chain SKR rewards.

## Long description (≤ 4000 chars)

Use-as-is or trim; this is ready to paste.

```
Seek turns your Seeker phone into a real-world scavenger-hunt device.

HOW IT WORKS
1. Connect your Solana wallet with MWA (no browser, no extension).
2. Pick a tier: Easy (1000 $SKR / 3 min), Medium (3000 $SKR / 2 min),
   or Hard (5000 $SKR / 1 min).
3. Pay your entry and receive a randomly assigned target: a fire
   hydrant, a golden retriever, a Starbucks cup, etc.
4. Race the clock. Find it in the real world. Photograph it.
5. AI (Claude Vision) verifies: is it the correct object, not a
   screenshot, taken during the hunt window?
6. Mission complete = claim your return (entry fee + 1x reward).
   Mission missed = your entry fuels the ecosystem.

SKILL-BASED, ON-CHAIN, PHONE-NATIVE
- Every bounty is an on-chain transaction on Solana.
- Funds held in program-owned vaults. Fully non-custodial.
- Commit-reveal mission assignment blocks retroactive cheating.
- AI + EXIF metadata cross-check catches screenshots and old photos.
- Seeker Genesis Token holders get a confidence bonus on validation.
- Optimistic resolution with immediate on-chain finalization while public
  disputes are disabled.

ECONOMICS
- Complete: keep your entry + earn 1x more from the reward pool.
- Singularity pool: eligible completions can receive an additional bonus.
- Missed mission: 70% funds future rewards, 20% grows the Singularity
  pool, 10% treasury.

BUILT FOR SEEKER
- Native Mobile Wallet Adapter integration.
- .SKR name resolution as your in-app identity.
- Camera attestation via Seeker hardware integrity.
- This app can only exist on Seeker — that's the point.

SKR TOKEN
Entry fees and bounty payouts use $SKR, the Solana Mobile ecosystem
token. Get $SKR via any Solana exchange or DEX (Jupiter, Raydium).

DISCLAIMERS
18+ only. Skill-based competition. Not available in jurisdictions
where skill-based cash prize contests are restricted. Players are
responsible for verifying local eligibility. Outcomes depend on your
ability to locate real-world targets within a time limit.

Built by Projectnamedate LLC. Won the Solana Mobile Monolith 2026
hackathon. Now live on mainnet.
```

Character count: ~1950 (well under 4000 limit).

## What's new (for initial release)

```
Initial mainnet launch. Play Seek on your Seeker phone and complete
real-world scavenger hunts for $SKR rewards. 600 missions across three
difficulty tiers.
```

## Keywords / tags (if required by CLI)

solana, solana mobile, seeker, game, scavenger hunt, web3, crypto,
treasure hunt, skill-based, ai validation, mwa

## Screenshots needed (1080x2400 or Seeker native)

Recommended 5–6 screenshots, in this order:
1. Splash / brand screen
2. Home tier-select (showing balance + Singularity pool)
3. Bounty reveal ("Find a ceiling fan", timer counting down)
4. Camera viewfinder with target hint overlay
5. Validating screen ("AI analyzing your capture…")
6. Result screen — completed Easy mission — showing 2000 $SKR total return + AI confidence

Source screens already exist in the app — pull from a release build
running on a Seeker. Existing hackathon assets are in
`assets/deck/screens/`.

## App icon

- 512×512 PNG (NOT alpha-blended; solid background)
- Current asset: `mobile/assets/icon.png`
- Seeker adaptive icon (foreground + solid background): `mobile/assets/adaptive-icon.png`

## Feature graphic / banner

- Typically 1200×630 (dApp Store may request different — check CLI on first run)
- Suggested: the SEEK wordmark on black with a gradient "find" beam

## Review contact

Provide a test account for reviewers:
- Test wallet with ≥10,000 SKR + ≥0.1 SOL (for gas)
- Clear instructions in the reviewer notes field

## Reviewer notes (paste into CLI submit flow)

```
Seek is a skill-based scavenger hunt game built for Solana Seeker.
Players pay a $SKR entry (Solana Mobile's ecosystem token) to receive a
random real-world target, photograph it within a time limit, and
earn a completion reward if Claude Vision confirms the photo.

TO TEST:
1. Connect a Seeker-compatible wallet via Mobile Wallet Adapter. We provided
   a funded mainnet test wallet in the submission form.
2. Tap "Connect Wallet" → MWA approves.
3. Select any tier (recommend Easy — 1000 SKR, 3 min).
4. Tap "Start Hunt" and approve the transaction.
5. You'll receive a mission like "Find a red fire hydrant". Capture a real
   matching target; the app does not support a demo mode.
6. Tap the camera button, capture any photo.
7. AI validates in ~3 seconds. Complete an Easy hunt → 2,000 SKR total return.
   Missed mission → entry distributed to reward / Singularity / treasury pools.

18+ age gate on first launch. Skill-based — outcome depends on
player ability to locate real-world targets, not chance.

Source: github.com/projectnamedate/seek
Deck: included in submission.
```

## Update changelog gate

Do not mention payout math, `2x` total return, or economics in the Solana
Mobile Store "What's new" text. Before uploading an update, show the exact
changelog to the user and get explicit approval.
