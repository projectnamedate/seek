import { PublicKey } from '@solana/web3.js';

export const BPF_LOADER_UPGRADEABLE_PROGRAM_ID = new PublicKey(
  'BPFLoaderUpgradeab1e11111111111111111111111'
);

export function parseProgramDataAddress(data: Buffer | Uint8Array): PublicKey {
  const buffer = Buffer.from(data);
  const tag = buffer.readUInt32LE(0);

  if (tag !== 2) {
    throw new Error(
      `Expected upgradeable loader Program account tag 2, got ${tag}`
    );
  }
  if (buffer.length < 36) {
    throw new Error(`Program account data too short: ${buffer.length} bytes`);
  }

  return new PublicKey(buffer.subarray(4, 36));
}

export function parseProgramDataUpgradeAuthority(
  data: Buffer | Uint8Array
): PublicKey | null {
  const buffer = Buffer.from(data);
  const tag = buffer.readUInt32LE(0);

  if (tag !== 3) {
    throw new Error(
      `Expected upgradeable loader ProgramData account tag 3, got ${tag}`
    );
  }
  if (buffer.length < 16) {
    throw new Error(
      `ProgramData account data too short: ${buffer.length} bytes`
    );
  }

  const option = buffer.readUInt32LE(12);
  if (option === 0) {
    return null;
  }
  if (option !== 1) {
    throw new Error(
      `Unexpected ProgramData upgrade authority option ${option}`
    );
  }
  if (buffer.length < 48) {
    throw new Error(
      `ProgramData account missing upgrade authority pubkey: ${buffer.length} bytes`
    );
  }

  return new PublicKey(buffer.subarray(16, 48));
}
