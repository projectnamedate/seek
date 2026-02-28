import rateLimit from 'express-rate-limit';

// Per-wallet rate limit for bounty start: 10 per minute
export const bountyStartLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.body?.playerWallet || 'unknown',
  validate: false,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many bounty start requests, slow down' },
});

// Per-wallet rate limit for bounty submit: 10 per minute
export const bountySubmitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.body?.playerWallet || 'unknown',
  validate: false,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many submission requests, slow down' },
});
