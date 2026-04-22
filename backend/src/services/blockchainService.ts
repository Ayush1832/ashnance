// ============================================================
// Ashnance Backend — Blockchain Service
// ============================================================
// Handles all Solana blockchain interactions:
//   - Generating unique deposit addresses (deterministic, recoverable)
//   - Monitoring deposit addresses for incoming USDC (SPL token)
//   - Sweeping deposited USDC to master wallet
//   - Processing confirmed deposits
//   - Validating Solana addresses
//   - VRF simulation for fair randomness
//   - Sending USDC transfers for prizes/withdrawals

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
} from "@solana/spl-token";
import * as crypto from "crypto";

// ---- Constants ----

/** USDC SPL token mint on Solana mainnet */
export const USDC_MINT_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

/** USDC SPL token mint on Solana devnet */
export const USDC_MINT_DEVNET = "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr";

const RPC_URL =
  process.env.SOLANA_RPC_URL || clusterApiUrl("devnet");

// Prefer explicit env var; fall back to RPC URL to detect network
const USDC_MINT =
  process.env.USDC_MINT ||
  (RPC_URL.includes("mainnet") ? USDC_MINT_MAINNET : USDC_MINT_DEVNET);

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
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "[BlockchainService] MASTER_KEYPAIR_SECRET is set but could not be parsed. " +
          "Refusing to start with insecure fallback in production."
        );
      }
      console.warn(
        "[BlockchainService] Could not parse MASTER_KEYPAIR_SECRET — using deterministic fallback"
      );
    }
  } else if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[BlockchainService] MASTER_KEYPAIR_SECRET is not set. " +
      "This is required in production to prevent loss of funds."
    );
  }
  // Deterministic fallback for development only (do NOT use in production)
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
   * Deterministically derives a unique Solana deposit address for a userId.
   * The private key is RECOVERABLE via getDepositKeypair(userId).
   * This is required so deposited USDC can be swept to the master wallet.
   */
  static async generateDepositAddress(userId: string): Promise<string> {
    const keypair = BlockchainService.getDepositKeypair(userId);
    return keypair.publicKey.toBase58();
  }

  // ----------------------------------------------------------
  // getDepositKeypair
  // ----------------------------------------------------------
  /**
   * Re-derives the Keypair for a userId's deposit address.
   * Used for sweeping deposited USDC to the master wallet.
   */
  static getDepositKeypair(userId: string): Keypair {
    const master = getMasterKeypair();
    const derivedSeed = crypto
      .createHash("sha256")
      .update(
        Buffer.concat([
          master.secretKey.slice(0, 32),
          Buffer.from(`deposit-${userId}`, "utf8"),
        ])
      )
      .digest()
      .slice(0, 32);
    return Keypair.fromSeed(Uint8Array.from(derivedSeed));
  }

  // ----------------------------------------------------------
  // getMasterWalletAddress
  // ----------------------------------------------------------
  /**
   * Returns the master wallet public key (the platform's main wallet).
   * This is where all deposited USDC is swept, and from where prizes
   * and withdrawals are paid.
   */
  static getMasterWalletAddress(): string {
    return getMasterKeypair().publicKey.toBase58();
  }

  /** Returns the USDC mint address for the current network */
  static getUsdcMint(): string {
    return USDC_MINT;
  }

  // ----------------------------------------------------------
  // validateSolanaAddress
  // ----------------------------------------------------------
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
   * given seed string, using crypto.randomBytes mixed with the seed.
   * In production this should be replaced by Switchboard or Pyth VRF.
   */
  static simulateVRF(seed: string): number {
    try {
      const entropy = crypto.randomBytes(32);
      const hash = crypto
        .createHash("sha256")
        .update(Buffer.concat([Buffer.from(seed, "utf8"), entropy]))
        .digest();
      return hash.readUInt32BE(0) / 0x1_0000_0000;
    } catch {
      return crypto.randomBytes(4).readUInt32BE(0) / 0x1_0000_0000;
    }
  }

  // ----------------------------------------------------------
  // getUsdcBalance
  // ----------------------------------------------------------
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
  // verifyDepositTransaction
  // ----------------------------------------------------------
  /**
   * Verifies that a transaction sent USDC to the platform master wallet.
   * Returns the deposited amount, or null if verification fails.
   */
  static async verifyDepositTransaction(
    txHash: string
  ): Promise<{ amount: number } | null> {
    try {
      const connection = getConnection();
      const masterAddress = BlockchainService.getMasterWalletAddress();

      const tx = await connection.getParsedTransaction(txHash, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });

      if (!tx || !tx.meta) return null;

      const postBalances = tx.meta.postTokenBalances ?? [];
      const preBalances  = tx.meta.preTokenBalances  ?? [];

      for (const post of postBalances) {
        if (post.owner !== masterAddress || post.mint !== USDC_MINT) continue;

        const pre = preBalances.find((p) => p.accountIndex === post.accountIndex);
        const delta =
          (post.uiTokenAmount.uiAmount ?? 0) -
          (pre?.uiTokenAmount.uiAmount ?? 0);

        if (delta > 0) return { amount: delta };
      }

      return null;
    } catch (err) {
      console.error("[BlockchainService] verifyDepositTransaction error:", err);
      return null;
    }
  }

  // ----------------------------------------------------------
  // sweepDepositToMaster
  // ----------------------------------------------------------
  /**
   * Transfers all USDC from a user's deposit address to the master wallet.
   * Called after a deposit is detected and credited in the DB.
   * Returns the transaction signature, or null if balance is zero.
   */
  static async sweepDepositToMaster(
    userId: string,
    depositAddress: string
  ): Promise<string | null> {
    try {
      const connection = getConnection();
      const depositKeypair = BlockchainService.getDepositKeypair(userId);
      const master = getMasterKeypair();
      const mint = new PublicKey(USDC_MINT);

      // Verify keypair matches stored address
      if (depositKeypair.publicKey.toBase58() !== depositAddress) {
        console.warn(
          `[BlockchainService] sweepDepositToMaster — derived address mismatch for user ${userId}`
        );
        return null;
      }

      const balance = await BlockchainService.getUsdcBalance(depositAddress);
      if (balance <= 0) return null;

      const fromAta = getAssociatedTokenAddressSync(mint, depositKeypair.publicKey);
      const toAta   = getAssociatedTokenAddressSync(mint, master.publicKey);

      const instructions = [];

      // Create master ATA if it doesn't exist yet
      const toAtaInfo = await connection.getAccountInfo(toAta);
      if (!toAtaInfo) {
        instructions.push(
          createAssociatedTokenAccountInstruction(
            depositKeypair.publicKey,
            toAta,
            master.publicKey,
            mint
          )
        );
      }

      const rawAmount = BigInt(Math.round(balance * 1_000_000));
      instructions.push(
        createTransferInstruction(fromAta, toAta, depositKeypair.publicKey, rawAmount)
      );

      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      const tx = new Transaction({ recentBlockhash: blockhash, feePayer: depositKeypair.publicKey });
      tx.add(...instructions);
      tx.sign(depositKeypair);

      const txHash = await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        { signature: txHash, ...latestBlockhash },
        "confirmed"
      );

      console.log(
        `[BlockchainService] Swept ${balance} USDC from ${depositAddress} → master wallet, tx: ${txHash}`
      );
      return txHash;
    } catch (err) {
      // Sweep failure is non-fatal — the DB has already been credited
      console.error("[BlockchainService] sweepDepositToMaster error:", err);
      return null;
    }
  }

  // ----------------------------------------------------------
  // monitorDeposit
  // ----------------------------------------------------------
  /**
   * Polls `address` every 15 seconds for new USDC token transfers.
   * When a new incoming transfer is detected the `callback` is invoked
   * with (amount, txHash).
   */
  static monitorDeposit(
    address: string,
    callback: (amount: number, txHash: string) => void
  ): void {
    if (!BlockchainService.validateSolanaAddress(address)) {
      console.error("[BlockchainService] monitorDeposit — invalid address:", address);
      return;
    }

    BlockchainService.stopMonitor(address);

    const connection = getConnection();
    const owner = new PublicKey(address);
    const mint = new PublicKey(USDC_MINT);

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
          for (const sig of signatures) {
            seenSignatures.add(sig.signature);
          }
          firstPoll = false;
          return;
        }

        for (const sigInfo of signatures) {
          if (seenSignatures.has(sigInfo.signature)) continue;
          seenSignatures.add(sigInfo.signature);

          const tx = await connection.getParsedTransaction(sigInfo.signature, {
            maxSupportedTransactionVersion: 0,
          });

          if (!tx || !tx.meta) continue;

          const postBalances = tx.meta.postTokenBalances ?? [];
          const preBalances  = tx.meta.preTokenBalances  ?? [];

          for (const post of postBalances) {
            if (post.owner !== address || post.mint !== USDC_MINT) continue;

            const pre = preBalances.find(
              (p) => p.accountIndex === post.accountIndex
            );

            const postAmount = post.uiTokenAmount.uiAmount ?? 0;
            const preAmount  = pre?.uiTokenAmount.uiAmount ?? 0;
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
    poll();

    console.log(`[BlockchainService] Started monitoring deposit address: ${address}`);
  }

  // ----------------------------------------------------------
  // stopMonitor / stopAllMonitors
  // ----------------------------------------------------------
  static stopMonitor(address: string): void {
    const handle = _monitorHandles.get(address);
    if (handle !== undefined) {
      clearInterval(handle);
      _monitorHandles.delete(address);
    }
  }

  static stopAllMonitors(): void {
    for (const [address, handle] of _monitorHandles.entries()) {
      clearInterval(handle);
      console.log(`[BlockchainService] Stopped monitoring: ${address}`);
    }
    _monitorHandles.clear();
  }

  // ----------------------------------------------------------
  // sendUsdcTransfer
  // ----------------------------------------------------------
  /**
   * Sends USDC from the platform master wallet to `toAddress`.
   * Creates the recipient's associated token account if it does not exist.
   * Returns the transaction signature.
   *
   * PREREQUISITE: The master wallet must hold enough USDC (auto-funded
   * by sweepDepositToMaster after each user deposit).
   */
  static async sendUsdcTransfer(
    toAddress: string,
    amountUsdc: number
  ): Promise<string> {
    const connection = getConnection();
    const master = getMasterKeypair();
    const mint = new PublicKey(USDC_MINT);
    const toOwner = new PublicKey(toAddress);

    const fromAta = getAssociatedTokenAddressSync(mint, master.publicKey);
    const toAta   = getAssociatedTokenAddressSync(mint, toOwner);

    const instructions = [];

    // Create destination ATA if it doesn't exist
    const toAtaInfo = await connection.getAccountInfo(toAta);
    if (!toAtaInfo) {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          master.publicKey,
          toAta,
          toOwner,
          mint
        )
      );
    }

    const rawAmount = BigInt(Math.round(amountUsdc * 1_000_000));
    instructions.push(
      createTransferInstruction(fromAta, toAta, master.publicKey, rawAmount)
    );

    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    const tx = new Transaction({ recentBlockhash: blockhash, feePayer: master.publicKey });
    tx.add(...instructions);
    tx.sign(master);

    const txHash = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction(
      { signature: txHash, ...latestBlockhash },
      "confirmed"
    );

    console.log(
      `[BlockchainService] USDC transfer confirmed — ${amountUsdc} USDC to ${toAddress}, tx: ${txHash}`
    );
    return txHash;
  }

  // ----------------------------------------------------------
  // getTransactionStatus
  // ----------------------------------------------------------
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
    } catch {
      return null;
    }
  }

  // ----------------------------------------------------------
  // requestDevnetAirdrop  (devnet only — for setup/testing)
  // ----------------------------------------------------------
  /**
   * Requests a SOL airdrop for the master wallet on devnet.
   * Required so the master wallet can pay transaction fees.
   */
  static async requestDevnetAirdrop(lamports: number = 2_000_000_000): Promise<string | null> {
    if (!(process.env.SOLANA_RPC_URL || "").includes("devnet")) return null;
    try {
      const connection = getConnection();
      const master = getMasterKeypair();
      const sig = await connection.requestAirdrop(master.publicKey, lamports);
      await connection.confirmTransaction(sig, "confirmed");
      console.log(`[BlockchainService] Airdropped ${lamports / 1e9} SOL to master wallet`);
      return sig;
    } catch (err) {
      console.error("[BlockchainService] Airdrop failed:", err);
      return null;
    }
  }
}

export default BlockchainService;
