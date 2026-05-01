import {
  Connection,
  Keypair,
  PublicKey,
  SendOptions,
  Transaction,
  TransactionSignature,
  VersionedTransaction
} from '@solana/web3.js';
import bs58 from 'bs58';

type Env = Record<string, string | undefined>;

export type AuthoritySignerKind = 'keypair' | 'ledger';

export type AuthoritySignerConfig =
  | {
      kind: 'keypair';
      privateKey: string;
    }
  | {
      kind: 'ledger';
      derivationPath: string;
      expectedPublicKey?: string;
      confirmPublicKey: boolean;
    };

export interface AuthoritySigner {
  publicKey: PublicKey;
  kind: AuthoritySignerKind;
  label: string;
  signTransaction<T extends Transaction | VersionedTransaction>(
    tx: T
  ): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(
    txs: T[]
  ): Promise<T[]>;
  close?(): Promise<void>;
}

type LedgerSolanaApp = {
  getAddress(path: string, display?: boolean): Promise<{ address: Buffer }>;
  signTransaction(
    path: string,
    txBuffer: Buffer
  ): Promise<{ signature: Buffer }>;
};

type LedgerTransport = {
  close?: () => Promise<void>;
};

const DEFAULT_LEDGER_DERIVATION_PATH = "44'/501'/0'";

function requiredEnv(env: Env, name: string): string {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required authority env: ${name}`);
  }
  return value;
}

function parseBoolean(
  value: string | undefined,
  defaultValue: boolean
): boolean {
  if (value === undefined) {
    return defaultValue;
  }
  return ['1', 'true', 'yes', 'y'].includes(value.trim().toLowerCase());
}

export function resolveAuthoritySignerConfig(
  env: Env = process.env
): AuthoritySignerConfig {
  const mode = (env.AUTHORITY_SIGNER ?? '').trim().toLowerCase();
  const isMainnet = (env.SOLANA_NETWORK ?? '').toLowerCase() === 'mainnet-beta';

  if (mode === 'ledger') {
    return {
      kind: 'ledger',
      derivationPath:
        env.AUTHORITY_LEDGER_PATH || DEFAULT_LEDGER_DERIVATION_PATH,
      expectedPublicKey: env.AUTHORITY_LEDGER_PUBKEY,
      confirmPublicKey: parseBoolean(
        env.AUTHORITY_LEDGER_CONFIRM_PUBKEY,
        isMainnet
      )
    };
  }

  if (mode && mode !== 'keypair') {
    throw new Error(
      `Unsupported AUTHORITY_SIGNER "${env.AUTHORITY_SIGNER}". Use "ledger" or "keypair".`
    );
  }

  if (isMainnet && !mode) {
    throw new Error(
      'Set AUTHORITY_SIGNER=ledger or AUTHORITY_SIGNER=keypair explicitly for mainnet admin/init scripts.'
    );
  }

  return {
    kind: 'keypair',
    privateKey: requiredEnv(env, 'AUTHORITY_PRIVATE_KEY')
  };
}

export async function loadAuthoritySigner(
  env: Env = process.env
): Promise<AuthoritySigner> {
  const config = resolveAuthoritySignerConfig(env);

  if (config.kind === 'ledger') {
    return createLedgerAuthoritySigner(config);
  }

  const keypair = Keypair.fromSecretKey(bs58.decode(config.privateKey));
  return new KeypairAuthoritySigner(keypair);
}

export async function sendAuthorityTransaction(
  connection: Connection,
  authority: AuthoritySigner,
  tx: Transaction,
  options: SendOptions = {}
): Promise<TransactionSignature> {
  const latestBlockhash = await connection.getLatestBlockhash(
    options.preflightCommitment ?? 'confirmed'
  );
  tx.feePayer = tx.feePayer ?? authority.publicKey;
  tx.recentBlockhash = tx.recentBlockhash ?? latestBlockhash.blockhash;

  const signed = await authority.signTransaction(tx);
  const signature = await connection.sendRawTransaction(
    signed.serialize(),
    options
  );
  await connection.confirmTransaction(
    {
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    },
    options.preflightCommitment ?? 'confirmed'
  );

  return signature;
}

class KeypairAuthoritySigner implements AuthoritySigner {
  public readonly kind = 'keypair' as const;
  public readonly label: string;

  constructor(private readonly keypair: Keypair) {
    this.label = `env keypair ${keypair.publicKey.toBase58()}`;
  }

  get publicKey(): PublicKey {
    return this.keypair.publicKey;
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(
    tx: T
  ): Promise<T> {
    if (tx instanceof VersionedTransaction) {
      tx.sign([this.keypair]);
    } else {
      tx.partialSign(this.keypair);
    }
    return tx;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    txs: T[]
  ): Promise<T[]> {
    return Promise.all(txs.map((tx) => this.signTransaction(tx)));
  }
}

class LedgerAuthoritySigner implements AuthoritySigner {
  public readonly kind = 'ledger' as const;
  public readonly label: string;

  constructor(
    public readonly publicKey: PublicKey,
    private readonly derivationPath: string,
    private readonly solanaApp: LedgerSolanaApp,
    private readonly transport: LedgerTransport
  ) {
    this.label = `Ledger ${publicKey.toBase58()} (${derivationPath})`;
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(
    tx: T
  ): Promise<T> {
    const message =
      tx instanceof VersionedTransaction
        ? Buffer.from(tx.message.serialize())
        : tx.serializeMessage();
    const { signature } = await this.solanaApp.signTransaction(
      this.derivationPath,
      message
    );

    if (tx instanceof VersionedTransaction) {
      tx.addSignature(this.publicKey, signature);
    } else {
      tx.addSignature(this.publicKey, signature);
    }

    return tx;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    txs: T[]
  ): Promise<T[]> {
    const signed: T[] = [];
    for (const tx of txs) {
      signed.push(await this.signTransaction(tx));
    }
    return signed;
  }

  async close(): Promise<void> {
    await this.transport.close?.();
  }
}

async function createLedgerAuthoritySigner(
  config: Extract<AuthoritySignerConfig, { kind: 'ledger' }>
): Promise<AuthoritySigner> {
  const { solanaApp, transport } = await openLedgerSolanaApp();
  const { address } = await solanaApp.getAddress(
    config.derivationPath,
    config.confirmPublicKey
  );
  const publicKey = new PublicKey(address);
  const actual = publicKey.toBase58();

  if (config.expectedPublicKey && config.expectedPublicKey !== actual) {
    await transport.close?.();
    throw new Error(
      `Ledger pubkey mismatch: expected ${config.expectedPublicKey}, got ${actual}. ` +
        'Check AUTHORITY_LEDGER_PATH and the connected Ledger.'
    );
  }

  return new LedgerAuthoritySigner(
    publicKey,
    config.derivationPath,
    solanaApp,
    transport
  );
}

async function openLedgerSolanaApp(): Promise<{
  solanaApp: LedgerSolanaApp;
  transport: LedgerTransport;
}> {
  let TransportNodeHid: {
    open(path?: string | null): Promise<LedgerTransport>;
  };
  let SolanaApp: new (transport: LedgerTransport) => LedgerSolanaApp;

  try {
    // Optional local-admin dependency. Do not import statically, or production
    // backend builds would need native HID support despite never using Ledger.
    TransportNodeHid = require('@ledgerhq/hw-transport-node-hid').default;
    SolanaApp = require('@ledgerhq/hw-app-solana').default;
  } catch {
    throw new Error(
      'Ledger signing dependencies are not installed. Run `npm install --include=optional` in backend/.'
    );
  }

  const transport = await TransportNodeHid.open(null);
  return {
    solanaApp: new SolanaApp(transport),
    transport
  };
}
