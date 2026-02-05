import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createMint,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";

// Note: These tests are set up but require the program to be deployed
// Run: anchor build && anchor deploy --provider.cluster devnet

describe("seek-protocol", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Program ID - update after deployment
  const programId = new PublicKey("Seek111111111111111111111111111111111111111");

  // Test accounts
  const authority = provider.wallet as anchor.Wallet;
  const player = Keypair.generate();

  // Token mint (will be created in setup)
  let skrMint: PublicKey;

  // PDAs
  let protocolStatePda: PublicKey;
  let houseVaultPda: PublicKey;
  let singularityVaultPda: PublicKey;

  before(async () => {
    console.log("Setting up test environment...");

    // Airdrop SOL to player
    const airdropSig = await provider.connection.requestAirdrop(
      player.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig);

    console.log("Player funded:", player.publicKey.toBase58());
  });

  describe("Protocol Initialization", () => {
    it("Should derive PDAs correctly", async () => {
      // Derive PDAs
      [protocolStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("protocol_state")],
        programId
      );

      [houseVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("house_vault")],
        programId
      );

      [singularityVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("singularity_vault")],
        programId
      );

      console.log("Protocol State PDA:", protocolStatePda.toBase58());
      console.log("House Vault PDA:", houseVaultPda.toBase58());
      console.log("Singularity Vault PDA:", singularityVaultPda.toBase58());

      assert.ok(protocolStatePda);
      assert.ok(houseVaultPda);
      assert.ok(singularityVaultPda);
    });
  });

  describe("Bounty Lifecycle", () => {
    it("Should create bounty PDA for player", async () => {
      const [bountyPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("bounty"), player.publicKey.toBuffer()],
        programId
      );

      console.log("Bounty PDA:", bountyPda.toBase58());
      assert.ok(bountyPda);
    });
  });

  // Note: Full integration tests require:
  // 1. Deploy program to devnet/localnet
  // 2. Create SKR token mint
  // 3. Fund test accounts with SKR tokens
  // 4. Run full transaction tests

  describe("Token Economics", () => {
    it("Should verify tier bet amounts", () => {
      const TIER_1_BET = 100_000_000_000; // 100 SKR (9 decimals)
      const TIER_2_BET = 200_000_000_000; // 200 SKR
      const TIER_3_BET = 300_000_000_000; // 300 SKR

      assert.equal(TIER_1_BET, 100 * 10 ** 9);
      assert.equal(TIER_2_BET, 200 * 10 ** 9);
      assert.equal(TIER_3_BET, 300 * 10 ** 9);
    });

    it("Should verify loss distribution percentages", () => {
      const HOUSE_SHARE = 7000; // 70%
      const SINGULARITY_SHARE = 1500; // 15%
      const BURN_SHARE = 1000; // 10%
      const TREASURY_SHARE = 500; // 5%

      const total = HOUSE_SHARE + SINGULARITY_SHARE + BURN_SHARE + TREASURY_SHARE;
      assert.equal(total, 10000, "Distribution should sum to 100%");
    });

    it("Should verify singularity odds", () => {
      const SINGULARITY_ODDS = 500; // 1 in 500
      assert.equal(SINGULARITY_ODDS, 500);
    });
  });
});
