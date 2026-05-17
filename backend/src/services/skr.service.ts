import { Connection, PublicKey } from '@solana/web3.js';
import { TldParser } from '@onsol/tldparser';
import { childLogger } from './logger.service';

const log = childLogger('skr');

export function withSkrSuffix(domain: string): string {
  const trimmed = domain.trim().toLowerCase();
  return trimmed.endsWith('.skr') ? trimmed : `${trimmed}.skr`;
}

export function withoutSkrSuffix(domain: string): string {
  return domain.trim().toLowerCase().replace(/\.skr$/i, '');
}

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
   * Resolve a wallet address to its .skr domain name
   * @param walletAddress - The Solana wallet address
   * @returns The .skr domain name or null if not found
   */
  async resolveAddressToSkr(walletAddress: string): Promise<string | null> {
    try {
      log.info({ walletAddress }, 'resolving address to .skr');
      const parser = await this.getParser();
      const pubkey = new PublicKey(walletAddress);

      const domains = await parser.getParsedAllUserDomainsFromTld(pubkey, 'skr');

      if (domains && domains.length > 0) {
        const skrName = withSkrSuffix(domains[0].domain);
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
      // Normalize domain name: .skr names are lowercase and callers may send
      // either "name" or "name.skr".
      const domainName = withoutSkrSuffix(skrDomain);

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
