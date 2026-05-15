/**
 * Ashnance — ASH Token Deployment Script
 *
 * Creates the ASH SPL token on Solana:
 *   1. Creates the mint account (6 decimals, via Metaplex createV1)
 *   2. Attaches on-chain metadata (name, symbol, URI) via Token Metadata program
 *   3. Mints 1,000,000,000 ASH to the master wallet
 *   4. Optionally revokes mint authority to permanently fix the supply
 *   5. Saves the mint address to .env and writes a deployment record JSON
 *
 * Usage (devnet — default):
 *   npx ts-node scripts/deployAshToken.ts
 *
 * Usage (mainnet):
 *   SOLANA_NETWORK=mainnet npx ts-node scripts/deployAshToken.ts
 *
 * Required env vars:
 *   MASTER_KEYPAIR_SECRET  — JSON array of the master wallet secret key bytes
 *
 * Optional env vars:
 *   SOLANA_NETWORK         — "devnet" (default) or "mainnet"
 *   SOLANA_RPC_URL         — custom RPC endpoint
 *   ASH_METADATA_URI       — publicly hosted URL of ash-token-metadata.json
 *                            Default: https://www.ashnance.com/ash-token-metadata.json
 *   REVOKE_MINT_AUTHORITY  — set to "true" to permanently fix supply after minting
 *
 * Before mainnet deployment:
 *   - Host ash-token-metadata.json at your chosen URI (IPFS, Arweave, or your server)
 *   - Ensure the master wallet has at least 0.05 SOL for fees + rent
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
  setAuthority,
  AuthorityType,
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

// ── Constants ────────────────────────────────────────────────────────────────

const NETWORK      = (process.env.SOLANA_NETWORK || "devnet") as "devnet" | "mainnet";
const IS_MAINNET   = NETWORK === "mainnet";
const RPC_URL      = process.env.SOLANA_RPC_URL ||
  clusterApiUrl(IS_MAINNET ? "mainnet-beta" : "devnet");
const METADATA_URI = process.env.ASH_METADATA_URI ||
  "https://www.ashnance.com/ash-token-metadata.json";
const REVOKE_MINT  = process.env.REVOKE_MINT_AUTHORITY === "true";

const ASH_DECIMALS   = 6;
const ASH_SUPPLY     = 1_000_000_000n;
const ASH_SUPPLY_RAW = ASH_SUPPLY * 10n ** BigInt(ASH_DECIMALS); // 1_000_000_000_000_000n

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadMasterKeypair(): Keypair {
  const secret = process.env.MASTER_KEYPAIR_SECRET;
  if (!secret) {
    throw new Error(
      "MASTER_KEYPAIR_SECRET is not set.\n" +
      "Set it to the JSON array of your master wallet's secret key bytes.\n" +
      "Example: MASTER_KEYPAIR_SECRET='[12,34,...]'"
    );
  }
  try {
    const arr = JSON.parse(secret) as number[];
    return Keypair.fromSecretKey(Uint8Array.from(arr));
  } catch {
    throw new Error("MASTER_KEYPAIR_SECRET is set but could not be parsed as a JSON number array.");
  }
}

function explorerUrl(address: string, type: "tx" | "token" | "account" = "account"): string {
  const base = IS_MAINNET
    ? `https://solscan.io/${type}/${address}`
    : `https://solscan.io/${type}/${address}?cluster=devnet`;
  return base;
}

function updateEnvFile(key: string, value: string): void {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) {
    console.log(`  ℹ️  No .env found — add this manually:\n     ${key}=${value}`);
    return;
  }
  let content = fs.readFileSync(envPath, "utf8");
  const line  = `${key}=${value}`;
  if (content.includes(`${key}=`)) {
    content = content.replace(new RegExp(`${key}=.*`), line);
  } else {
    content += content.endsWith("\n") ? `\n# ASH Token\n${line}\n` : `\n\n# ASH Token\n${line}\n`;
  }
  fs.writeFileSync(envPath, content);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║         ASH TOKEN DEPLOYMENT SCRIPT             ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  console.log(`  Network     : ${NETWORK.toUpperCase()}${IS_MAINNET ? " ⚠️  REAL MONEY" : " (test)"}`);
  console.log(`  RPC URL     : ${RPC_URL}`);
  console.log(`  Metadata    : ${METADATA_URI}`);
  console.log(`  Supply      : 1,000,000,000 ASH`);
  console.log(`  Decimals    : ${ASH_DECIMALS}`);
  console.log(`  Revoke mint : ${REVOKE_MINT ? "YES — supply permanently fixed after deploy" : "NO — mint authority kept on master wallet"}`);

  if (IS_MAINNET) {
    console.log(
      "\n  ⚠️  MAINNET DEPLOYMENT — this will spend real SOL and create a real token."
    );
    console.log("  Proceeding in 5 seconds. Press Ctrl+C to abort.\n");
    await new Promise((r) => setTimeout(r, 5000));
  }

  // ── Load wallet & connection ─────────────────────────────────────────────
  const master     = loadMasterKeypair();
  const connection = new Connection(RPC_URL, "confirmed");

  console.log(`\n  Master wallet: ${master.publicKey.toBase58()}`);
  console.log(`  Explorer     : ${explorerUrl(master.publicKey.toBase58())}\n`);

  // ── Check SOL balance ────────────────────────────────────────────────────
  const lamports = await connection.getBalance(master.publicKey);
  const sol      = lamports / LAMPORTS_PER_SOL;
  console.log(`  SOL balance  : ${sol.toFixed(4)} SOL`);

  if (sol < 0.05) {
    throw new Error(
      `Insufficient SOL. Need ≥0.05 SOL for fees + rent, have ${sol.toFixed(4)} SOL.\n` +
      (IS_MAINNET
        ? "  Fund your master wallet with SOL before retrying."
        : "  Run: solana airdrop 2 <MASTER_ADDRESS> --url devnet\n  Or visit: https://faucet.solana.com")
    );
  }

  // ── Check for existing deployment ────────────────────────────────────────
  const existingMint = process.env.ASH_MINT_ADDRESS;
  if (existingMint) {
    console.log(`\n  ⚠️  ASH_MINT_ADDRESS is already set in .env: ${existingMint}`);
    console.log("  If you want to redeploy, remove ASH_MINT_ADDRESS from .env first.");
    console.log("  Aborting to prevent duplicate deployments.\n");
    process.exit(0);
  }

  // ── Step 1: Create mint + metadata via Metaplex UMI ─────────────────────
  console.log("\n── Step 1: Creating ASH mint + on-chain metadata...");

  const umi         = createUmi(RPC_URL).use(mplTokenMetadata());
  const umiIdentity = fromWeb3JsKeypair(master);
  umi.use(keypairIdentity(umiIdentity));

  const mintSigner = generateSigner(umi);
  const mintPubkey = toWeb3JsPublicKey(mintSigner.publicKey);

  console.log(`    Mint address : ${mintPubkey.toBase58()}`);

  const { signature: createSig } = await createV1(umi, {
    mint: mintSigner,
    authority: umi.identity,
    updateAuthority: umi.identity,
    name: "ASH Token",
    symbol: "ASH",
    uri: METADATA_URI,
    sellerFeeBasisPoints: percentAmount(0),
    decimals: some(ASH_DECIMALS),
    tokenStandard: TokenStandard.Fungible,
    isMutable: true,
  }).sendAndConfirm(umi, { confirm: { commitment: "confirmed" } });

  const createTxHash = Buffer.from(createSig).toString("base64");
  console.log(`    ✓ Mint + metadata created`);
  console.log(`    TX: ${explorerUrl(createTxHash, "tx")}`);

  // ── Step 2: Create master ATA + mint 1B ASH ──────────────────────────────
  console.log("\n── Step 2: Minting 1,000,000,000 ASH to master wallet...");

  const masterAta = await getOrCreateAssociatedTokenAccount(
    connection,
    master,           // payer
    mintPubkey,       // mint
    master.publicKey  // owner
  );

  console.log(`    Master ATA   : ${masterAta.address.toBase58()}`);

  const mintTxSig = await mintTo(
    connection,
    master,             // payer
    mintPubkey,         // mint
    masterAta.address,  // destination token account
    master.publicKey,   // mint authority
    ASH_SUPPLY_RAW      // 1_000_000_000 × 10^6 raw units
  );

  console.log(`    ✓ 1,000,000,000 ASH minted`);
  console.log(`    TX: ${explorerUrl(mintTxSig, "tx")}`);

  // ── Step 3: Optionally revoke mint authority ──────────────────────────────
  if (REVOKE_MINT) {
    console.log("\n── Step 3: Revoking mint authority (supply now permanently fixed)...");
    const revokeSig = await setAuthority(
      connection,
      master,
      mintPubkey,
      master.publicKey,
      AuthorityType.MintTokens,
      null
    );
    console.log(`    ✓ Mint authority revoked`);
    console.log(`    TX: ${explorerUrl(revokeSig, "tx")}`);
  } else {
    console.log("\n── Step 3: Mint authority retained (can mint more tokens later if needed)");
    console.log("    Run with REVOKE_MINT_AUTHORITY=true to permanently fix supply.");
  }

  // ── Save results ─────────────────────────────────────────────────────────
  console.log("\n── Saving deployment results...");

  updateEnvFile("ASH_MINT_ADDRESS", mintPubkey.toBase58());
  console.log(`    ✓ .env updated with ASH_MINT_ADDRESS`);

  const record = {
    network:      NETWORK,
    mintAddress:  mintPubkey.toBase58(),
    masterWallet: master.publicKey.toBase58(),
    masterAta:    masterAta.address.toBase58(),
    supply:       ASH_SUPPLY.toString(),
    decimals:     ASH_DECIMALS,
    mintRevoked:  REVOKE_MINT,
    metadataUri:  METADATA_URI,
    deployedAt:   new Date().toISOString(),
    explorerUrl:  explorerUrl(mintPubkey.toBase58(), "token"),
  };

  const recordFile = path.join(__dirname, `ash-token-${NETWORK}.json`);
  fs.writeFileSync(recordFile, JSON.stringify(record, null, 2));
  console.log(`    ✓ Deployment record saved to scripts/ash-token-${NETWORK}.json`);

  // ── Final summary ────────────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                   DEPLOYMENT COMPLETE ✓                     ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  Mint Address : ${mintPubkey.toBase58()}`);
  console.log(`║  Supply       : 1,000,000,000 ASH (6 decimals)`);
  console.log(`║  Network      : ${NETWORK}`);
  console.log(`║  Mint auth    : ${REVOKE_MINT ? "REVOKED (supply fixed)" : "master wallet (can mint more)"}`);
  console.log(`║  Metadata URI : ${METADATA_URI}`);
  console.log(`║`);
  console.log(`║  Solscan      : ${explorerUrl(mintPubkey.toBase58(), "token")}`);
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  console.log("Next steps:");
  console.log("  1. Verify the token on Solscan (link above)");
  console.log("  2. Ensure ash-token-metadata.json is hosted at:", METADATA_URI);
  if (!REVOKE_MINT) {
    console.log("  3. When ready to fix supply permanently:");
    console.log("     REVOKE_MINT_AUTHORITY=true npx ts-node scripts/revokeAshMint.ts");
  }
  console.log("  4. The backend will automatically pick up ASH_MINT_ADDRESS from .env\n");
}

main().catch((err) => {
  console.error("\n  ✗ Deployment failed:", err.message || err);
  process.exit(1);
});
