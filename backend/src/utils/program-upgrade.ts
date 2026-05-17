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
  if (buffer.length < 13) {
    throw new Error(
      `ProgramData account data too short: ${buffer.length} bytes`
    );
  }

  const compactOption = buffer.readUInt8(12);
  if (compactOption === 0) {
    return null;
  }

  if (compactOption === 1) {
    // Current loader-v3 ProgramData metadata is 45 bytes:
    // tag u32 + slot u64 + Option<Pubkey> tag u8 + pubkey [u8; 32].
    // Some old fixtures/tools represented Option as a u32; keep support below.
    const looksLikeLegacyU32Option =
      buffer.length >= 48 &&
      buffer.readUInt32LE(12) === 1 &&
      buffer[13] === 0 &&
      buffer[14] === 0 &&
      buffer[15] === 0;

    if (!looksLikeLegacyU32Option) {
      if (buffer.length < 45) {
        throw new Error(
          `ProgramData account missing upgrade authority pubkey: ${buffer.length} bytes`
        );
      }
      return new PublicKey(buffer.subarray(13, 45));
    }
  }

  if (buffer.length < 48) {
    throw new Error(
      `ProgramData account missing upgrade authority pubkey: ${buffer.length} bytes`
    );
  }

  const legacyOption = buffer.readUInt32LE(12);
  if (legacyOption === 0) {
    return null;
  }
  if (legacyOption !== 1) {
    throw new Error(
      `Unexpected ProgramData upgrade authority option ${legacyOption}`
    );
  }

  return new PublicKey(buffer.subarray(16, 48));
}
