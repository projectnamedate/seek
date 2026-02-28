# Lessons Learned

## MWA (Mobile Wallet Adapter) — Critical Rules

### No back-to-back transact sessions
- Each `signMessage` and `signAndSendTransaction` opens a separate deep-link to Phantom
- Calling them sequentially causes the second to **hang silently** — Phantom never opens
- **Rule**: Only ONE MWA call per user action. If you need both auth signing and tx signing, either:
  - Remove auth from the endpoint (on-chain tx already proves ownership)
  - Use a single low-level `transact` session for both operations
- We removed `requireWalletAuth` from `/start` and `/submit` for this reason

### Post-deep-link network delay
- After Phantom returns control via deep-link, React Native's network stack needs ~1-2s to stabilize
- **Rule**: Add `await new Promise(r => setTimeout(r, 1500))` before making HTTP calls after MWA returns

## Auth Middleware Removal Checklist
When removing `requireWalletAuth` from a route, you MUST also update:
1. **Rate limiter `keyGenerator`** — it used `(req as any).verifiedWallet` which is now undefined
2. **Ownership checks** — any `bounty.playerWallet !== (req as any).verifiedWallet` will always fail (403)
3. **Auth window** — if pre-signing auth, increase `SIGNATURE_MAX_AGE_MS` to account for user approval time

## Express Behind Proxy/Tunnel
- Cloudflare tunnel / ngrok adds `X-Forwarded-For` headers
- Must set `app.set('trust proxy', 1)` or rate limiters crash with `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`
- Rate limiter `validate` should be `false` in dev to avoid IPv6 warnings
- **Always verify the tunnel port matches the backend port** (e.g., backend on 3001, not 3000)

## Release Build Testing
- `NGROK_URL` in `mobile/src/config/index.ts` must be updated every time a new tunnel is started
- Build with `npx expo run:android --variant release` for real device testing
- Backend auto-restarts via `ts-node-dev --respawn` — no manual restart needed after backend edits
- Mobile changes require a full rebuild
