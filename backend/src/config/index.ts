import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Schema for environment validation
const envSchema = z.object({
  // Server
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Solana
  SOLANA_RPC_URL: z.string().url(),
  SOLANA_NETWORK: z.enum(['devnet', 'mainnet-beta', 'localnet']).default('devnet'),
  AUTHORITY_PRIVATE_KEY: z.string().min(1),

  // Program IDs
  SEEK_PROGRAM_ID: z.string().min(32),
  SKR_MINT: z.string().min(32),

  // Anthropic (Claude API)
  ANTHROPIC_API_KEY: z.string().min(1),

  // Validation settings
  MAX_PHOTO_AGE_SECONDS: z.string().default('300'),
  MIN_CONFIDENCE_SCORE: z.string().default('0.7'),
});

// Parse and validate environment
function loadConfig() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('Invalid environment configuration:');
    console.error(parsed.error.format());
    throw new Error('Environment validation failed');
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
      authorityPrivateKey: parsed.data.AUTHORITY_PRIVATE_KEY,
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
    },
  };
}

export const config = loadConfig();
export type Config = typeof config;
