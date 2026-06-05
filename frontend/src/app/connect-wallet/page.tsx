"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ExternalLink, Wallet as WalletIcon } from "lucide-react";
import { api, mapProfile } from "@/lib/apiClient";
import { userStore } from "@/lib/userStore";
import { detectWallets, connectWallet, signMessage, type WalletProvider } from "@/lib/wallets";
import { Logo } from "@/components/ashnance/Logo";
import { FireButton } from "@/components/ashnance/primitives";

export default function ConnectWalletPage() {
  const router = useRouter();
  const [ready,   setReady]   = useState(false);
  const [wallets, setWallets] = useState<WalletProvider[]>([]);
  const [status,  setStatus]  = useState<"idle" | "connecting" | "signing" | "success" | "error">("idle");
  const [error,   setError]   = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    setWallets(detectWallets());

    const token = localStorage.getItem("accessToken");
    if (!token) { router.replace("/login"); return; }

    api.profile()
      .then((res) => {
        if (res.success && res.data) {
          const profile = res.data as Record<string, unknown>;
          if (profile.solanaAddress) {
            router.replace("/dashboard");
            return;
          }
        }
        setReady(true);
      })
      .catch(() => setReady(true));
  }, [router]);

  async function handleConnect(wallet: WalletProvider) {
    if (!wallet.provider) {
      window.open(wallet.downloadUrl, "_blank");
      return;
    }

    setError("");
    setStatus("connecting");

    try {
      const publicKey = await connectWallet(wallet.provider);
      setAddress(publicKey);
      setStatus("signing");

      const message = await api.walletChallenge(publicKey);
      const sig = await signMessage(wallet.provider, message);
      const sigArray = Array.from(sig);

      await api.linkWallet({ publicKey, signature: sigArray, message });

      // Refresh profile so header shows the new wallet address
      try {
        const profileRes = await api.profile();
        if (profileRes.success && profileRes.data) {
          userStore.update(mapProfile(profileRes.data as Record<string, unknown>));
        }
      } catch { /* non-fatal */ }

      setStatus("success");
      setTimeout(() => router.replace("/dashboard"), 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setError(
        msg.toLowerCase().includes("reject") || msg.toLowerCase().includes("cancel")
          ? "Signature rejected. Please approve in your wallet."
          : msg,
      );
      setStatus("error");
    }
  }

  function handleSkip() {
    sessionStorage.setItem("walletSkipped", "1");
    router.replace("/dashboard");
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-6 animate-spin rounded-full border-2 border-white/15 border-t-primary" />
      </div>
    );
  }

  const installedWallets = wallets.filter((w) => w.installed);
  const otherWallets     = wallets.filter((w) => !w.installed);
  const busy = status === "connecting" || status === "signing";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-6">
      <div className="pointer-events-none absolute inset-0 bg-fire-radial" />
      <div className="pointer-events-none absolute inset-0 ember-bg" />

      <div className="relative w-full max-w-md">
        <div className="glass-elevated ring-fire rounded-2xl p-8 text-center">
          <div className="mb-7 flex justify-center">
            <Logo size="lg" />
          </div>

          <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-primary/10 ring-1 ring-primary/25">
            {status === "success"
              ? <Check className="size-6 text-success" />
              : <WalletIcon className="size-6 text-primary" />}
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight">
            {status === "success" ? "Wallet linked!" : "Connect your wallet"}
          </h1>

          {status === "success" ? (
            address && (
              <p className="mt-2 font-mono text-sm text-gold">
                {address.slice(0, 8)}…{address.slice(-6)}
                <span className="mt-1 block text-xs text-muted-foreground">Redirecting…</span>
              </p>
            )
          ) : (
            <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
              Link a Solana wallet to deposit, burn, and withdraw. Signing is free — no SOL spent.
            </p>
          )}

          {busy && (
            <div className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-primary">
              {status === "connecting" ? "Connecting…" : "Sign in your wallet ✍"}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-2.5 text-left text-xs text-danger">
              ⚠ {error}
            </div>
          )}

          {status !== "success" && (
            <div className="mt-6 space-y-4">
              {installedWallets.length > 0 ? (
                <div className="space-y-2.5">
                  {installedWallets.map((w) => (
                    <FireButton key={w.name} size="lg" className="w-full" onClick={() => handleConnect(w)} disabled={busy}>
                      <span className="text-lg">{w.icon}</span>
                      Connect {w.name}
                      <ArrowRight className="size-4" />
                    </FireButton>
                  ))}
                </div>
              ) : (
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  No wallet detected. Install one below:
                </div>
              )}

              {otherWallets.length > 0 && (
                <div>
                  {installedWallets.length > 0 && (
                    <div className="mb-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">More wallets</div>
                  )}
                  <div className="flex flex-wrap justify-center gap-2">
                    {otherWallets.map((w) => (
                      <a
                        key={w.name}
                        href={w.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full glass px-3.5 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <span>{w.icon}</span> {w.name} <ExternalLink className="size-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleSkip}
                className="w-full rounded-lg border border-border py-2.5 text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground"
              >
                Skip for now (limited access)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
