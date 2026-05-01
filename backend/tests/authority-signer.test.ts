import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveAuthoritySignerConfig } from '../src/utils/authority-signer';

test('selects ledger signer from AUTHORITY_SIGNER with safe defaults', () => {
  const config = resolveAuthoritySignerConfig({
    AUTHORITY_SIGNER: 'ledger',
    AUTHORITY_LEDGER_PUBKEY: 'DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v'
  });

  assert.equal(config.kind, 'ledger');
  assert.equal(config.derivationPath, "44'/501'/0'");
  assert.equal(
    config.expectedPublicKey,
    'DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v'
  );
});

test('uses env keypair signer by default when AUTHORITY_PRIVATE_KEY is present', () => {
  const config = resolveAuthoritySignerConfig({
    AUTHORITY_PRIVATE_KEY: 'base58-secret'
  });

  assert.equal(config.kind, 'keypair');
  assert.equal(config.privateKey, 'base58-secret');
});

test('requires explicit signer mode on mainnet when a private key is present', () => {
  assert.throws(
    () =>
      resolveAuthoritySignerConfig({
        SOLANA_NETWORK: 'mainnet-beta',
        AUTHORITY_PRIVATE_KEY: 'base58-secret'
      }),
    /Set AUTHORITY_SIGNER=ledger or AUTHORITY_SIGNER=keypair/
  );
});

test('allows explicit keypair mode on mainnet for an accepted interim path', () => {
  const config = resolveAuthoritySignerConfig({
    SOLANA_NETWORK: 'mainnet-beta',
    AUTHORITY_SIGNER: 'keypair',
    AUTHORITY_PRIVATE_KEY: 'base58-secret'
  });

  assert.equal(config.kind, 'keypair');
  assert.equal(config.privateKey, 'base58-secret');
});

test('requires AUTHORITY_PRIVATE_KEY for explicit keypair signer', () => {
  assert.throws(
    () => resolveAuthoritySignerConfig({ AUTHORITY_SIGNER: 'keypair' }),
    /Missing required authority env: AUTHORITY_PRIVATE_KEY/
  );
});

test('rejects unknown authority signer modes', () => {
  assert.throws(
    () => resolveAuthoritySignerConfig({ AUTHORITY_SIGNER: 'paper-wallet' }),
    /Unsupported AUTHORITY_SIGNER/
  );
});
