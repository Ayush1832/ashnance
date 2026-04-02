"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function ConnectWalletPage() {
  const router = useRouter();
  const [ready,   setReady]   = useState(false);
  const [status,  setStatus]  = useState<"idle" | "connecting" | "signing" | "success" | "error">("idle");
  const [error,   setError]   = useState("");
  const [address, setAddress] = useState("");

  // If already has wallet linked, skip to dashboard
  useEffect(() => {
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
    }).catch(() => {
      setReady(true);
    });
  }, [router]);

  if (!ready) return null;

  async function handleConnect() {
    setError("");
    setStatus("connecting");

    try {
      // Get Phantom provider — support both window.phantom.solana and window.solana
      const provider = (window as any).phantom?.solana ?? (window as any).solana;

      if (!provider?.isPhantom) {
        window.open("https://phantom.app/", "_blank");
        setStatus("idle");
        setError("Phantom not detected. Install it and refresh this page.");
        return;
      }

      // Connect
      await provider.connect();
      const publicKey: string = provider.publicKey.toBase58();
      setAddress(publicKey);
      setStatus("signing");

      // Ask user to sign a message proving ownership
      const message = `Welcome to Ashnance!\n\nSign this message to link your wallet.\nThis does not cost any SOL.\n\ntimestamp:${Date.now()}`;
      const encoded = new TextEncoder().encode(message);
      const { signature } = await provider.signMessage(encoded, "utf8");
      const sigArray = Array.from(signature as Uint8Array);

      // Link wallet to account
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("Not authenticated");
      api.setToken(token);

      await api.auth.linkWallet(publicKey, sigArray, message);

      // Save locally
      localStorage.setItem("walletAddress", publicKey);
      setStatus("success");

      setTimeout(() => router.replace("/dashboard"), 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      // User rejected the signature request
      if (msg.includes("User rejected") || msg.includes("rejected")) {
        setError("Signature rejected. Please approve the signing request in Phantom.");
      } else {
        setError(msg);
      }
      setStatus("error");
    }
  }

  async function handleSkip() {
    // Allow skip — wallet can be linked later from settings
    // But mark as skipped so we don't redirect again this session
    sessionStorage.setItem("walletSkipped", "1");
    router.replace("/dashboard");
  }

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
        maxWidth: "440px",
        background: "#0f0f0f",
        border: "1px solid rgba(255,77,0,0.25)",
        borderRadius: "8px",
        padding: "40px 32px",
        textAlign: "center",
      }}>
        {/* Logo */}
        <div style={{
          fontFamily: "var(--font-display, monospace)",
          fontSize: "22px",
          letterSpacing: "6px",
          color: "#FF4D00",
          marginBottom: "8px",
        }}>
          ASHNANCE
        </div>

        {/* Icon */}
        <div style={{ fontSize: "56px", margin: "24px 0 16px" }}>
          {status === "success" ? "✅" : "👻"}
        </div>

        {/* Title */}
        <div style={{
          fontFamily: "var(--font-display, monospace)",
          fontSize: "20px",
          letterSpacing: "4px",
          color: "#fff",
          marginBottom: "12px",
        }}>
          {status === "success" ? "WALLET LINKED!" : "CONNECT WALLET"}
        </div>

        {/* Description */}
        {status !== "success" && (
          <div style={{
            fontSize: "11px",
            color: "#666",
            letterSpacing: "1px",
            lineHeight: "1.8",
            marginBottom: "32px",
          }}>
            ASHNANCE REQUIRES A SOLANA WALLET TO BURN, DEPOSIT, AND WITHDRAW USDC.
            YOUR WALLET IS LINKED TO YOUR ACCOUNT AND REMEMBERED FOR FUTURE LOGINS.
          </div>
        )}

        {status === "success" && address && (
          <div style={{ fontSize: "11px", color: "#FFB800", letterSpacing: "2px", marginBottom: "24px" }}>
            {address.slice(0, 8)}...{address.slice(-6)}
            <br />
            <span style={{ color: "#666", marginTop: "4px", display: "block" }}>REDIRECTING TO DASHBOARD...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: "rgba(255,0,0,0.08)",
            border: "1px solid rgba(255,0,0,0.3)",
            borderRadius: "4px",
            padding: "10px 14px",
            marginBottom: "20px",
            fontSize: "10px",
            color: "#ff6b6b",
            letterSpacing: "1px",
            textAlign: "left",
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Buttons */}
        {status !== "success" && (
          <>
            <button
              onClick={handleConnect}
              disabled={status === "connecting" || status === "signing"}
              style={{
                width: "100%",
                padding: "14px",
                background: status === "connecting" || status === "signing"
                  ? "rgba(255,77,0,0.4)"
                  : "linear-gradient(135deg, #FF4D00, #ff6b00)",
                border: "none",
                borderRadius: "4px",
                color: "#fff",
                fontFamily: "var(--font-display, monospace)",
                fontSize: "13px",
                letterSpacing: "3px",
                cursor: status === "connecting" || status === "signing" ? "wait" : "pointer",
                marginBottom: "12px",
              }}
            >
              {status === "connecting" && "CONNECTING..."}
              {status === "signing"    && "SIGN IN PHANTOM ✍"}
              {(status === "idle" || status === "error") && "👻 CONNECT PHANTOM"}
            </button>

            <button
              onClick={handleSkip}
              style={{
                width: "100%",
                padding: "10px",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "4px",
                color: "#555",
                fontFamily: "var(--font-display, monospace)",
                fontSize: "10px",
                letterSpacing: "2px",
                cursor: "pointer",
              }}
            >
              SKIP FOR NOW (LIMITED ACCESS)
            </button>

            <div style={{ fontSize: "9px", color: "#333", letterSpacing: "1px", marginTop: "16px" }}>
              SIGNING IS FREE — NO SOL SPENT
            </div>
          </>
        )}
      </div>
    </div>
  );
}
