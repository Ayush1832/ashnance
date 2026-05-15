/**
 * Ashnance — Revoke ASH Mint Authority
 *
 * Call this ONCE when you want to permanently fix the 1B supply.
 * After this, no new ASH can ever be minted.
 *
 * Usage:
 *   npx ts-node scripts/revokeAshMint.ts
 *
 * Required env vars:
 *   MASTER_KEYPAIR_SECRET
 *   ASH_MINT_ADDRESS
 *   SOLANA_RPC_URL (or defaults to devnet)
 */

import * as dotenv from "dotenv";
dotenv.config();

import { Connection, Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { setAuthority, AuthorityType, getMint } from "@solana/spl-token";

const RPC_URL  = process.env.SOLANA_RPC_URL || clusterApiUrl("devnet");
const IS_MAINNET = RPC_URL.includes("mainnet");

async function main() {
  const secret = process.env.MASTER_KEYPAIR_SECRET;
  if (!secret) throw new Error("MASTER_KEYPAIR_SECRET not set");
  const master = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret)));

  const mintAddress = process.env.ASH_MINT_ADDRESS;
  if (!mintAddress) throw new Error("ASH_MINT_ADDRESS not set in .env");

  const connection = new Connection(RPC_URL, "confirmed");
  const mintPubkey = new PublicKey(mintAddress);

  console.log(`\n  Network     : ${IS_MAINNET ? "MAINNET ⚠️" : "devnet"}`);
  console.log(`  Mint        : ${mintAddress}`);
  console.log(`  Master      : ${master.publicKey.toBase58()}\n`);

  // Verify mint authority is still held by master
  const mintInfo = await getMint(connection, mintPubkey);
  if (!mintInfo.mintAuthority) {
    console.log("  ✓ Mint authority is already null — supply is already fixed.");
    return;
  }
  if (mintInfo.mintAuthority.toBase58() !== master.publicKey.toBase58()) {
    throw new Error(`Mint authority is held by ${mintInfo.mintAuthority.toBase58()}, not master wallet.`);
  }

  console.log("  Revoking mint authority in 3 seconds... Ctrl+C to abort.");
  await new Promise((r) => setTimeout(r, 3000));

  const sig = await setAuthority(
    connection,
    master,
    mintPubkey,
    master.publicKey,
    AuthorityType.MintTokens,
    null
  );

  const explorer = IS_MAINNET
    ? `https://solscan.io/tx/${sig}`
    : `https://solscan.io/tx/${sig}?cluster=devnet`;

  console.log(`\n  ✓ Mint authority revoked. Supply is now permanently fixed at 1,000,000,000 ASH.`);
  console.log(`  TX: ${explorer}\n`);
}

main().catch((err) => {
  console.error("  ✗ Failed:", err.message || err);
  process.exit(1);
});
