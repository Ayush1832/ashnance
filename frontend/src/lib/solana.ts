// Solana wallet stubs.
// TODO: implement SPL transfer (use @solana/web3.js + @solana/spl-token)
// TODO: wire up real wallet adapter (Phantom/Backpack/Solflare/OKX/Coinbase)

export type WalletProvider = "PHANTOM" | "BACKPACK" | "SOLFLARE" | "OKX" | "COINBASE";

export const walletOptions: { id: WalletProvider; name: string; icon: string }[] = [
  { id: "PHANTOM",  name: "Phantom",         icon: "👻" },
  { id: "BACKPACK", name: "Backpack",        icon: "🎒" },
  { id: "SOLFLARE", name: "Solflare",        icon: "☀️" },
  { id: "OKX",      name: "OKX Wallet",      icon: "⭕" },
  { id: "COINBASE", name: "Coinbase Wallet", icon: "🔵" },
];

export async function connectWallet(_provider: WalletProvider): Promise<{ address: string }> {
  // TODO: implement SPL transfer connection logic
  await new Promise((r) => setTimeout(r, 600));
  return { address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" };
}

export async function signMessage(_address: string, message: string): Promise<{ signature: number[]; message: string }> {
  // TODO: implement real Phantom/wallet-adapter signature request.
  // The real implementation should call window.phantom.solana.signMessage(encoded, "utf8")
  // and return the signature bytes as a number[].
  await new Promise((r) => setTimeout(r, 500));
  const encoded = new TextEncoder().encode(message);
  return { signature: Array.from(encoded).slice(0, 64), message };
}

export async function sendUsdc(_from: string, _to: string, _amount: number): Promise<{ txHash: string }> {
  // TODO: implement SPL transfer (USDC SPL token transfer transaction)
  await new Promise((r) => setTimeout(r, 1200));
  return { txHash: "5JxhP9Y3kN2A" + Math.random().toString(36).slice(2,8) };
}

export function truncate(addr: string, n = 4) {
  if (!addr) return "";
  return addr.slice(0, n) + "..." + addr.slice(-n);
}
