# dApp Store Listing Copy — Seek

Review + edit before submission. All fields referenced in the dApp Store
`config.yaml` that `@solana-mobile/dapp-store-cli` uses.

## App identity

- **Name:** Seek
- **Subtitle / tagline (≤ 30 chars):** Hunt. Capture. Win.
- **Package name:** `app.seek.mobile`
- **Category:** `GAME_ACTION` (primary) / `GAME_ADVENTURE` (secondary)
- **Developer name:** Projectnamedate LLC
- **Support email:** jeff@projectname.date  *(verify before submit)*
- **Website:** https://seek.app  *(pending domain purchase)*
- **Privacy policy URL:** https://seek.app/privacy  *(host the in-app privacy policy content on web)*
- **Terms of service URL:** https://seek.app/terms  *(host the in-app ToS content on web)*
- **Age rating:** 18+  *(economic staking triggers this)*

## Short description (≤ 80 chars, NO emoji)

> Pokemon GO for crypto. Hunt real-world targets, win 2x your $SKR entry.

## Long description (≤ 4000 chars)

Use-as-is or trim; this is ready to paste.

```
Seek turns your Seeker phone into a real-world treasure-hunting device.

HOW IT WORKS
1. Connect your Solana wallet with MWA (no browser, no extension).
2. Pick a tier: Easy (1000 $SKR / 3 min), Medium (2000 $SKR / 2 min),
   or Hard (3000 $SKR / 1 min).
3. Pay your entry and receive a randomly-assigned target: a fire
   hydrant, a golden retriever, a Starbucks cup, etc.
4. Race the clock. Find it in the real world. Photograph it.
5. AI (Claude Vision) verifies: is it the correct object, not a
   screenshot, taken during the hunt window?
6. Mission complete = claim your bounty (entry fee + 2x profit).
   Mission failed = your entry fuels the ecosystem.

SKILL-BASED, ON-CHAIN, PHONE-NATIVE
- Every bounty is an on-chain transaction on Solana.
- Funds held in program-owned vaults. Fully non-custodial.
- Commit-reveal mission assignment blocks retroactive cheating.
- AI + EXIF metadata cross-check catches screenshots and old photos.
- Seeker Genesis Token holders get a confidence bonus on validation.
- Optimistic resolution with a 5-minute dispute window.

ECONOMICS
- Win:  keep your entry + earn 2x more from the house pool.
- Jackpot: 1-in-500 chance on every win to claim the Singularity pool.
- Loss: 70% funds future winnings, 20% grows the jackpot, 10% treasury.

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
responsible for verifying local eligibility. Seek is not a traditional
gambling product — outcomes depend on your ability to locate
real-world targets within a time limit.

Built by Projectnamedate LLC. Won the Solana Mobile Monolith 2026
hackathon. Now live on mainnet.
```

Character count: ~1950 (well under 4000 limit).

## What's new (for initial release)

```
Initial mainnet launch. Play Seek on your Seeker phone and hunt
real-world targets for $SKR rewards. 300+ missions across three
difficulty tiers.
```

## Keywords / tags (if required by CLI)

solana, solana mobile, seeker, game, scavenger hunt, web3, crypto,
treasure hunt, skill-based, ai validation, mwa

## Screenshots needed (1080x2400 or Seeker native)

Recommended 5–6 screenshots, in this order:
1. Splash / brand screen
2. Home tier-select (showing balance + jackpot pool)
3. Bounty reveal ("Find a ceiling fan", timer counting down)
4. Camera viewfinder with target hint overlay
5. Validating screen ("AI analyzing your capture…")
6. Result screen — winning — showing +2000 $SKR + AI confidence + jackpot? tag

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
Players stake $SKR (Solana Mobile's ecosystem token) to receive a
random real-world target, photograph it within a time limit, and
earn 2x their entry if Claude Vision confirms the photo.

TO TEST:
1. Connect wallet (Phantom on devnet, Solflare, etc). We provided a
   test wallet in the submission form with 50,000 SKR.
2. Tap "Connect Wallet" → MWA approves.
3. Select any tier (recommend Easy — 1000 SKR, 3 min).
4. Tap "Start Hunt" and approve the transaction.
5. You'll receive a mission like "Find a red fire hydrant". For
   testing, any photo of the target works — AI is lenient in demo.
6. Tap the camera button, capture any photo.
7. AI validates in ~3 seconds. Win → +2000 SKR. Loss → entry
   distributed to house / jackpot / treasury pools.

18+ age gate on first launch. Skill-based — outcome depends on
player ability to locate real-world targets, not chance.

Source: github.com/projectnamedate/seek
Deck: included in submission.
```
