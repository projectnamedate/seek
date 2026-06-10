# Handoff: deploy the `/grant` page to seek.mythx.art — for Codex

**Date:** 2026-06-08
**Author:** Claude (this session)
**Status update:** Codex deployed `/grant` to `seek.mythx.art` on 2026-06-08
using the `helsinki` SSH alias and a non-destructive `rsync` to
`/var/www/seek-web/`. The deck has since been revised to be grant-program
agnostic and to ask for `$30K`.

---

## What's already built (do NOT rebuild from scratch)

A native `/grant` route inside the existing static-export marketing site at
`web/`. It is a full-screen, 12-slide ecosystem grant deck for "Super Hunts".
Plain CSS scoped under `.gp` (no Tailwind — the site has none), Inter via
`next/font` (self-hosted at build), and tasteful animations.
It is grant-source agnostic, but the launch target is explicit: Super Hunts
should go live at Breakpoint London 2026 regardless of which grant funds the work.
The core narrative is that Seek is already live in the Solana dApp Store and
already won the Solana Mobile Monolith 2026 hackathon. The title slide uses the
large Seek logo, introduces Seek first as a real-world scavenger hunt on Seeker,
then frames Super Hunts as the next evolution: a Pokemon Go-level event
co-marketing solution for partners.

**Files added:**
- `web/app/grant/page.tsx` — server component, metadata, `robots: noindex`, Inter font.
- `web/app/grant/grant-deck.tsx` — `"use client"` deck: all copy + animation JS.
- `web/app/grant/grant.css` — scoped styles + animation keyframes.
- `web/public/grant/seek-logo.svg` and `web/public/grant/screens/*.png` — assets
  (copied from `assets/deck/`).

**Animations (all reduced-motion-safe; content is visible even if JS fails):**
scroll-reveal, stat count-up, radar sweep + animated gradient wordmark, card
hover-lift + floating phones, right-side dot-nav + scroll progress bar.

**Verified locally this session:**
- `cd web && npx tsc --noEmit` → clean.
- `cd web && npm run build` → clean static export; routes generated include
  `/grant` AND all existing routes (`/`, `/privacy`, `/terms`, `/license`,
  `/store`, sitemap, robots) — nothing broken.
- Served `web/out` and screenshotted `/grant` at 1440px and 390px (Chrome CDP):
  hero, solution, super-hunts, traction, public-good, milestones all render
  correctly; mobile stacks correctly and hides the dot-nav.

---

## Deploy steps

The site is a Next static export deployed to the Helsinki Mythx VPS at
`/var/www/seek-web` behind Caddy (per `tasks/where-we-are.md`). DNS:
`seek.mythx.art` → `204.168.242.220`.

```bash
cd /Users/hammer/Desktop/Claude/seek/web
npm run build            # regenerates web/out (already current, but safe to re-run)

# Deploy. User chose NON-destructive (no --delete) so nothing else under
# /var/www/seek-web is touched.
rsync -avz web/out/ helsinki:/var/www/seek-web/
```

- **No Caddy change should be needed.** The existing legal routes work as
  `privacy.html` etc., so Caddy already resolves clean URLs (`try_files`-style)
  to `.html`. The export produces `web/out/grant.html`, so `/grant` will resolve
  the same way. If Caddy is configured per-route instead of serving the dir,
  add a `/grant` mapping mirroring `/privacy`.
- Do not commit secrets, keys, or build output. `web/out/` is git-ignored.

## Post-deploy verification

```bash
curl -sI https://seek.mythx.art/grant | head -1     # expect HTTP/2 200
curl -sI https://seek.mythx.art/privacy | head -1   # expect 200 (regression check)
```
Then load https://seek.mythx.art/grant in a browser and confirm: hero radar
animates, scroll reveals fire, stat numbers count up, dot-nav tracks the active
slide.

---

## Screenshot accuracy

Current caveat 2026-06-08: `02-home.png` was restored to the real app UI
screenshot after the v1.0.4 store-marketing mockup looked wrong in the deck.
That real screenshot still shows the older `1000 / 2000 / 3000 SKR` ladder and
3x reward copy. The slide text uses the current `500 / 1000 / 2000 SKR` ladder;
capture a fresh in-app screenshot before claiming the image itself is current.

---

## Page content (what's on each slide)

1. **Hero** — large Seek logo + a short app explainer; Super Hunts as the next evolution; chips (Solana Mobile Monolith 2026 Hackathon Winner · live mainnet · dApp Store); Breakpoint London 2026; partner co-marketing; requesting $30K.
2. **Problem** — "Communities gather thousands of people. Almost none open a wallet because of it." + 3 cards.
3. **Solution** — Stake/Hunt/Prove/Win; 500/1000/2000 tiers in deck copy; 2× payout; phone screens.
4. **Super Hunts** — geofenced, sponsor-funded event co-marketing mode; Breakpoint London first target; 4 steps.
5. **Why now** — Breakpoint London as the forcing function for a repeatable event/community activation format.
6. **Traction** — Mainnet · v1.0.4 · ~76K $SKR vault · ~10% completion; on-chain addresses (program `DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v`, $SKR mint `SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3`, state PDA `8KUctm4YQRns3788cQWyjc7SFtKSnws4m4FTZ72YDfYm`).
7. **SMS** — MWA, SGT gating, camera+location, Seeker-exclusive; phone screens.
8. **$SKR** — entry / rewards / Singularity pool / sponsor perks.
9. **Public good** — open-source Event Hunt Kit (MIT).
10. **Milestones** — 4 × 4-week milestones (Event Hunt mode → Breakpoint go-live → Hunt Kit → post-Breakpoint circuit/VRF).
11. **Budget** — $30K itemized for the reusable event layer.
12. **Ask** — "Fund the hunt."

> The standalone Vercel mirror was retired on 2026-06-08 at the user's request.
> `https://grant-deck.vercel.app` and known raw Vercel deployment URLs now return
> 404. Keep `https://seek.mythx.art/grant` as the only public pitch-deck URL.
> The separate `grant-deck/` Tailwind app remains local source only unless the
> user explicitly asks to re-publish it.

## Related
- Full grant application packet: `tasks/solana-mobile-grant-2026-06-07.md`
- Brand bible: `assets/deck/seek-brand-kit.md`
