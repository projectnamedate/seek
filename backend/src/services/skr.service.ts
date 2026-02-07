import { Connection, PublicKey } from '@solana/web3.js';
import { TldParser } from '@onsol/tldparser';
import { config } from '../config';

// Demo .skr names for testing
const DEMO_SKR_NAMES: Record<string, string> = {
  'Demo7xR3kN9vU2mQp8sW4yL6hJ1cBfT5gA2dSeeker': 'seeker_demo',
  // Add more demo mappings as needed
};

class SkrService {
  private parser: TldParser | null = null;
  private connection: Connection | null = null;

  /**
   * Initialize the TldParser for mainnet resolution
   */
  private async getParser(): Promise<TldParser> {
    if (!this.parser) {
      // .skr resolution only works on mainnet
      const mainnetRpc = 'https://api.mainnet-beta.solana.com';
      this.connection = new Connection(mainnetRpc);
      this.parser = new TldParser(this.connection);
    }
    return this.parser;
  }

  /**
   * Check if we should use demo mode
   */
  private isDemoMode(): boolean {
    return config.server.isDev || config.solana.network !== 'mainnet-beta';
  }

  /**
   * Resolve a wallet address to its .skr domain name
   * @param walletAddress - The Solana wallet address
   * @returns The .skr domain name or null if not found
   */
  async resolveAddressToSkr(walletAddress: string): Promise<string | null> {
    try {
      // Demo mode - return mock data
      if (this.isDemoMode()) {
        console.log('[SKR] Demo mode - checking mock data for:', walletAddress);
        const demoName = DEMO_SKR_NAMES[walletAddress];
        if (demoName) {
          return `${demoName}.skr`;
        }
        // For any address starting with "Demo", generate a fake .skr name
        if (walletAddress.startsWith('Demo')) {
          return `player_${walletAddress.slice(4, 8).toLowerCase()}.skr`;
        }
        return null;
      }

      // Production mode - real resolution
      console.log('[SKR] Resolving address to .skr:', walletAddress);
      const parser = await this.getParser();
      const pubkey = new PublicKey(walletAddress);

      const domains = await parser.getParsedAllUserDomainsFromTld(pubkey, 'skr');

      if (domains && domains.length > 0) {
        const skrName = `${domains[0].domain}.skr`;
        console.log('[SKR] Found .skr name:', skrName);
        return skrName;
      }

      console.log('[SKR] No .skr domain found for address');
      return null;
    } catch (error) {
      console.error('[SKR] Error resolving address:', error);
      return null;
    }
  }

  /**
   * Resolve a .skr domain name to its wallet address
   * @param skrDomain - The .skr domain (e.g., "username.skr" or just "username")
   * @returns The wallet address or null if not found
   */
  async resolveSkrToAddress(skrDomain: string): Promise<string | null> {
    try {
      // Normalize domain name (remove .skr suffix if present)
      const domainName = skrDomain.replace(/\.skr$/i, '');

      // Demo mode - return mock data
      if (this.isDemoMode()) {
        console.log('[SKR] Demo mode - looking up domain:', domainName);
        // Reverse lookup in demo data
        for (const [address, name] of Object.entries(DEMO_SKR_NAMES)) {
          if (name === domainName) {
            return address;
          }
        }
        // For demo, return a fake address for any .skr lookup
        return `Demo${domainName.slice(0, 4)}...seeker`;
      }

      // Production mode - real resolution
      console.log('[SKR] Resolving .skr to address:', domainName);
      const parser = await this.getParser();

      const owner = await parser.getOwnerFromDomainTld(`${domainName}.skr`);

      if (owner) {
        const address = typeof owner === 'string' ? owner : owner.toBase58();
        console.log('[SKR] Found address:', address);
        return address;
      }

      console.log('[SKR] No address found for .skr domain');
      return null;
    } catch (error) {
      console.error('[SKR] Error resolving .skr domain:', error);
      return null;
    }
  }
}

export const skrService = new SkrService();
export default skrService;
