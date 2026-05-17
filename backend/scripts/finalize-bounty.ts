import 'dotenv/config';
import { PublicKey } from '@solana/web3.js';
import { closeRedis } from '../src/services/redis.service';
import { finalizeBountyNow } from '../src/services/finalizer.service';

async function main(): Promise<void> {
  const bountyPda = process.argv[2];
  if (!bountyPda) {
    throw new Error('Usage: npx ts-node scripts/finalize-bounty.ts <bounty_pda>');
  }

  const normalized = new PublicKey(bountyPda).toBase58();
  const signature = await finalizeBountyNow(normalized);
  console.log(JSON.stringify({ bountyPda: normalized, signature }));
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => {
    void closeRedis();
  });
