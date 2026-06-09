const DEFAULT_BLOCKED_PLAYER_WALLETS = [
  'Dfui8Dph4AKDVgzW5deynTvJN4n3UPvam3Sb4aH7BgU6',
];

const DEFAULT_BLOCKED_SGT_MINTS = [
  'B1fHfkVLjnqCih7xcN7gDyDfu7eR2PtZxzQvZiupPPDH',
];

export const BLOCKED_BOUNTY_ERROR = 'This wallet is not eligible for Seek bounties';

export function parseAddressList(value: string | undefined): Set<string> {
  return new Set(
    (value ?? '')
      .split(/[,\n]/)
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
}

function configuredBlockedWallets(): Set<string> {
  return new Set([
    ...DEFAULT_BLOCKED_PLAYER_WALLETS,
    ...parseAddressList(process.env.BLOCKED_PLAYER_WALLETS),
  ]);
}

function configuredBlockedSgtMints(): Set<string> {
  return new Set([
    ...DEFAULT_BLOCKED_SGT_MINTS,
    ...parseAddressList(process.env.BLOCKED_SGT_MINTS),
  ]);
}

export function hasBlockedSgtMints(): boolean {
  return configuredBlockedSgtMints().size > 0;
}

export function isBlockedBountyActor({
  walletAddress,
  sgtMintAddress,
}: {
  walletAddress?: string | null;
  sgtMintAddress?: string | null;
}): boolean {
  if (walletAddress && configuredBlockedWallets().has(walletAddress)) {
    return true;
  }
  if (sgtMintAddress && configuredBlockedSgtMints().has(sgtMintAddress)) {
    return true;
  }
  return false;
}
