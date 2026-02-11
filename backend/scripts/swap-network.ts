/**
 * Swap between devnet and mainnet configurations
 *
 * Usage:
 *   npx ts-node scripts/swap-network.ts devnet   - Switch to devnet config
 *   npx ts-node scripts/swap-network.ts mainnet   - Switch to mainnet config
 */
import * as fs from 'fs';
import * as path from 'path';

const DEVNET_SKR_MINT = 'u3BkoKjVYYPt24Dto1VPwAzqeQg9ffaxnCVhTAYbAFF';
const MAINNET_SKR_MINT = 'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const MAINNET_RPC = 'https://api.mainnet-beta.solana.com';

interface FileSwap {
  path: string;
  replacements: [string, string][]; // [devnet_value, mainnet_value]
}

const files: FileSwap[] = [
  {
    path: path.resolve(__dirname, '../../contracts/programs/seek-protocol/src/lib.rs'),
    replacements: [
      [DEVNET_SKR_MINT, MAINNET_SKR_MINT],
    ],
  },
  {
    path: path.resolve(__dirname, '../src/idl/seek_protocol.json'),
    replacements: [
      [DEVNET_SKR_MINT, MAINNET_SKR_MINT],
    ],
  },
  {
    path: path.resolve(__dirname, '../../mobile/src/config/index.ts'),
    replacements: [
      [DEVNET_SKR_MINT, MAINNET_SKR_MINT],
    ],
  },
];

const envFile = path.resolve(__dirname, '../.env');

function swapTo(network: 'devnet' | 'mainnet') {
  console.log(`\nSwapping to ${network.toUpperCase()}...\n`);

  for (const file of files) {
    if (!fs.existsSync(file.path)) {
      console.log(`  SKIP: ${file.path} (not found)`);
      continue;
    }

    let content = fs.readFileSync(file.path, 'utf8');
    let changed = false;

    for (const [devnetVal, mainnetVal] of file.replacements) {
      const from = network === 'mainnet' ? devnetVal : mainnetVal;
      const to = network === 'mainnet' ? mainnetVal : devnetVal;

      if (content.includes(from)) {
        content = content.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), to);
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(file.path, content);
      console.log(`  UPDATED: ${path.relative(process.cwd(), file.path)}`);
    } else {
      console.log(`  OK:      ${path.relative(process.cwd(), file.path)} (already ${network})`);
    }
  }

  // Update .env
  if (fs.existsSync(envFile)) {
    let env = fs.readFileSync(envFile, 'utf8');
    const skrFrom = network === 'mainnet' ? DEVNET_SKR_MINT : MAINNET_SKR_MINT;
    const skrTo = network === 'mainnet' ? MAINNET_SKR_MINT : DEVNET_SKR_MINT;
    const rpcFrom = network === 'mainnet' ? DEVNET_RPC : MAINNET_RPC;
    const rpcTo = network === 'mainnet' ? MAINNET_RPC : DEVNET_RPC;
    const netFrom = network === 'mainnet' ? 'devnet' : 'mainnet-beta';
    const netTo = network === 'mainnet' ? 'mainnet-beta' : 'devnet';

    env = env.replace(skrFrom, skrTo);
    env = env.replace(rpcFrom, rpcTo);
    env = env.replace(`SOLANA_NETWORK=${netFrom}`, `SOLANA_NETWORK=${netTo}`);

    fs.writeFileSync(envFile, env);
    console.log(`  UPDATED: .env`);
  }

  console.log(`\nDone! Switched to ${network}.`);

  if (network === 'mainnet') {
    console.log('\nREMINDER: You must also:');
    console.log('  1. Run `anchor build` to rebuild the contract with mainnet SKR_MINT');
    console.log('  2. Deploy to mainnet: `anchor deploy --provider.cluster mainnet`');
    console.log('  3. Update AUTHORITY_PRIVATE_KEY in .env with mainnet key');
    console.log('  4. Run initialize-protocol.ts against mainnet');
  } else {
    console.log('\nREMINDER: You must also:');
    console.log('  1. Run `anchor build` to rebuild the contract with devnet test token');
    console.log('  2. Upgrade on devnet: `anchor deploy --provider.cluster devnet`');
  }
}

const network = process.argv[2] as 'devnet' | 'mainnet';

if (network !== 'devnet' && network !== 'mainnet') {
  console.log('Usage: npx ts-node scripts/swap-network.ts <devnet|mainnet>');
  process.exit(1);
}

swapTo(network);
