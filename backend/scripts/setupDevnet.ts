/**
 * Ashnance — Devnet Setup Script
 *
 * Run with: npx ts-node scripts/setupDevnet.ts
 *
 * This script:
 *  1. Prints the master wallet address (so you know where to fund USDC)
 *  2. Requests a SOL airdrop to the master wallet (for transaction fees)
 *  3. Checks the master wallet's current SOL and USDC balances
 *  4. Tells you exactly what to do to fund the wallet with devnet USDC
 */

import * as dotenv from "dotenv";
dotenv.config();

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, clusterApiUrl } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import * as crypto from "crypto";

const RPC_URL    = process.env.SOLANA_RPC_URL || clusterApiUrl("devnet");
const USDC_MINT  = process.env.USDC_MINT || "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr";

function getMasterKeypair(): Keypair {
  const secretEnv = process.env.MASTER_KEYPAIR_SECRET;
  if (secretEnv) {
    try {
      const arr = JSON.parse(secretEnv) as number[];
      return Keypair.fromSecretKey(Uint8Array.from(arr));
    } catch {
      console.warn("Could not parse MASTER_KEYPAIR_SECRET — using dev fallback");
    }
  }
  const seed = Buffer.alloc(32);
  seed.write("ashnance-dev-master-seed-v1", "utf8");
  return Keypair.fromSeed(seed);
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║      ASHNANCE — DEVNET SETUP CHECKER        ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  const connection = new Connection(RPC_URL, "confirmed");
  const master = getMasterKeypair();
  const masterPubkey = master.publicKey;

  console.log(`RPC URL:         ${RPC_URL}`);
  console.log(`USDC Mint:       ${USDC_MINT}`);
  console.log(`Master Wallet:   ${masterPubkey.toBase58()}\n`);

  // ── SOL Balance ──────────────────────────────────────────────
  const lamports = await connection.getBalance(masterPubkey);
  const solBalance = lamports / LAMPORTS_PER_SOL;
  console.log(`SOL Balance:     ${solBalance.toFixed(4)} SOL`);

  if (solBalance < 0.1) {
    console.log("  → LOW SOL — requesting airdrop...");
    try {
      const sig = await connection.requestAirdrop(masterPubkey, 2 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig, "confirmed");
      const newBal = (await connection.getBalance(masterPubkey)) / LAMPORTS_PER_SOL;
      console.log(`  ✓ Airdrop confirmed. New balance: ${newBal.toFixed(4)} SOL`);
    } catch (err: any) {
      console.log(`  ✗ Airdrop failed: ${err.message}`);
      console.log("  → Try manually: https://faucet.solana.com (paste master wallet address)");
    }
  } else {
    console.log("  ✓ SOL balance sufficient");
  }

  // ── USDC Balance ─────────────────────────────────────────────
  const mint = new PublicKey(USDC_MINT);
  const masterAta = getAssociatedTokenAddressSync(mint, masterPubkey);
  console.log(`\nMaster USDC ATA: ${masterAta.toBase58()}`);

  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      masterPubkey,
      { mint }
    );

    if (tokenAccounts.value.length === 0) {
      console.log("USDC Balance:    0 USDC (no token account yet)");
      console.log("\n  → The master wallet has no USDC ATA yet.");
      console.log("  → It will be created automatically when USDC is first received.");
    } else {
      const uiAmount = tokenAccounts.value[0].account.data.parsed?.info?.tokenAmount?.uiAmount ?? 0;
      console.log(`USDC Balance:    ${uiAmount} USDC`);
      if (uiAmount < 100) {
        console.log("  → LOW USDC — fund the master wallet with devnet USDC to test payouts");
      } else {
        console.log("  ✓ USDC balance sufficient for testing");
      }
    }
  } catch (err: any) {
    console.log(`USDC Balance:    ERROR — ${err.message}`);
  }

  // ── Instructions ─────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║          HOW TO GET DEVNET USDC              ║");
  console.log("╠══════════════════════════════════════════════╣");
  console.log("║  1. Open Phantom wallet                      ║");
  console.log("║  2. Switch to Devnet network                 ║");
  console.log("║  3. Get devnet SOL from: faucet.solana.com   ║");
  console.log("║  4. Use spl-token-faucet.com or             ║");
  console.log("║     solfaucet.com to get devnet USDC         ║");
  console.log("║  5. Send USDC to the master wallet address   ║");
  console.log("║     shown above (Master Wallet)              ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`\nMaster Wallet: ${masterPubkey.toBase58()}\n`);

  // ── Test deposit address derivation ──────────────────────────
  console.log("── Deposit Address Derivation Test ──");
  const testUserId = "test-user-123";
  const derivedSeed = crypto
    .createHash("sha256")
    .update(Buffer.concat([master.secretKey.slice(0, 32), Buffer.from(`deposit-${testUserId}`, "utf8")]))
    .digest()
    .slice(0, 32);
  const testKeypair = Keypair.fromSeed(Uint8Array.from(derivedSeed));
  console.log(`Test userId:     ${testUserId}`);
  console.log(`Derived address: ${testKeypair.publicKey.toBase58()}`);
  console.log("  ✓ Address derivation is deterministic and recoverable\n");
}

main().catch(console.error);
