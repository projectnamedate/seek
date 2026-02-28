# Seek Protocol Security Audit — 2026-02-27

## Smart Contract Findings

| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| C-1 | CRITICAL | Predictable jackpot randomness (`slot+timestamp % 500`) | Pre-mainnet |
| H-1 | HIGH | No cancel/timeout — player funds locked if backend dies | Pre-mainnet |
| H-2 | HIGH | Dispute flow accounting bugs (3 sub-bugs) | Pre-mainnet |
| H-3 | HIGH | Single authority, no key rotation/multisig | Pre-mainnet |
| M-1 | MEDIUM | Bounty accounts never closed (~0.003 SOL locked each) | Pre-mainnet |
| M-2 | MEDIUM | Tracked vs actual vault balance divergence | Pre-mainnet |
| L-1 | LOW | Treasury mint not explicitly validated in FinalizeBounty | Pre-mainnet |
| L-2 | LOW | No duplicate mutable account check | Pre-mainnet |
| L-3 | LOW | No balance tracking for treasury withdrawals | Pre-mainnet |
| I-1 | INFO | `Cancelled` status is dead code | - |
| I-2 | INFO | `get_tier_duration` silent default fallback | - |
| I-3 | INFO | 9 bytes unused padding in Bounty account | - |

## Backend Findings

| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| C-1 | CRITICAL | Auth removed from /start — wallet impersonation | FIX NOW |
| C-2 | CRITICAL | /submit ownership check bypassable (omit playerWallet) | FIX NOW |
| C-3 | CRITICAL | Authority private key in .env (devnet, gitignored) | Acceptable for devnet |
| H-1 | HIGH | Bounty ID enumeration via GET /player/:wallet | FIX NOW |
| H-2 | HIGH | Rate limiter keyed on attacker-controlled body field | FIX NOW |
| H-3 | HIGH | No on-chain tx verification in /start | FIX NOW |
| H-4 | HIGH | Prepared bounty data not tied to authenticated player | Pre-mainnet |
| M-1 | MEDIUM | In-memory state loss on restart | Pre-mainnet (Redis) |
| M-2 | MEDIUM | Race condition in bounty creation/submission | Pre-mainnet |
| M-3 | MEDIUM | CORS provides zero API protection | Pre-mainnet |
| M-4 | MEDIUM | Dev mode skips security checks | Acceptable for devnet |
| M-5 | MEDIUM | Mission mismatch between prepare/start | FIX NOW |
| L-1 | LOW | Anthropic API key in .env | Acceptable |
| L-2 | LOW | trust proxy without verification | Acceptable for devnet |
| L-3 | LOW | Generous rate limits | Acceptable for devnet |
| L-4 | LOW | Demo submit has no ID validation | Acceptable |
| L-5 | LOW | createBounty ignores prepared mission | FIX NOW |
