import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Schema for environment validation
const envSchema = z.object({
  // Server
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),

  // Solana
  SOLANA_RPC_URL: z.string().url(),
  SOLANA_NETWORK: z.enum(['devnet', 'mainnet-beta', 'localnet']).default('devnet'),
  // Cold authority key is only needed by local admin/init scripts. The
  // production backend should not hold a Ledger/private cold authority key.
  AUTHORITY_PRIVATE_KEY: z.string().optional(),
  // Hot authority used for reveal_mission + propose_resolution. If unset, falls
  // back to AUTHORITY_PRIVATE_KEY (dev only — mainnet must set this).
  HOT_AUTHORITY_PRIVATE_KEY: z.string().optional(),

  // Program IDs
  SEEK_PROGRAM_ID: z.string().min(32),
  SKR_MINT: z.string().min(32),

  // Anthropic (Claude API)
  ANTHROPIC_API_KEY: z.string().min(1),

  // Validation settings
  MAX_PHOTO_AGE_SECONDS: z.string().default('300'),
  MIN_CONFIDENCE_SCORE: z.string().default('0.7'),
  MAX_BOUNTIES_PER_WALLET_PER_DAY: z.string().default('20'),
  CHALLENGE_PERIOD_SECONDS: z.string().default('0'),

  // SGT Verification (optional)
  HELIUS_API_KEY: z.string().optional(),
  SGT_BONUS_CONFIDENCE_REDUCTION: z.string().default('0.05'),

  // Observability + persistence (optional; production strongly recommended)
  SENTRY_DSN: z.string().optional(),
  REDIS_URL: z.string().optional(),
});

// Parse and validate environment
function loadConfig() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('Invalid environment configuration:');
    console.error(parsed.error.format());
    throw new Error('Environment validation failed');
  }

  // Safety: never allow development mode on mainnet
  if (parsed.data.NODE_ENV === 'development' && parsed.data.SOLANA_NETWORK === 'mainnet-beta') {
    throw new Error('Cannot run in development mode on mainnet-beta. Set NODE_ENV=production.');
  }

  // Safety: on mainnet, require separate hot authority (limits blast radius).
  if (parsed.data.SOLANA_NETWORK === 'mainnet-beta' && !parsed.data.HOT_AUTHORITY_PRIVATE_KEY) {
    throw new Error(
      'HOT_AUTHORITY_PRIVATE_KEY is required on mainnet-beta. ' +
      'Set it to a dedicated hot keypair (reveal/propose only) so backend compromise ' +
      'cannot rotate authority or drain treasury.'
    );
  }

  // Safety: on mainnet, hot and cold keys must be DIFFERENT if a cold key is
  // present locally. Railway should normally omit AUTHORITY_PRIVATE_KEY.
  if (
    parsed.data.SOLANA_NETWORK === 'mainnet-beta' &&
    parsed.data.AUTHORITY_PRIVATE_KEY &&
    parsed.data.HOT_AUTHORITY_PRIVATE_KEY &&
    parsed.data.HOT_AUTHORITY_PRIVATE_KEY === parsed.data.AUTHORITY_PRIVATE_KEY
  ) {
    throw new Error(
      'HOT_AUTHORITY_PRIVATE_KEY must be DIFFERENT from AUTHORITY_PRIVATE_KEY on mainnet. ' +
      'They are the same — backup deploy mistake. Generate a fresh hot keypair: ' +
      '`solana-keygen new --outfile .secrets/solana/seek-hot.json`, set 0600, ' +
      'verify the pubkey, back it up, and use its base58 secret.'
    );
  }

  return {
    server: {
      port: parseInt(parsed.data.PORT, 10),
      nodeEnv: parsed.data.NODE_ENV,
      isDev: parsed.data.NODE_ENV === 'development',
      isProd: parsed.data.NODE_ENV === 'production',
    },
    solana: {
      rpcUrl: parsed.data.SOLANA_RPC_URL,
      network: parsed.data.SOLANA_NETWORK,
      authorityPrivateKey: parsed.data.AUTHORITY_PRIVATE_KEY || '',
      hotAuthorityPrivateKey: parsed.data.HOT_AUTHORITY_PRIVATE_KEY,
    },
    program: {
      seekProgramId: parsed.data.SEEK_PROGRAM_ID,
      skrMint: parsed.data.SKR_MINT,
    },
    anthropic: {
      apiKey: parsed.data.ANTHROPIC_API_KEY,
    },
    validation: {
      maxPhotoAgeSeconds: parseInt(parsed.data.MAX_PHOTO_AGE_SECONDS, 10),
      minConfidenceScore: parseFloat(parsed.data.MIN_CONFIDENCE_SCORE),
      maxBountiesPerWalletPerDay: parseInt(parsed.data.MAX_BOUNTIES_PER_WALLET_PER_DAY, 10),
    },
    sgt: {
      heliusApiKey: parsed.data.HELIUS_API_KEY || '',
      bonusConfidenceReduction: parseFloat(parsed.data.SGT_BONUS_CONFIDENCE_REDUCTION),
    },
    // Protocol parameters. Public disputes are disabled in the current mainnet
    // program, so finalization is immediate and this must match the on-chain
    // CHALLENGE_PERIOD const.
    protocol: {
      challengePeriodSeconds: parseInt(parsed.data.CHALLENGE_PERIOD_SECONDS, 10),
    },
    sentry: {
      dsn: parsed.data.SENTRY_DSN || '',
    },
    redis: {
      url: parsed.data.REDIS_URL || '',
    },
  };
}

export const config = loadConfig();
export type Config = typeof config;
