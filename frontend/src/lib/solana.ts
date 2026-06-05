// Real Solana multi-wallet adapter for Ashnance.
// Supports Phantom, Backpack, Solflare, OKX, and Coinbase wallets.

import { Buffer } from "buffer";

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

/** Best-effort disconnect of the last-connected wallet provider so the user can
 *  link a different wallet. Safe to call even if nothing is connected. */
export async function disconnectWallet(): Promise<void> {
  try {
    await _lastProvider?.disconnect?.();
  } catch {
    /* provider may not support disconnect — clearing the cache is enough */
  }
  _lastProvider = null;
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

/** Find the already-connected provider whose publicKey matches `address`. */
function findProviderForAddress(address: string): any | null {
  const candidates: any[] = [];
  if (_lastProvider) candidates.push(_lastProvider);
  if (typeof window !== "undefined") {
    const w = window as any;
    for (const p of [
      w.phantom?.solana ?? (w.solana?.isPhantom ? w.solana : null),
      w.backpack,
      w.solflare?.isSolflare ? w.solflare : null,
      w.okxwallet?.solana,
      w.coinbaseSolana,
    ]) {
      if (p && !candidates.includes(p)) candidates.push(p);
    }
  }
  return (
    candidates.find((p) => {
      if (!p?.publicKey) return false;
      const a = typeof p.publicKey.toBase58 === "function" ? p.publicKey.toBase58() : String(p.publicKey);
      return a === address;
    }) ?? null
  );
}

/**
 * Build and send a USDC SPL transfer from the connected wallet to the platform
 * master wallet, returning the transaction signature. The backend then verifies
 * the tx on-chain (POST /api/wallet/deposit) and credits the internal balance.
 */
export async function sendUsdcTransfer(params: {
  address: string;
  masterWallet: string;
  usdcMint: string;
  amount: number;
  network: string;
  /** Attribution memo written on-chain so the backend can bind this deposit to
   *  the calling user (prevents anyone else from claiming the same tx). */
  memo: string;
  rpcUrl?: string;
}): Promise<string> {
  const { address, masterWallet, usdcMint, amount, network, memo, rpcUrl } = params;
  const provider = findProviderForAddress(address);
  if (!provider) throw new Error("No connected wallet found. Please connect your wallet and try again.");
  if (!memo) throw new Error("Missing deposit attribution. Please reload and try again.");

  const { Connection, PublicKey, Transaction, TransactionInstruction, clusterApiUrl } = await import("@solana/web3.js");
  const {
    getAssociatedTokenAddress,
    createTransferCheckedInstruction,
    createAssociatedTokenAccountIdempotentInstruction,
  } = await import("@solana/spl-token");

  const endpoint =
    rpcUrl ||
    process.env.NEXT_PUBLIC_SOLANA_RPC ||
    clusterApiUrl(network === "mainnet-beta" ? "mainnet-beta" : "devnet");
  const connection = new Connection(endpoint, "confirmed");

  const from = new PublicKey(address);
  const mint = new PublicKey(usdcMint);
  const master = new PublicKey(masterWallet);
  const fromAta = await getAssociatedTokenAddress(mint, from);
  const toAta = await getAssociatedTokenAddress(mint, master);

  // USDC has 6 decimals
  const baseUnits = BigInt(Math.round(amount * 1_000_000));
  if (baseUnits <= 0n) throw new Error("Amount must be greater than zero.");

  const tx = new Transaction();
  // Create the master's USDC token account if it somehow doesn't exist yet
  // (idempotent — a no-op when it already does). Fee/rent paid by the sender.
  if (!(await connection.getAccountInfo(toAta))) {
    tx.add(createAssociatedTokenAccountIdempotentInstruction(from, toAta, master, mint));
  }
  tx.add(createTransferCheckedInstruction(fromAta, mint, toAta, from, baseUnits, 6));
  // On-chain attribution memo (SPL Memo program). The backend verifies this
  // equals the calling user's id, so no one else can claim this deposit.
  const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
  tx.add(new TransactionInstruction({
    keys: [],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memo, "utf8"),
  }));

  tx.feePayer = from;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  // Prefer signAndSendTransaction; fall back to signTransaction + manual send.
  let signature: string;
  if (typeof provider.signAndSendTransaction === "function") {
    const res = await provider.signAndSendTransaction(tx);
    signature = typeof res === "string" ? res : res?.signature;
  } else if (typeof provider.signTransaction === "function") {
    const signed = await provider.signTransaction(tx);
    signature = await connection.sendRawTransaction(signed.serialize());
  } else {
    throw new Error("This wallet does not support sending transactions.");
  }
  if (!signature) throw new Error("Wallet did not return a transaction signature.");

  // Wait for "finalized" — the backend verifies the deposit at finalized
  // commitment before crediting, so returning earlier would make the very
  // first /deposit call fail with "could not verify" until the tx finalizes.
  await connection.confirmTransaction(signature, "finalized");
  return signature;
}

export function truncate(addr: string, n = 4): string {
  if (!addr) return "";
  return addr.slice(0, n) + "..." + addr.slice(-n);
}
