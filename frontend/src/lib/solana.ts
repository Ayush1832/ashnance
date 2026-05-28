// Real Solana multi-wallet adapter for Ashnance.
// Supports Phantom, Backpack, Solflare, OKX, and Coinbase wallets.

export type WalletProvider = "PHANTOM" | "BACKPACK" | "SOLFLARE" | "OKX" | "COINBASE";

export const walletOptions: { id: WalletProvider; name: string; icon: string }[] = [
  { id: "PHANTOM",  name: "Phantom",         icon: "👻" },
  { id: "BACKPACK", name: "Backpack",         icon: "🎒" },
  { id: "SOLFLARE", name: "Solflare",         icon: "☀️" },
  { id: "OKX",      name: "OKX Wallet",       icon: "⭕" },
  { id: "COINBASE", name: "Coinbase Wallet",  icon: "🔵" },
];

// Keep track of the last connected provider so signMessage can reuse it
let _lastProvider: any = null;

function getProvider(providerId: WalletProvider): any | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  switch (providerId) {
    case "PHANTOM":
      return w.phantom?.solana ?? (w.solana?.isPhantom ? w.solana : null);
    case "BACKPACK":
      return w.backpack ?? null;
    case "SOLFLARE":
      return w.solflare?.isSolflare ? w.solflare : null;
    case "OKX":
      return w.okxwallet?.solana ?? null;
    case "COINBASE":
      return w.coinbaseSolana ?? w.coinbaseWalletExtension ?? null;
    default:
      return null;
  }
}

export async function connectWallet(
  providerId: WalletProvider,
): Promise<{ address: string }> {
  const provider = getProvider(providerId);
  if (!provider) {
    throw new Error(
      `${providerId} wallet not detected. Please install the browser extension first.`,
    );
  }

  await provider.connect();

  const pk = provider.publicKey;
  if (!pk) throw new Error("Wallet connected but no public key returned.");

  const address =
    typeof pk.toBase58 === "function" ? pk.toBase58() : String(pk);

  _lastProvider = provider;
  return { address };
}

export async function signMessage(
  address: string,
  message: string,
): Promise<{ signature: number[]; message: string }> {
  // Try the cached provider first, then scan all known wallets
  const candidates: any[] = [];
  if (_lastProvider) candidates.push(_lastProvider);

  if (typeof window !== "undefined") {
    const w = window as any;
    const extras = [
      w.phantom?.solana ?? (w.solana?.isPhantom ? w.solana : null),
      w.backpack,
      w.solflare?.isSolflare ? w.solflare : null,
      w.okxwallet?.solana,
      w.coinbaseSolana,
    ];
    for (const p of extras) {
      if (p && !candidates.includes(p)) candidates.push(p);
    }
  }

  const provider = candidates.find((p) => {
    if (!p?.publicKey) return false;
    const addr =
      typeof p.publicKey.toBase58 === "function"
        ? p.publicKey.toBase58()
        : String(p.publicKey);
    return addr === address;
  });

  if (!provider) {
    throw new Error(
      "No connected wallet found for this address. Please reconnect your wallet.",
    );
  }

  const encoded = new TextEncoder().encode(message);
  const result = await provider.signMessage(encoded, "utf8");

  let sigBytes: Uint8Array;
  if (result instanceof Uint8Array) {
    sigBytes = result;
  } else if (result?.signature instanceof Uint8Array) {
    sigBytes = result.signature;
  } else if (result?.signature) {
    sigBytes = new Uint8Array(Object.values(result.signature) as number[]);
  } else {
    throw new Error("Could not extract signature from wallet response.");
  }

  return { signature: Array.from(sigBytes), message };
}

export function truncate(addr: string, n = 4): string {
  if (!addr) return "";
  return addr.slice(0, n) + "..." + addr.slice(-n);
}
