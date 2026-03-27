// ============================================================
// Ashnance Frontend — Solana Blockchain Integration
// ============================================================
// Lightweight Solana wallet integration that does NOT require
// @solana/wallet-adapter.  Works directly with browser wallet
// extension APIs (Phantom, Solflare) and the Solana JSON-RPC.

const DEFAULT_RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";

/** USDC SPL token mint — devnet */
const USDC_MINT_DEVNET = "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr";
/** USDC SPL token mint — mainnet */
const USDC_MINT_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export const USDC_MINT =
  process.env.NEXT_PUBLIC_NETWORK === "mainnet"
    ? USDC_MINT_MAINNET
    : USDC_MINT_DEVNET;

// ---- Type declarations for browser wallet extensions ----

interface PhantomProvider {
  isPhantom: boolean;
  publicKey: { toBase58: () => string } | null;
  isConnected: boolean;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toBase58: () => string } }>;
  disconnect: () => Promise<void>;
  signTransaction: (transaction: unknown) => Promise<unknown>;
  signAndSendTransaction: (transaction: unknown, options?: unknown) => Promise<{ signature: string }>;
  request: (params: { method: string; params?: unknown }) => Promise<unknown>;
}

interface SolflareProvider {
  isSolflare: boolean;
  publicKey: { toBase58: () => string } | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signTransaction: (transaction: unknown) => Promise<unknown>;
  signAndSendTransaction: (transaction: unknown) => Promise<{ signature: string }>;
}

interface WindowWithWallets extends Window {
  solana?: PhantomProvider;
  solflare?: SolflareProvider;
}

// ============================================================
// Wallet Detection
// ============================================================

/**
 * Returns true if the Phantom wallet extension is installed and available.
 */
export function detectPhantom(): boolean {
  if (typeof window === "undefined") return false;
  const win = window as WindowWithWallets;
  return !!(win.solana && win.solana.isPhantom);
}

/**
 * Returns true if the Solflare wallet extension is installed and available.
 */
export function detectSolflare(): boolean {
  if (typeof window === "undefined") return false;
  const win = window as WindowWithWallets;
  return !!(win.solflare && win.solflare.isSolflare);
}

// ============================================================
// Wallet Connection
// ============================================================

/**
 * Requests a connection to the Phantom wallet.
 * Returns the connected wallet's public key as a base58 string,
 * or null if the user rejects / Phantom is not installed.
 */
export async function connectPhantom(): Promise<string | null> {
  try {
    if (!detectPhantom()) {
      console.warn("[blockchain] Phantom wallet not detected.");
      return null;
    }

    const win = window as WindowWithWallets;
    const provider = win.solana as PhantomProvider;

    const response = await provider.connect();
    const pubkey = response.publicKey.toBase58();
    console.log("[blockchain] Phantom connected:", pubkey);
    return pubkey;
  } catch (err) {
    console.error("[blockchain] connectPhantom error:", err);
    return null;
  }
}

/**
 * Requests a connection to the Solflare wallet.
 * Returns the connected wallet's public key as a base58 string,
 * or null if the user rejects / Solflare is not installed.
 */
export async function connectSolflare(): Promise<string | null> {
  try {
    if (!detectSolflare()) {
      console.warn("[blockchain] Solflare wallet not detected.");
      return null;
    }

    const win = window as WindowWithWallets;
    const provider = win.solflare as SolflareProvider;

    await provider.connect();

    const pubkey = provider.publicKey?.toBase58() ?? null;
    if (pubkey) {
      console.log("[blockchain] Solflare connected:", pubkey);
    }
    return pubkey;
  } catch (err) {
    console.error("[blockchain] connectSolflare error:", err);
    return null;
  }
}

/**
 * Disconnects whichever wallet is currently connected.
 */
export async function disconnectWallet(): Promise<void> {
  try {
    const win = window as WindowWithWallets;
    if (win.solana?.isConnected) {
      await win.solana.disconnect();
    } else if (win.solflare?.isConnected) {
      await win.solflare.disconnect();
    }
  } catch (err) {
    console.error("[blockchain] disconnectWallet error:", err);
  }
}

// ============================================================
// Transaction Signing
// ============================================================

/**
 * Signs and sends a transaction using whichever wallet is connected.
 * `transaction` is expected to be a serialised / constructed transaction
 * object compatible with the active wallet's API.
 *
 * Returns the transaction signature string, or null on failure.
 */
export async function signAndSendTransaction(
  transaction: unknown
): Promise<string | null> {
  try {
    const win = window as WindowWithWallets;

    if (win.solana?.isConnected) {
      const result = await win.solana.signAndSendTransaction(transaction);
      return result.signature;
    }

    if (win.solflare?.isConnected) {
      const result = await win.solflare.signAndSendTransaction(transaction);
      return result.signature;
    }

    console.warn("[blockchain] signAndSendTransaction — no wallet connected.");
    return null;
  } catch (err) {
    console.error("[blockchain] signAndSendTransaction error:", err);
    return null;
  }
}

// ============================================================
// Balance Queries (via JSON-RPC — no package required)
// ============================================================

/**
 * Returns the SOL balance of `address` in SOL units (not lamports).
 * Uses the configured RPC endpoint via fetch.
 */
export async function getWalletBalance(address: string): Promise<number> {
  try {
    const body = {
      jsonrpc: "2.0",
      id: 1,
      method: "getBalance",
      params: [address],
    };

    const response = await fetch(DEFAULT_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`RPC responded with HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`RPC error: ${data.error.message}`);
    }

    // Balance is returned in lamports; 1 SOL = 1,000,000,000 lamports
    const lamports: number = data.result?.value ?? 0;
    return lamports / 1_000_000_000;
  } catch (err) {
    console.error("[blockchain] getWalletBalance error:", err);
    return 0;
  }
}

/**
 * Returns the USDC SPL token balance of `address` in human-readable USDC
 * units (i.e. divided by 10^6).
 *
 * @param address  - Wallet owner's public key (base58)
 * @param rpcUrl   - Optional RPC endpoint; falls back to DEFAULT_RPC
 */
export async function getUsdcBalance(
  address: string,
  rpcUrl: string = DEFAULT_RPC
): Promise<number> {
  try {
    // Step 1: get all token accounts owned by `address` for the USDC mint
    const body = {
      jsonrpc: "2.0",
      id: 1,
      method: "getTokenAccountsByOwner",
      params: [
        address,
        { mint: USDC_MINT },
        { encoding: "jsonParsed" },
      ],
    };

    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`RPC responded with HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`RPC error: ${data.error.message}`);
    }

    const accounts: Array<{
      account: {
        data: {
          parsed: {
            info: {
              tokenAmount: {
                uiAmount: number | null;
              };
            };
          };
        };
      };
    }> = data.result?.value ?? [];

    if (accounts.length === 0) return 0;

    const uiAmount =
      accounts[0].account.data.parsed?.info?.tokenAmount?.uiAmount ?? 0;

    return typeof uiAmount === "number" ? uiAmount : 0;
  } catch (err) {
    console.error("[blockchain] getUsdcBalance error:", err);
    return 0;
  }
}

// ============================================================
// Utility Helpers
// ============================================================

/**
 * Attempts to copy `text` to the clipboard.
 * Returns true on success, false on failure (e.g. no permission).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator === "undefined") return false;

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback for older browsers / insecure contexts
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    return success;
  } catch (err) {
    console.error("[blockchain] copyToClipboard error:", err);
    return false;
  }
}

/**
 * Shortens a Solana base58 address to "XXXX...XXXX" format.
 *
 * @param address - Full base58 public key string
 * @param chars   - Number of characters to keep on each side (default: 4)
 */
export function shortenAddress(address: string, chars: number = 4): string {
  if (!address || address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
