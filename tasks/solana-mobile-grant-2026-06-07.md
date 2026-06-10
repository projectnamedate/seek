# Solana Mobile Builder Grant — Seek "Super Hunts" application packet

Created 2026-06-07. Form: https://airtable.com/appw7jfRXG6Joia2b/pagGNMPX6qleBYHNp/form
Program: https://solanamobile.com/grants · rolling review, 4–6 week response.

**Pitch deck (required field) is LIVE:** https://seek.mythx.art/grant
(canonical source in `web/app/grant/`, deployed to the Mythx VPS, `noindex`).
The public Vercel mirror was removed; submit only the Mythx URL. Standalone
mirror source remains in `grant-deck/` for local/reference use only.

---

## Paste-ready field answers

| Field | Value |
|---|---|
| **Project Name** | Seek |
| **Requested Amount** | `$20001 - $30,000` |
| **Website URL** | https://seek.mythx.art |
| **Country** | United States |
| **First Name** | Jeff |
| **Last Name** | ⚠️ **YOU FILL** |
| **Email** | jeff@projectname.date *(confirm)* |
| **Category** | Games *(primary)*; add Consumer / Entertainment if multi-select |
| **Twitter (X)** | ⚠️ **YOU FILL** (optional) |
| **Telegram** | ⚠️ **YOU FILL** (required — "for contracting") |
| **Link To Pitch Deck** | https://seek.mythx.art/grant |
| **Link To Demo Video** | *(leave blank — decided to skip)* |
| **Solana On-Chain Accounts** | see block below |
| **Do you have an Android app already?** | ✅ Yes (check the box) |
| **Solana dApp Store Status** | Yes — live (`app.seek.mobile`, v1.0.4) |
| **Funding status** | Bootstrapped / self-funded |
| **Relevant metrics** | see block below |

### Solana On-Chain Accounts (paste verbatim — public addresses only)
```
Program ID:      DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v
$SKR mint:       SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3
Global State PDA: 8KUctm4YQRns3788cQWyjc7SFtKSnws4m4FTZ72YDfYm
```
> Never paste hot-authority, fee-payer, publisher, or any private key here.

### Relevant metrics (paste / trim to taste)
> Seek is live on Solana mainnet and shipping on the Solana dApp Store
> (`app.seek.mobile`, v1.0.4). Winner of the Solana Mobile Monolith 2026
> hackathon. The on-chain protocol holds a ~76K $SKR house vault funding real
> 2× payouts, runs a Singularity bonus pool, and operates at a ~10% completion
> rate by economic design. Built solo, end to end — Anchor program, Node/TS
> backend, and a React Native + MWA Seeker client. Real players have run real
> on-chain bounties.

---

## Narrative backup (if a reviewer asks for detail)

**One-liner:** Seek is a live Solana dApp Store app and Solana Mobile Monolith
2026 hackathon winner. This grant funds **Super Hunts** — Seek's next evolution:
a geofenced, sponsor-funded hunt mode that turns partner events into Pokemon
Go-level co-marketing campaigns, with Breakpoint London (Nov 15–17 2026) as the
first flagship go-live target — plus an open-source **Event Hunt Kit** so any
organizer can run one.

**Why it fits the program:** viral/sticky consumer app · enhances the Seeker UX ·
creative $SKR utility (entry, prize, perk) · deep SMS use (MWA, SGT gating,
camera, location) · partner co-marketing surface · ships a public good.

**Milestones (16 weeks):**
- M1 (wk 1–4) — Event Hunt mode: geofenced mission pools, organizer config, sponsor prize-pool escrow.
- M2 (wk 5–8) — Breakpoint go-live: live leaderboard + real-time event dashboard.
- M3 (wk 9–12) — Event Hunt Kit: open-source SDK, docs, template (the public good).
- M4 (wk 13–16) — Scale & circuit: Switchboard VRF for fair bonuses at scale + 2–3 more events.

**Budget — $30K:**
| Line | Amount |
|---|---|
| Engineering — event mode, geofencing, leaderboard, real-time | $12K |
| Open-source Event Hunt Kit (SDK + docs) | $4K |
| Switchboard On-Demand VRF integration | $3K |
| Infra / RPC / Redis scaling for event spikes | $3K |
| On-site activation — pilots, prize-pool seed, partner ops | $6K |
| Concurrency & security pass for event-scale load | $2K |
| **Total** | **$30K** |

---

## Before you submit — open items
1. Fill **Last Name**, **Telegram** (required), **Twitter** (optional); confirm email/country.
2. Review the live deck end-to-end: https://seek.mythx.art/grant

## Audit results (2026-06-07)
- **Code:** `tsc --noEmit` exit 0 · `next build` clean · no unused imports · no
  secret/key leakage in `grant-deck/` · `.gitignore` covers build/secret paths ·
  content reveals are CSS-on-load (render even if JS/observers fail).
- **Design:** brand-accurate to `assets/deck/seek-brand-kit.md` (cyan `#61afbd`,
  near-black, Inter Black, cyan glow, radar motif) · all 12 slides verified at
  1440px and 390px (two-column slides + budget table stack correctly on mobile) ·
  `robots: noindex` set · public Vercel mirror retired after canonical Mythx
  deploy.

## Deck revision note (2026-06-08)
- Canonical deck is now grant-program agnostic for reuse across Solana Mobile,
  MonkeFoundry, and similar ecosystem grant applications.
- The grant source is agnostic, but the product goal is not: Super Hunts should
  go live at Breakpoint London 2026 as the first flagship activation.
- Deck narrative now foregrounds that Seek is already live in the Solana dApp
  Store, already won Monolith 2026, and the next growth step is Super Hunts as a
  Pokemon Go-level event co-marketing solution for partners.
- Public Vercel mirror removed; the pitch-deck URL for applications is only
  `https://seek.mythx.art/grant`.
- Ask changed from `$25K` / `$20K-$30K band` language to a direct `$30K`.
- Deck copy uses the v1.0.4 `500 / 1000 / 2000 SKR` ladder. The title solution
  screenshot was restored to the real app UI after the store-marketing mockup
  looked wrong; that image still contains older tier copy and should be replaced
  only with a fresh in-app capture.
