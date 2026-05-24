/**
 * Ashnance — Emergency Withdrawal Script
 *
 * Transfers all USDC and/or ASH from the platform master wallet to a
 * safe destination wallet you control. Use this if:
 *   - The backend server is compromised
 *   - You need to migrate to a new master wallet
 *   - A critical bug is discovered and you need to drain funds immediately
 *
 * Usage:
 *   npx ts-node scripts/emergencyWithdraw.ts <destination_wallet> [usdc|ash|all]
 *
 * Examples:
 *   npx ts-node scripts/emergencyWithdraw.ts 22pcFq1piKyTF6NhK7oifihVdXmp1DXpVdhdjhAdPaRM all
 *   npx ts-node scripts/emergencyWithdraw.ts 22pcFq1piKyTF6NhK7oifihVdXmp1DXpVdhdjhAdPaRM usdc
 *   npx ts-node scripts/emergencyWithdraw.ts 22pcFq1piKyTF6NhK7oifihVdXmp1DXpVdhdjhAdPaRM ash
 *
 * Required env vars:
 *   MASTER_KEYPAIR_SECRET   — JSON array of master wallet secret key bytes
 *   USDC_MINT               — USDC mint address
 *   ASH_MINT_ADDRESS        — ASH mint address (only needed for ash/all modes)
 *   SOLANA_RPC_URL          — RPC endpoint
 *
 * IMPORTANT: Run this script from a machine that is NOT the compromised server.
 * The script only needs the .env file with the master keypair — it does not
 * need the backend to be running.
 */

import * as dotenv from "dotenv";
dotenv.config();

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getMint,
  getAccount,
} from "@solana/spl-token";

// ============================================================
// CONFIG
// ============================================================

const RPC_URL     = process.env.SOLANA_RPC_URL || clusterApiUrl("devnet");
const IS_MAINNET  = RPC_URL.includes("mainnet");
const USDC_MINT   = process.env.USDC_MINT   || "";
const ASH_MINT    = process.env.ASH_MINT_ADDRESS || "";

const WITHDRAW_TIMEOUT_MS = 60_000;

function explorerUrl(sig: string): string {
  return IS_MAINNET
    ? `https://solscan.io/tx/${sig}`
    : `https://solscan.io/tx/${sig}?cluster=devnet`;
}

// ============================================================
// HELPERS
// ============================================================

function loadMasterKeypair(): Keypair {
  const secret = process.env.MASTER_KEYPAIR_SECRET;
  if (!secret) throw new Error("MASTER_KEYPAIR_SECRET not set");
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret) as number[]));
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms)
    ),
  ]);
}

async function transferSplToken(
  connection: Connection,
  master: Keypair,
  mintAddress: string,
  destination: PublicKey,
  label: string
): Promise<void> {
  const mint = new PublicKey(mintAddress);

  const fromAta = getAssociatedTokenAddressSync(mint, master.publicKey);
  const toAta   = getAssociatedTokenAddressSync(mint, destination);

  // Get balance
  let rawBalance: bigint;
  try {
    const account = await getAccount(connection, fromAta);
    rawBalance = account.amount;
  } catch {
    console.log(`  ${label}: no token account found — nothing to withdraw`);
    return;
  }

  if (rawBalance === 0n) {
    console.log(`  ${label}: balance is zero — nothing to withdraw`);
    return;
  }

  const mintInfo = await getMint(connection, mint);
  const uiAmount = Number(rawBalance) / 10 ** mintInfo.decimals;
  console.log(`  ${label} balance: ${uiAmount.toLocaleString()} (${rawBalance} raw)`);
  console.log(`  Sending to: ${destination.toBase58()}`);

  const instructions = [];

  // Create destination ATA if it doesn't exist
  try {
    await getAccount(connection, toAta);
  } catch {
    instructions.push(
      createAssociatedTokenAccountInstruction(master.publicKey, toAta, destination, mint)
    );
  }

  instructions.push(
    createTransferInstruction(fromAta, toAta, master.publicKey, rawBalance)
  );

  const { blockhash } = await withTimeout(
    connection.getLatestBlockhash("confirmed"),
    WITHDRAW_TIMEOUT_MS,
    "getLatestBlockhash"
  );

  const tx = new Transaction({ recentBlockhash: blockhash, feePayer: master.publicKey });
  tx.add(...instructions);
  tx.sign(master);

  const txHash = await withTimeout(
    connection.sendRawTransaction(tx.serialize(), { skipPreflight: false }),
    WITHDRAW_TIMEOUT_MS,
    "sendRawTransaction"
  );

  const latestBlockhash = await withTimeout(
    connection.getLatestBlockhash(),
    WITHDRAW_TIMEOUT_MS,
    "getLatestBlockhash (confirm)"
  );
  await withTimeout(
    connection.confirmTransaction({ signature: txHash, ...latestBlockhash }, "confirmed"),
    WITHDRAW_TIMEOUT_MS,
    "confirmTransaction"
  );

  console.log(`  ✓ ${label} withdrawn — ${uiAmount.toLocaleString()} tokens`);
  console.log(`  TX: ${explorerUrl(txHash)}`);
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const destArg = process.argv[2];
  const mode    = (process.argv[3] || "all").toLowerCase() as "usdc" | "ash" | "all";

  if (!destArg) {
    console.error(
      "\nUsage: npx ts-node scripts/emergencyWithdraw.ts <destination_wallet> [usdc|ash|all]\n" +
      "Example: npx ts-node scripts/emergencyWithdraw.ts 22pcFq1piKy... all\n"
    );
    process.exit(1);
  }

  let destination: PublicKey;
  try {
    destination = new PublicKey(destArg);
  } catch {
    console.error(`Invalid destination wallet: ${destArg}`);
    process.exit(1);
  }

  if (!["usdc", "ash", "all"].includes(mode)) {
    console.error("Mode must be: usdc | ash | all");
    process.exit(1);
  }

  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║            EMERGENCY WITHDRAWAL SCRIPT              ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");
  console.log(`  Network     : ${IS_MAINNET ? "MAINNET ⚠️  REAL MONEY" : "devnet"}`);
  console.log(`  Mode        : ${mode.toUpperCase()}`);
  console.log(`  Destination : ${destination.toBase58()}`);

  const master     = loadMasterKeypair();
  const connection = new Connection(RPC_URL, "confirmed");

  console.log(`  Master      : ${master.publicKey.toBase58()}`);

  const solBalance = await connection.getBalance(master.publicKey);
  console.log(`  SOL balance : ${(solBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL\n`);

  if (IS_MAINNET) {
    console.log("  ⚠️  MAINNET — transferring real tokens in 5 seconds. Ctrl+C to abort.\n");
    await new Promise((r) => setTimeout(r, 5000));
  }

  if (mode === "usdc" || mode === "all") {
    if (!USDC_MINT) {
      console.log("  USDC: USDC_MINT not set — skipping");
    } else {
      await transferSplToken(connection, master, USDC_MINT, destination, "USDC");
    }
  }

  if (mode === "ash" || mode === "all") {
    if (!ASH_MINT) {
      console.log("  ASH: ASH_MINT_ADDRESS not set — skipping");
    } else {
      await transferSplToken(connection, master, ASH_MINT, destination, "ASH");
    }
  }

  console.log("\n  ✓ Emergency withdrawal complete.\n");
  console.log("  IMPORTANT next steps:");
  console.log("  1. Stop the backend server immediately if not already done");
  console.log("  2. Rotate MASTER_KEYPAIR_SECRET to a new keypair");
  console.log("  3. Update DATABASE_URL if the DB may be compromised");
  console.log("  4. Investigate the incident before restarting\n");
}

main().catch((err) => {
  console.error("\n  ✗ Emergency withdrawal failed:", err.message || err);
  process.exit(1);
});
