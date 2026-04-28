import rateLimit from 'express-rate-limit';

// Per-IP rate limit for /prepare: 20 per minute.
// /prepare is unauthenticated and spawns a mission commitment + Redis entry
// with a 5-min TTL, so an unthrottled attacker could bloat Redis / exhaust
// the free-tier command budget. 20/min leaves plenty of room for legitimate
// retries but caps obvious abuse.
export const bountyPrepareLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  validate: false,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many prepare requests, slow down' },
});

// Per-IP rate limit for bounty start: 10 per minute
export const bountyStartLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  // Key on IP — body fields are attacker-controlled and can't be trusted
  validate: false,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many bounty start requests, slow down' },
});

// Per-IP rate limit for bounty submit: 10 per minute
export const bountySubmitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  validate: false,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many submission requests, slow down' },
});

// SGT routes hit Helius (paid RPC) — cap at 30/min/IP. SGT verification is
// once per wallet per 30d, so this is plenty of slack for legit retries.
export const sgtLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  validate: false,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many SGT requests, slow down' },
});

// SKR domain lookup hits mainnet RPC — cap at 60/min/IP. Resolutions are
// cached client-side so this is the cold-cache cap.
export const skrLookupLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  validate: false,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many lookup requests, slow down' },
});
