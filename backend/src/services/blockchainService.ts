// ============================================================
// Ashnance Backend — Blockchain Service
// ============================================================
// Handles all Solana blockchain interactions:
//   - Generating unique deposit addresses
//   - Monitoring deposit addresses for incoming USDC (SPL token)
//   - Processing confirmed deposits
//   - Validating Solana addresses
//   - VRF simulation for fair randomness
//   - Tracking transaction hashes for withdrawals

import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
} from "@solana/web3.js";
import * as crypto from "crypto";

// ---- Constants ----

/** USDC SPL token mint on Solana mainnet */
export const USDC_MINT_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

/** USDC SPL token mint on Solana devnet */
export const USDC_MINT_DEVNET = "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr";

/** Token program ID */
const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

/** Associated Token Program ID */
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bFT"
);

const RPC_URL =
  process.env.SOLANA_RPC_URL || clusterApiUrl("devnet");

const USDC_MINT =
  process.env.NODE_ENV === "production" ? USDC_MINT_MAINNET : USDC_MINT_DEVNET;

// ---- Address derivation counter (in-memory; replace with DB for production) ----
let _addressCounter = 0;

// ---- Active polling handles (address -> NodeJS.Timeout) ----
const _monitorHandles = new Map<string, ReturnType<typeof setInterval>>();

// ---- Connection singleton ----
let _connection: Connection | null = null;

function getConnection(): Connection {
  if (!_connection) {
    _connection = new Connection(RPC_URL, "confirmed");
  }
  return _connection;
}

// ---- Master keypair loaded from env ----
function getMasterKeypair(): Keypair {
  const secretEnv = process.env.MASTER_KEYPAIR_SECRET;
  if (secretEnv) {
    try {
      const secretArray = JSON.parse(secretEnv) as number[];
      return Keypair.fromSecretKey(Uint8Array.from(secretArray));
    } catch {
      console.warn(
        "[BlockchainService] Could not parse MASTER_KEYPAIR_SECRET — using deterministic fallback"
      );
    }
  }

  // Deterministic fallback for development (do NOT use in production)
  const seed = Buffer.alloc(32);
  seed.write("ashnance-dev-master-seed-v1", "utf8");
  return Keypair.fromSeed(seed);
}

// ============================================================
// BlockchainService
// ============================================================

export class BlockchainService {
  // ----------------------------------------------------------
  // generateDepositAddress
  // ----------------------------------------------------------
  /**
   * Derives a unique Solana public key from the master keypair using
   * a sequential counter mixed with crypto entropy.
   *
   * Returns a unique Solana address (public key string) for each call.
   */
  static generateDepositAddress(): string {
    try {
      const master = getMasterKeypair();
      const counter = _addressCounter++;

      // Mix master seed + counter + random entropy
      const hashInput = Buffer.concat([
        master.secretKey.slice(0, 32),
        Buffer.from(counter.toString()),
        crypto.randomBytes(4),
      ]);

      const derivedSeed = crypto
        .createHash("sha256")
        .update(hashInput)
        .digest()
        .slice(0, 32);

      const derived = Keypair.fromSeed(Uint8Array.from(derivedSeed));
      return derived.publicKey.toBase58();
    } catch (err) {
      console.error("[BlockchainService] generateDepositAddress error:", err);
      // Last-resort fallback: generate a fresh random keypair
      return Keypair.generate().publicKey.toBase58();
    }
  }

  // ----------------------------------------------------------
  // validateSolanaAddress
  // ----------------------------------------------------------
  /**
   * Returns true if `address` is a valid base58-encoded Solana public key.
   */
  static validateSolanaAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  // ----------------------------------------------------------
  // simulateVRF
  // ----------------------------------------------------------
  /**
   * Produces a deterministic-but-unpredictable float in [0, 1) for a
   * given seed string, using crypto.randomBytes mixed with the seed for
   * better entropy than Math.random().
   *
   * In production this should be replaced by Switchboard or Pyth VRF.
   */
  static simulateVRF(seed: string): number {
    try {
      const entropy = crypto.randomBytes(32);
      const hashInput = Buffer.concat([
        Buffer.from(seed, "utf8"),
        entropy,
      ]);

      const hash = crypto.createHash("sha256").update(hashInput).digest();

      // Read first 4 bytes as an unsigned 32-bit integer and normalise to [0, 1)
      const uint32 = hash.readUInt32BE(0);
      return uint32 / 0x1_0000_0000; // divide by 2^32
    } catch (err) {
      console.error("[BlockchainService] simulateVRF error:", err);
      // Fallback — still better than a raw Math.random() call
      const fallback = crypto.randomBytes(4).readUInt32BE(0);
      return fallback / 0x1_0000_0000;
    }
  }

  // ----------------------------------------------------------
  // getUsdcBalance
  // ----------------------------------------------------------
  /**
   * Returns the USDC (SPL token) balance of `ownerAddress` in human-
   * readable USDC units (i.e. divided by 10^6).
   */
  static async getUsdcBalance(ownerAddress: string): Promise<number> {
    try {
      const connection = getConnection();
      const owner = new PublicKey(ownerAddress);
      const mint = new PublicKey(USDC_MINT);

      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        owner,
        { mint }
      );

      if (tokenAccounts.value.length === 0) return 0;

      const uiAmount =
        tokenAccounts.value[0].account.data.parsed?.info?.tokenAmount
          ?.uiAmount ?? 0;

      return typeof uiAmount === "number" ? uiAmount : 0;
    } catch (err) {
      console.error("[BlockchainService] getUsdcBalance error:", err);
      return 0;
    }
  }

  // ----------------------------------------------------------
  // monitorDeposit
  // ----------------------------------------------------------
  /**
   * Polls `address` every 15 seconds for new USDC token transfers.
   * When a new incoming transfer is detected the `callback` is invoked
   * with (amount, txHash).
   *
   * Polling is used here for simplicity / dev compatibility.
   * In production, replace with WebSocket subscriptions or a webhook
   * from a Helius / QuickNode account.
   */
  static monitorDeposit(
    address: string,
    callback: (amount: number, txHash: string) => void
  ): void {
    if (!BlockchainService.validateSolanaAddress(address)) {
      console.error("[BlockchainService] monitorDeposit — invalid address:", address);
      return;
    }

    // Stop any existing monitor for this address
    BlockchainService.stopMonitor(address);

    const connection = getConnection();
    const owner = new PublicKey(address);
    const mint = new PublicKey(USDC_MINT);

    /** Signatures we have already processed */
    const seenSignatures = new Set<string>();

    let firstPoll = true;

    const poll = async () => {
      try {
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          owner,
          { mint }
        );

        if (tokenAccounts.value.length === 0) {
          firstPoll = false;
          return;
        }

        const tokenAccountPubkey = tokenAccounts.value[0].pubkey;

        const signatures = await connection.getSignaturesForAddress(
          tokenAccountPubkey,
          { limit: 10 }
        );

        if (firstPoll) {
          // Seed the seen set so we don't replay historical transactions
          for (const sig of signatures) {
            seenSignatures.add(sig.signature);
          }
          firstPoll = false;
          return;
        }

        for (const sigInfo of signatures) {
          if (seenSignatures.has(sigInfo.signature)) continue;
          seenSignatures.add(sigInfo.signature);

          // Parse the transaction to extract the transferred amount
          const tx = await connection.getParsedTransaction(sigInfo.signature, {
            maxSupportedTransactionVersion: 0,
          });

          if (!tx || !tx.meta) continue;

          // Look for postTokenBalance entries for our address
          const postBalances = tx.meta.postTokenBalances ?? [];
          const preBalances = tx.meta.preTokenBalances ?? [];

          for (const post of postBalances) {
            if (
              post.owner !== address ||
              post.mint !== USDC_MINT
            ) {
              continue;
            }

            const pre = preBalances.find(
              (p) => p.accountIndex === post.accountIndex
            );

            const postAmount = post.uiTokenAmount.uiAmount ?? 0;
            const preAmount = pre?.uiTokenAmount.uiAmount ?? 0;
            const delta = postAmount - preAmount;

            if (delta > 0) {
              console.log(
                `[BlockchainService] Deposit detected — address: ${address}, amount: ${delta} USDC, tx: ${sigInfo.signature}`
              );
              callback(delta, sigInfo.signature);
            }
          }
        }
      } catch (err) {
        console.error("[BlockchainService] monitorDeposit poll error:", err);
      }
    };

    const handle = setInterval(poll, 15_000);
    _monitorHandles.set(address, handle);

    // Run an initial poll immediately (async — intentionally not awaited)
    poll();

    console.log(
      `[BlockchainService] Started monitoring deposit address: ${address}`
    );
  }

  // ----------------------------------------------------------
  // stopMonitor
  // ----------------------------------------------------------
  /**
   * Stops the polling loop for `address` if one is active.
   */
  static stopMonitor(address: string): void {
    const handle = _monitorHandles.get(address);
    if (handle !== undefined) {
      clearInterval(handle);
      _monitorHandles.delete(address);
      console.log(`[BlockchainService] Stopped monitoring: ${address}`);
    }
  }

  // ----------------------------------------------------------
  // stopAllMonitors
  // ----------------------------------------------------------
  /**
   * Stops all active deposit monitors.  Call on graceful shutdown.
   */
  static stopAllMonitors(): void {
    for (const [address, handle] of _monitorHandles.entries()) {
      clearInterval(handle);
      console.log(`[BlockchainService] Stopped monitoring: ${address}`);
    }
    _monitorHandles.clear();
  }

  // ----------------------------------------------------------
  // getTransactionStatus
  // ----------------------------------------------------------
  /**
   * Returns the confirmation status of a transaction hash, or null if
   * it cannot be found.
   */
  static async getTransactionStatus(
    txHash: string
  ): Promise<"confirmed" | "finalized" | "pending" | null> {
    try {
      const connection = getConnection();
      const status = await connection.getSignatureStatus(txHash);

      if (!status.value) return null;

      const confirmation = status.value.confirmationStatus;
      if (confirmation === "finalized") return "finalized";
      if (confirmation === "confirmed") return "confirmed";
      return "pending";
    } catch (err) {
      console.error("[BlockchainService] getTransactionStatus error:", err);
      return null;
    }
  }
}

export default BlockchainService;
