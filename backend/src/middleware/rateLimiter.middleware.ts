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
