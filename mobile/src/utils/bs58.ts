/**
 * Base58 encoding (Solana alphabet). Lifted out of api.service.ts and
 * sgt.service.ts which both had their own copies. Solana's web3.js bundles
 * bs58 transitively but does not re-export it; rather than depend on a
 * transitive, we keep this 25-line helper.
 */

const BS58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function encodeBase58(bytes: Uint8Array): string {
  let zeros = 0;
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) zeros++;

  let num = BigInt('0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''));
  let result = '';
  while (num > 0n) {
    result = BS58_CHARS[Number(num % 58n)] + result;
    num = num / 58n;
  }

  return '1'.repeat(zeros) + result;
}
