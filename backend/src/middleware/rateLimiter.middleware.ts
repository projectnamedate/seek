import rateLimit from 'express-rate-limit';

// Per-wallet rate limit for bounty start: 5 per minute
// Must run AFTER auth middleware so verifiedWallet is set
export const bountyStartLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => (req as any).verifiedWallet || req.ip || 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many bounty start requests, slow down' },
});

// Per-wallet rate limit for bounty submit: 10 per minute
// Must run AFTER auth middleware so verifiedWallet is set
export const bountySubmitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => (req as any).verifiedWallet || req.ip || 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many submission requests, slow down' },
});
