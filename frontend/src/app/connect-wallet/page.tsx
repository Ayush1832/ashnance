"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { detectWallets, connectWallet, signMessage, type WalletProvider } from "@/lib/wallets";

export default function ConnectWalletPage() {
  const router = useRouter();
  const [ready,    setReady]    = useState(false);
  const [wallets,  setWallets]  = useState<WalletProvider[]>([]);
  const [status,   setStatus]   = useState<"idle" | "connecting" | "signing" | "success" | "error">("idle");
  const [error,    setError]    = useState("");
  const [address,  setAddress]  = useState("");

  // Detect wallets + check if already linked
  useEffect(() => {
    setWallets(detectWallets());

    const token = localStorage.getItem("accessToken");
    if (!token) { router.replace("/login"); return; }
    api.setToken(token);

    api.auth.profile().then((res: any) => {
      const profile = res.data ?? res;
      if (profile.solanaAddress) {
        localStorage.setItem("walletAddress", profile.solanaAddress);
        router.replace("/dashboard");
      } else {
        setReady(true);
      }
    }).catch(() => setReady(true));
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

      const message = `Welcome to Ashnance!\n\nSign this message to link your wallet.\nThis does not cost any SOL.\n\ntimestamp:${Date.now()}`;
      const sig = await signMessage(wallet.provider, message);
      const sigArray = Array.from(sig);

      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("Not authenticated");
      api.setToken(token);

      await api.auth.linkWallet(publicKey, sigArray, message);

      localStorage.setItem("walletAddress", publicKey);
      setStatus("success");
      setTimeout(() => router.replace("/dashboard"), 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setError(
        msg.includes("User rejected") || msg.includes("rejected")
          ? "Signature rejected. Please approve in your wallet."
          : msg
      );
      setStatus("error");
    }
  }

  async function handleSkip() {
    sessionStorage.setItem("walletSkipped", "1");
    router.replace("/dashboard");
  }

  if (!ready) return (
    <div style={{ minHeight: "100vh", background: "#080808", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "24px", height: "24px", border: "2px solid rgba(255,77,0,0.3)", borderTopColor: "#FF4D00", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
    </div>
  );

  const installedWallets = wallets.filter((w) => w.installed);
  const otherWallets     = wallets.filter((w) => !w.installed);
  const busy = status === "connecting" || status === "signing";

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080808",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "460px",
        background: "#0f0f0f",
        border: "1px solid rgba(255,77,0,0.25)",
        borderRadius: "8px",
        padding: "40px 32px",
        textAlign: "center",
      }}>
        {/* Logo */}
        <div style={{ marginBottom: "8px" }}>
          <img src="/logo.png" alt="Ashnance" style={{ width: "160px", height: "auto" }} />
        </div>

        {/* Icon */}
        <div style={{ fontSize: "52px", margin: "20px 0 12px" }}>
          {status === "success" ? "✅" : "🔗"}
        </div>

        {/* Title */}
        <div style={{ fontFamily: "var(--font-display, monospace)", fontSize: "18px", letterSpacing: "4px", color: "#fff", marginBottom: "8px" }}>
          {status === "success" ? "WALLET LINKED!" : "CONNECT WALLET"}
        </div>

        {status !== "success" && (
          <div style={{ fontSize: "10px", color: "#555", letterSpacing: "1px", lineHeight: "1.8", marginBottom: "28px" }}>
            LINK A SOLANA WALLET TO DEPOSIT, BURN, AND WITHDRAW.
            SIGNING IS FREE — NO SOL SPENT.
          </div>
        )}

        {status === "success" && address && (
          <div style={{ fontSize: "11px", color: "#FFB800", letterSpacing: "2px", marginBottom: "24px" }}>
            {address.slice(0, 8)}...{address.slice(-6)}
            <br />
            <span style={{ color: "#555", marginTop: "4px", display: "block" }}>REDIRECTING...</span>
          </div>
        )}

        {/* Connecting/signing state */}
        {(status === "connecting" || status === "signing") && (
          <div style={{ fontSize: "11px", color: "#FF4D00", letterSpacing: "2px", marginBottom: "16px", animation: "pulse 1s infinite" }}>
            {status === "connecting" ? "CONNECTING..." : "SIGN IN YOUR WALLET ✍"}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: "rgba(255,0,0,0.08)", border: "1px solid rgba(255,0,0,0.3)",
            borderRadius: "4px", padding: "10px 14px", marginBottom: "16px",
            fontSize: "10px", color: "#ff6b6b", letterSpacing: "1px", textAlign: "left",
          }}>
            ⚠ {error}
          </div>
        )}

        {status !== "success" && (
          <>
            {/* Installed wallets */}
            {installedWallets.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                {installedWallets.map((w) => (
                  <button
                    key={w.name}
                    onClick={() => handleConnect(w)}
                    disabled={busy}
                    style={{
                      width: "100%", padding: "14px 16px",
                      background: busy ? "rgba(255,77,0,0.3)" : "linear-gradient(135deg, #FF4D00, #ff6b00)",
                      border: "none", borderRadius: "4px", color: "#fff",
                      fontFamily: "var(--font-display, monospace)", fontSize: "12px",
                      letterSpacing: "3px", cursor: busy ? "wait" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                    }}
                  >
                    <span style={{ fontSize: "20px" }}>{w.icon}</span>
                    CONNECT {w.name.toUpperCase()}
                  </button>
                ))}
              </div>
            )}

            {/* No wallet detected */}
            {installedWallets.length === 0 && (
              <div style={{ fontSize: "10px", color: "#555", letterSpacing: "1px", marginBottom: "16px" }}>
                NO WALLET DETECTED. INSTALL ONE BELOW:
              </div>
            )}

            {/* Other wallets (not installed) */}
            {otherWallets.length > 0 && (
              <>
                {installedWallets.length > 0 && (
                  <div style={{ fontSize: "8px", color: "#333", letterSpacing: "2px", margin: "12px 0 10px" }}>
                    MORE WALLETS
                  </div>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginBottom: "20px" }}>
                  {otherWallets.map((w) => (
                    <a
                      key={w.name}
                      href={w.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: "10px", color: "#555", letterSpacing: "1px",
                        border: "1px solid rgba(255,255,255,0.08)", borderRadius: "4px",
                        padding: "8px 14px", textDecoration: "none",
                        display: "flex", alignItems: "center", gap: "6px",
                      }}
                    >
                      {w.icon} {w.name} ↗
                    </a>
                  ))}
                </div>
              </>
            )}

            <button
              onClick={handleSkip}
              style={{
                width: "100%", padding: "10px", background: "transparent",
                border: "1px solid rgba(255,255,255,0.08)", borderRadius: "4px",
                color: "#444", fontFamily: "var(--font-display, monospace)",
                fontSize: "10px", letterSpacing: "2px", cursor: "pointer",
              }}
            >
              SKIP FOR NOW (LIMITED ACCESS)
            </button>

            <div style={{ fontSize: "9px", color: "#2a2a2a", letterSpacing: "1px", marginTop: "16px" }}>
              SIGNING IS FREE — NO SOL SPENT
            </div>
          </>
        )}
      </div>
    </div>
  );
}
