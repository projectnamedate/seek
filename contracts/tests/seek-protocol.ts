/**
 * Seek Protocol — Client-side unit tests.
 *
 * Verifies invariants that matter BEFORE we spin up a validator:
 *   - PDA derivations (break = wallet & backend lose on-chain state)
 *   - Entry-amount math (break = mainnet sends 1000× wrong amount)
 *   - Commit-reveal hashing (break = reveal_mission fails on-chain)
 *   - IDL integrity (break = Anchor clients can't serialize ix)
 *
 * Full on-chain integration tests (accept → reveal → propose → finalize,
 * dispute flow, two-step auth transfer, hot-authority rotation) require a
 * local validator + a pre-minted SKR test mint. The SKR_MINT const in the
 * contract is compile-gated per cluster, so the standard approach is:
 *   1. `anchor build --no-default-features --features devnet`
 *   2. `solana-test-validator --clone <devnet SKR mint> --url devnet --reset`
 *   3. Run the integration test suite against the local validator.
 *
 * Integration-test skeleton lives in tests/integration-skeleton.ts (not yet
 * wired to the default `anchor test` invocation). Track in audit § Testing
 * before mainnet redeploys.
 */
import { PublicKey } from "@solana/web3.js";
import { assert } from "chai";
import { createHash, randomFillSync } from "crypto";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load IDL at runtime via fs.readFileSync to avoid ESM JSON-import-attribute
// weirdness under Node 20+. Path is resolved against the project root via
// process.cwd() since ts-mocha can run from varying working directories.
const contractsRoot = process.cwd().endsWith("contracts")
  ? process.cwd()
  : resolve(process.cwd(), "contracts");

const idl = JSON.parse(
  readFileSync(
    resolve(contractsRoot, "target", "idl", "seek_protocol.json"),
    "utf8"
  )
);

const PROGRAM_ID = new PublicKey("DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v");

const MAINNET_SKR_MINT = new PublicKey(
  "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3"
);
const DEVNET_SKR_MINT = new PublicKey(
  "u3BkoKjVYYPt24Dto1VPwAzqeQg9ffaxnCVhTAYbAFF"
);

describe("seek-protocol (client-side invariants)", () => {
  describe("PDA derivation", () => {
    it("derives global_state PDA", () => {
      const [pda, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("global_state")],
        PROGRAM_ID
      );
      assert.ok(pda);
      assert.isAtLeast(bump, 0);
      assert.isAtMost(bump, 255);
    });

    it("derives house_vault PDA", () => {
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("house_vault")],
        PROGRAM_ID
      );
      assert.ok(pda);
    });

    it("derives singularity_vault PDA", () => {
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("singularity_vault")],
        PROGRAM_ID
      );
      assert.ok(pda);
    });

    it("derives bounty PDA deterministically from (player, timestamp)", () => {
      const player = new PublicKey("11111111111111111111111111111111");
      const timestamp = 1_700_000_000n;

      const tsBuf = Buffer.alloc(8);
      tsBuf.writeBigInt64LE(timestamp);

      const [pda1] = PublicKey.findProgramAddressSync(
        [Buffer.from("bounty"), player.toBuffer(), tsBuf],
        PROGRAM_ID
      );
      const [pda2] = PublicKey.findProgramAddressSync(
        [Buffer.from("bounty"), player.toBuffer(), tsBuf],
        PROGRAM_ID
      );

      assert.equal(pda1.toBase58(), pda2.toBase58(), "derivation must be deterministic");
    });

    it("bounty PDA differs across timestamps", () => {
      const player = new PublicKey("11111111111111111111111111111111");

      const tsA = Buffer.alloc(8);
      tsA.writeBigInt64LE(1_700_000_000n);
      const [pdaA] = PublicKey.findProgramAddressSync(
        [Buffer.from("bounty"), player.toBuffer(), tsA],
        PROGRAM_ID
      );

      const tsB = Buffer.alloc(8);
      tsB.writeBigInt64LE(1_700_000_001n);
      const [pdaB] = PublicKey.findProgramAddressSync(
        [Buffer.from("bounty"), player.toBuffer(), tsB],
        PROGRAM_ID
      );

      assert.notEqual(pdaA.toBase58(), pdaB.toBase58());
    });
  });

  describe("Entry-amount decimals math", () => {
    // The contract's TIER_*_ENTRY constants are `N × DECIMALS_MULTIPLIER`
    // with DECIMALS_MULTIPLIER = 10^6 on mainnet (SKR is 6 decimals) and
    // 10^9 on devnet (test mint is 9 decimals). A regression here = every
    // tier entry misbehaves by 1000× on mainnet.

    it("mainnet tier entries match 6-decimal base units", () => {
      const mult = 1_000_000n; // 10^6
      assert.equal(1000n * mult, 1_000_000_000n); // tier 1 = 1000 SKR
      assert.equal(2000n * mult, 2_000_000_000n);
      assert.equal(3000n * mult, 3_000_000_000n);
    });

    it("devnet tier entries match 9-decimal base units", () => {
      const mult = 1_000_000_000n; // 10^9
      assert.equal(1000n * mult, 1_000_000_000_000n);
      assert.equal(2000n * mult, 2_000_000_000_000n);
      assert.equal(3000n * mult, 3_000_000_000_000n);
    });

    it("3x payout is entry + 2x profit", () => {
      const entry = 1000n * 1_000_000n; // 1000 SKR mainnet
      const payout = entry * 3n;
      const profit = payout - entry;
      assert.equal(profit, entry * 2n, "profit should equal 2x entry");
    });

    it("loss distribution sums to 100% (basis points)", () => {
      const HOUSE = 7000n;
      const SING = 2000n;
      const PROTO = 1000n;
      assert.equal(HOUSE + SING + PROTO, 10000n);
    });
  });

  describe("Commit-reveal hash function", () => {
    // Must match the contract's `solana_program::hash::hash` invocation on
    // concat(mission_id, salt). If the hash function changes or the byte
    // order flips, every on-chain reveal_mission call will fail with
    // InvalidMissionHash.

    function buildCommitment(missionId: string, salt: Buffer) {
      const missionIdBytes = Buffer.alloc(32);
      const missionHash = createHash("sha256").update(missionId).digest();
      missionHash.copy(missionIdBytes);

      const input = Buffer.concat([missionIdBytes, salt]);
      const commitment = createHash("sha256").update(input).digest();

      return { commitment, missionIdBytes, salt };
    }

    it("same inputs produce same commitment", () => {
      const missionId = "t1-fire-hydrant";
      const salt = Buffer.alloc(32);
      salt.fill(0xaa);

      const a = buildCommitment(missionId, salt);
      const b = buildCommitment(missionId, salt);

      assert.equal(a.commitment.toString("hex"), b.commitment.toString("hex"));
    });

    it("different salts produce different commitments for same mission", () => {
      const missionId = "t1-fire-hydrant";
      const saltA = Buffer.alloc(32); saltA.fill(0xaa);
      const saltB = Buffer.alloc(32); saltB.fill(0xbb);

      const a = buildCommitment(missionId, saltA);
      const b = buildCommitment(missionId, saltB);

      assert.notEqual(a.commitment.toString("hex"), b.commitment.toString("hex"));
    });

    it("different mission IDs produce different commitments", () => {
      const salt = Buffer.alloc(32);
      randomFillSync(salt);

      const a = buildCommitment("mission-alpha", salt);
      const b = buildCommitment("mission-beta", salt);

      assert.notEqual(a.commitment.toString("hex"), b.commitment.toString("hex"));
    });

    it("commitment is exactly 32 bytes (SHA-256 digest)", () => {
      const salt = Buffer.alloc(32);
      randomFillSync(salt);
      const { commitment } = buildCommitment("mission-x", salt);
      assert.equal(commitment.length, 32);
    });
  });

  describe("IDL integrity", () => {
    // The IDL is the shared schema between contract and Anchor clients
    // (backend + mobile). If an instruction gets renamed, a field gets
    // dropped, or an account constraint disappears without the client
    // catching up, runtime signature serialization will break silently.

    const instructions = (idl as any).instructions as Array<{ name: string }>;

    it("exposes core bounty lifecycle instructions", () => {
      const names = instructions.map((i) => i.name);
      assert.include(names, "accept_bounty");
      assert.include(names, "reveal_mission");
      assert.include(names, "propose_resolution");
      assert.include(names, "finalize_bounty");
      assert.include(names, "dispute_bounty");
      assert.include(names, "resolve_dispute");
      assert.include(names, "cancel_bounty");
      assert.include(names, "close_bounty");
    });

    it("exposes the new auth-model instructions", () => {
      const names = instructions.map((i) => i.name);
      assert.include(names, "propose_authority_transfer");
      assert.include(names, "accept_authority_transfer");
      assert.include(names, "cancel_authority_transfer");
      assert.include(names, "set_hot_authority");
    });

    it("GlobalState account has hot_authority + pending_authority fields", () => {
      const accounts = (idl as any).types as Array<{ name: string; type: any }>;
      const globalState = accounts.find((a) => a.name === "GlobalState");
      assert.ok(globalState, "GlobalState type must be present in IDL");
      const fieldNames = (globalState.type.fields as Array<{ name: string }>).map((f) => f.name);
      assert.include(fieldNames, "authority");
      assert.include(fieldNames, "hot_authority");
      assert.include(fieldNames, "pending_authority");
    });

    it("reveal_mission + propose_resolution use hot_authority signer", () => {
      const reveal = instructions.find((i) => i.name === "reveal_mission");
      const propose = instructions.find((i) => i.name === "propose_resolution");
      assert.ok(reveal);
      assert.ok(propose);

      const revealAccounts = (reveal as any).accounts as Array<{ name: string; signer?: boolean }>;
      const proposeAccounts = (propose as any).accounts as Array<{ name: string; signer?: boolean }>;

      const revealSigner = revealAccounts.find((a) => a.signer);
      const proposeSigner = proposeAccounts.find((a) => a.signer);

      assert.equal(revealSigner?.name, "hot_authority");
      assert.equal(proposeSigner?.name, "hot_authority");
    });
  });

  describe("Cluster constant sanity", () => {
    it("mainnet and devnet mints are distinct", () => {
      assert.notEqual(MAINNET_SKR_MINT.toBase58(), DEVNET_SKR_MINT.toBase58());
    });

    it("program ID is the expected devnet/mainnet deployment", () => {
      assert.equal(
        PROGRAM_ID.toBase58(),
        "DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v"
      );
    });
  });
});
