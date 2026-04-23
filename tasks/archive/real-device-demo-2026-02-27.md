# Real Android Device Demo (Hybrid Mode)

> **Historical document.** This is the hackathon-era device demo plan
> (Feb 2026). The "Code Changes" section is all done. The "Manual Steps"
> section is superseded by the production deploy runbook at
> [`../../backend/scripts/DEPLOY_MAINNET.md`](../../backend/scripts/DEPLOY_MAINNET.md).
> For the current roadmap, see [`../roadmap.md`](../roadmap.md).


## Code Changes - DONE
- [x] Centralize config: `NGROK_URL`, `API_BASE_URL`, hybrid `DEMO_MODE` in `mobile/src/config/index.ts`
- [x] `api.service.ts`: import from config, use `DEMO_MODE.USE_DEMO_ENDPOINTS`
- [x] `sgt.service.ts`: import `API_BASE_URL` from config
- [x] `AppContext.tsx`: MWA-first connect, real balance fetch, `fullAddress` tracking
- [x] `wallet.service.ts`: add `fetchRealBalance()`, `fullAddress` in WalletState
- [x] `types/index.ts`: add `fullAddress` to WalletState interface
- [x] `BountyRevealScreen.tsx`: use `fullAddress` for API calls
- [x] Backend CORS: allow all origins in dev mode for ngrok
- [x] `admin.ts`: add `mint` and `airdrop` commands

## Manual Steps - TODO
1. Start backend: `cd backend && npm run dev`
2. Start ngrok: `ngrok http 3001`
3. Update `NGROK_URL` in `mobile/src/config/index.ts` with ngrok URL
4. Build: `cd mobile && npx expo run:android` (phone plugged in USB)
5. Install Phantom on phone, set to devnet
6. Mint SKR: `npx ts-node scripts/admin.ts mint <phone-wallet-addr> 50000`
7. Airdrop SOL: `npx ts-node scripts/admin.ts airdrop <phone-wallet-addr> 2`
8. Test full flow (see verification checklist below)

## Verification Checklist
- [ ] Phantom opens via MWA on "Connect Wallet"
- [ ] Real devnet address shown on HomeScreen
- [ ] Real SKR balance displayed
- [ ] Bounty starts with correct tier/time
- [ ] Camera captures and sends photo via ngrok
- [ ] Claude validates, returns win/loss
- [ ] Result screen shows animations + sound
- [ ] "HUNT AGAIN" returns to home cleanly
