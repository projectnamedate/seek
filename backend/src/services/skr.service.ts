import { Connection, PublicKey } from '@solana/web3.js';
import { TldParser } from '@onsol/tldparser';
import { config } from '../config';
import { childLogger } from './logger.service';

const log = childLogger('skr');

// Demo .skr names for testing
const DEMO_SKR_NAMES: Record<string, string> = {
  'Demo7xR3kN9vU2mQp8sW4yL6hJ1cBfT5gA2dSeeker': 'seeker_demo',
  '7MKnzxAzmQvib4x6QvdawB7fhWT2ADcyYK2GMXy1wpe6': 'hammer',
  'FstGYqfpz2Gs6XCU79GJJvLetbmcWvTycbj6wJ4q6uMm': 'johnnysolami',
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
        log.info({ walletAddress }, 'demo mode - checking mock data');
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
      log.info({ walletAddress }, 'resolving address to .skr');
      const parser = await this.getParser();
      const pubkey = new PublicKey(walletAddress);

      const domains = await parser.getParsedAllUserDomainsFromTld(pubkey, 'skr');

      if (domains && domains.length > 0) {
        const skrName = `${domains[0].domain}.skr`;
        log.info({ skrName }, 'found .skr name');
        return skrName;
      }

      log.info('no .skr domain found for address');
      return null;
    } catch (error) {
      log.error({ err: error instanceof Error ? error.message : error }, 'error resolving address');
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
        log.info({ domainName }, 'demo mode - looking up domain');
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
      log.info({ domainName }, 'resolving .skr to address');
      const parser = await this.getParser();

      const owner = await parser.getOwnerFromDomainTld(`${domainName}.skr`);

      if (owner) {
        const address = typeof owner === 'string' ? owner : owner.toBase58();
        log.info({ address }, 'found address');
        return address;
      }

      log.info('no address found for .skr domain');
      return null;
    } catch (error) {
      log.error({ err: error instanceof Error ? error.message : error }, 'error resolving .skr domain');
      return null;
    }
  }
}

export const skrService = new SkrService();
export default skrService;
