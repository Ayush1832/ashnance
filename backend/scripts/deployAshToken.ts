/**
 * Ashnance — ASH Token Deployment Script
 *
 * Creates the ASH SPL token on Solana:
 *   1. Creates the mint account (6 decimals, Metaplex on-chain metadata)
 *   2. Mints entire 1,000,000,000 ASH supply to the master wallet
 *   3. Saves mint address to .env + writes a deployment record JSON
 *
 * ALL tokens go to the master wallet. The backend controls all distribution:
 *   - Emission rewards are sent automatically as users burn USDC
 *   - Mint authority is kept on master wallet (use revokeAshMint.ts to fix supply later)
 *
 * Usage (devnet — default):
 *   npx ts-node scripts/deployAshToken.ts
 *
 * Usage (mainnet):
 *   SOLANA_NETWORK=mainnet npx ts-node scripts/deployAshToken.ts
 *
 * Required env vars:
 *   MASTER_KEYPAIR_SECRET  — JSON array of master wallet secret key bytes
 *
 * Optional env vars:
 *   SOLANA_NETWORK         — "devnet" (default) or "mainnet"
 *   SOLANA_RPC_URL         — custom RPC endpoint
 *   ASH_METADATA_URI       — publicly hosted URL of ash-token-metadata.json
 *                            Default: https://www.ashnance.com/ash-token-metadata.json
 */

import * as dotenv from "dotenv";
dotenv.config();

import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  mplTokenMetadata,
  createV1,
  TokenStandard,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  keypairIdentity,
  generateSigner,
  percentAmount,
  some,
} from "@metaplex-foundation/umi";
import {
  fromWeb3JsKeypair,
  toWeb3JsPublicKey,
} from "@metaplex-foundation/umi-web3js-adapters";
import * as fs from "fs";
import * as path from "path";

// ============================================================
// CONFIG
// ============================================================

const NETWORK      = (process.env.SOLANA_NETWORK || "devnet") as "devnet" | "mainnet";
const IS_MAINNET   = NETWORK === "mainnet";
const RPC_URL      = process.env.SOLANA_RPC_URL ||
  clusterApiUrl(IS_MAINNET ? "mainnet-beta" : "devnet");
const METADATA_URI = process.env.ASH_METADATA_URI ||
  "https://www.ashnance.com/ash-token-metadata.json";

const ASH_DECIMALS   = 6;
const ASH_SUPPLY     = 1_000_000_000n;
const ASH_SUPPLY_RAW = ASH_SUPPLY * 10n ** BigInt(ASH_DECIMALS); // 1_000_000_000_000_000n

// ============================================================
// HELPERS
// ============================================================

function loadMasterKeypair(): Keypair {
  const secret = process.env.MASTER_KEYPAIR_SECRET;
  if (!secret) {
    throw new Error(
      "MASTER_KEYPAIR_SECRET is not set.\n" +
      "Set it to the JSON array of your master wallet's secret key bytes."
    );
  }
  try {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret) as number[]));
  } catch {
    throw new Error("MASTER_KEYPAIR_SECRET could not be parsed as a JSON number array.");
  }
}

function explorerUrl(address: string, type: "tx" | "token" | "account" = "account"): string {
  return IS_MAINNET
    ? `https://solscan.io/${type}/${address}`
    : `https://solscan.io/${type}/${address}?cluster=devnet`;
}

function updateEnvFile(key: string, value: string): void {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) {
    console.log(`  No .env found — add manually: ${key}=${value}`);
    return;
  }
  let content = fs.readFileSync(envPath, "utf8");
  const line = `${key}=${value}`;
  if (content.includes(`${key}=`)) {
    content = content.replace(new RegExp(`${key}=.*`), line);
  } else {
    content += `\n${line}\n`;
  }
  fs.writeFileSync(envPath, content);
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║         ASH TOKEN DEPLOYMENT SCRIPT             ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  console.log(`  Network     : ${NETWORK.toUpperCase()}${IS_MAINNET ? " ⚠️  REAL MONEY" : " (test)"}`);
  console.log(`  RPC URL     : ${RPC_URL}`);
  console.log(`  Metadata    : ${METADATA_URI}`);
  console.log(`  Supply      : 1,000,000,000 ASH → master wallet (all tokens)`);
  console.log(`  Decimals    : ${ASH_DECIMALS}`);
  console.log(`  Mint auth   : kept on master wallet (revoke later with revokeAshMint.ts)\n`);

  if (IS_MAINNET) {
    console.log("  ⚠️  MAINNET — this will spend real SOL and create a real token.");
    console.log("  Proceeding in 5 seconds. Ctrl+C to abort.\n");
    await new Promise((r) => setTimeout(r, 5000));
  }

  // ── Load wallet ───────────────────────────────────────────────────────────
  const master     = loadMasterKeypair();
  const connection = new Connection(RPC_URL, "confirmed");

  console.log(`  Master wallet : ${master.publicKey.toBase58()}`);
  console.log(`  Explorer      : ${explorerUrl(master.publicKey.toBase58())}\n`);

  // ── SOL balance check ─────────────────────────────────────────────────────
  const lamports = await connection.getBalance(master.publicKey);
  const sol      = lamports / LAMPORTS_PER_SOL;
  console.log(`  SOL balance   : ${sol.toFixed(4)} SOL`);

  if (sol < 0.05) {
    throw new Error(
      `Insufficient SOL. Need ≥0.05 SOL for fees + rent, have ${sol.toFixed(4)} SOL.\n` +
      (IS_MAINNET
        ? "  Fund master wallet with SOL before retrying."
        : "  Run: solana airdrop 2 --url devnet")
    );
  }

  // ── Guard: prevent re-deploy ──────────────────────────────────────────────
  const existingMint = process.env.ASH_MINT_ADDRESS;
  if (existingMint) {
    console.log(`\n  ⚠️  ASH_MINT_ADDRESS already set: ${existingMint}`);
    console.log("  Remove it from .env to redeploy. Aborting to prevent duplicate tokens.\n");
    process.exit(0);
  }

  // ── Step 1: Create mint + Metaplex metadata ───────────────────────────────
  console.log("\n── Step 1: Creating ASH mint + on-chain metadata...");

  const umi      = createUmi(RPC_URL).use(mplTokenMetadata());
  umi.use(keypairIdentity(fromWeb3JsKeypair(master)));

  const mintSigner = generateSigner(umi);
  const mintPubkey = toWeb3JsPublicKey(mintSigner.publicKey);

  console.log(`  Mint address : ${mintPubkey.toBase58()}`);

  await createV1(umi, {
    mint:                  mintSigner,
    authority:             umi.identity,
    updateAuthority:       umi.identity,
    name:                  "ASH Token",
    symbol:                "ASH",
    uri:                   METADATA_URI,
    sellerFeeBasisPoints:  percentAmount(0),  // 0% royalty — utility token
    decimals:              some(ASH_DECIMALS),
    tokenStandard:         TokenStandard.Fungible,
    isMutable:             true,              // metadata can be updated if needed
  }).sendAndConfirm(umi, { confirm: { commitment: "confirmed" } });

  console.log("  ✓ Mint + on-chain metadata created");
  console.log(`  Solscan: ${explorerUrl(mintPubkey.toBase58(), "token")}`);

  // ── Step 2: Mint full 1B supply to master wallet ──────────────────────────
  console.log("\n── Step 2: Minting 1,000,000,000 ASH to master wallet...");

  const masterAta = await getOrCreateAssociatedTokenAccount(
    connection,
    master,           // payer
    mintPubkey,       // mint
    master.publicKey  // owner — all tokens go here
  );
  console.log(`  Master ATA : ${masterAta.address.toBase58()}`);

  const mintTx = await mintTo(
    connection,
    master,             // payer
    mintPubkey,         // mint
    masterAta.address,  // destination
    master.publicKey,   // mint authority
    ASH_SUPPLY_RAW      // 1,000,000,000 × 10^6
  );

  console.log(`  ✓ 1,000,000,000 ASH minted to master wallet`);
  console.log(`  TX: ${explorerUrl(mintTx, "tx")}`);

  // ── Save results ──────────────────────────────────────────────────────────
  console.log("\n── Saving deployment record...");

  updateEnvFile("ASH_MINT_ADDRESS", mintPubkey.toBase58());
  console.log("  ✓ .env updated with ASH_MINT_ADDRESS");

  const record = {
    network:      NETWORK,
    mintAddress:  mintPubkey.toBase58(),
    masterWallet: master.publicKey.toBase58(),
    masterAta:    masterAta.address.toBase58(),
    supply:       ASH_SUPPLY.toString(),
    decimals:     ASH_DECIMALS,
    mintRevoked:  false,
    metadataUri:  METADATA_URI,
    deployedAt:   new Date().toISOString(),
    explorerUrl:  explorerUrl(mintPubkey.toBase58(), "token"),
    note:         "All 1B ASH held in master wallet. Backend distributes automatically.",
  };

  const recordFile = path.join(__dirname, `ash-token-${NETWORK}.json`);
  fs.writeFileSync(recordFile, JSON.stringify(record, null, 2));
  console.log(`  ✓ Record saved to scripts/ash-token-${NETWORK}.json`);

  // ── Final summary ─────────────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                   DEPLOYMENT COMPLETE ✓                     ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  Mint    : ${mintPubkey.toBase58()}`);
  console.log(`║  ATA     : ${masterAta.address.toBase58()}`);
  console.log(`║  Supply  : 1,000,000,000 ASH (all in master wallet)`);
  console.log(`║  Network : ${NETWORK}`);
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  console.log("Next steps:");
  console.log("  1. Verify on Solscan:", explorerUrl(mintPubkey.toBase58(), "token"));
  console.log("  2. Host ash-token-metadata.json at:", METADATA_URI);
  console.log("  3. Restart the backend — it picks up ASH_MINT_ADDRESS from .env automatically");
  console.log("  4. When ready to permanently fix supply (no more minting ever):");
  console.log("     npx ts-node scripts/revokeAshMint.ts\n");
}

main().catch((err) => {
  console.error("\n  ✗ Deployment failed:", err.message || err);
  process.exit(1);
});
