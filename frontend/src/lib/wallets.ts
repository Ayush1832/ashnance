/**
 * Ashnance — Multi-wallet abstraction for Solana wallets
 * Supports Phantom, Backpack, Solflare, OKX, and any wallet
 * that implements the standard Solana wallet interface.
 */

export interface WalletProvider {
  name: string;
  icon: string;       // emoji or url
  installed: boolean;
  downloadUrl: string;
  // The raw provider object from window — typed as any since each wallet
  // exposes slightly different shapes, but all support the same core methods
  provider: any;
}

export interface ConnectedWallet {
  name: string;
  publicKey: string;
  provider: any;
}

/** Detect all supported wallets and whether they're installed */
export function detectWallets(): WalletProvider[] {
  if (typeof window === "undefined") return [];

  const w = window as any;

  return [
    {
      name: "Phantom",
      icon: "👻",
      installed: !!(w.phantom?.solana?.isPhantom || w.solana?.isPhantom),
      downloadUrl: "https://phantom.app",
      provider: w.phantom?.solana ?? (w.solana?.isPhantom ? w.solana : null),
    },
    {
      name: "Backpack",
      icon: "🎒",
      installed: !!(w.backpack?.isBackpack),
      downloadUrl: "https://backpack.app",
      provider: w.backpack ?? null,
    },
    {
      name: "Solflare",
      icon: "☀️",
      installed: !!(w.solflare?.isSolflare),
      downloadUrl: "https://solflare.com",
      provider: w.solflare ?? null,
    },
    {
      name: "OKX Wallet",
      icon: "⭕",
      installed: !!(w.okxwallet?.solana),
      downloadUrl: "https://okx.com/web3",
      provider: w.okxwallet?.solana ?? null,
    },
    {
      name: "Coinbase Wallet",
      icon: "🔵",
      installed: !!(w.coinbaseSolana || w.coinbaseWalletExtension?.isCoinbaseWallet),
      downloadUrl: "https://wallet.coinbase.com",
      provider: w.coinbaseSolana ?? null,
    },
  ];
}

/** Connect a wallet and return the public key */
export async function connectWallet(provider: any): Promise<string> {
  if (!provider) throw new Error("Wallet not available");
  await provider.connect();
  const pk = provider.publicKey;
  if (!pk) throw new Error("Could not get public key from wallet");
  return typeof pk.toBase58 === "function" ? pk.toBase58() : String(pk);
}

/** Sign a message with the wallet — returns signature as Uint8Array */
export async function signMessage(provider: any, message: string): Promise<Uint8Array> {
  const encoded = new TextEncoder().encode(message);
  const result = await provider.signMessage(encoded, "utf8");
  // Different wallets return signature differently
  if (result instanceof Uint8Array) return result;
  if (result?.signature instanceof Uint8Array) return result.signature;
  if (result?.signature) return new Uint8Array(Object.values(result.signature) as number[]);
  throw new Error("Could not extract signature from wallet response");
}
