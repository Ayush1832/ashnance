"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/ashnance/AuthShell";
import { FireButton } from "@/components/ashnance/primitives";
import { api, mapProfile } from "@/lib/apiClient";
import { userStore } from "@/lib/userStore";
import { walletOptions, connectWallet, signMessage, truncate } from "@/lib/solana";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const OAUTH_ERRORS: Record<string, string> = {
  google_not_configured: "Google login is not configured on this server.",
  google_auth_failed:    "Google sign-in failed. Please try again.",
  google_cancelled:      "Google sign-in was cancelled.",
  oauth_state_mismatch:  "Security check failed. Please try signing in again.",
};

function GoogleIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function LoginPageInner() {
  const nav    = useRouter();
  const params = useSearchParams();

  const [tab,        setTab]        = useState<"email" | "wallet">("email");
  const [show,       setShow]       = useState(false);
  const [otpMode,    setOtpMode]    = useState(false);
  const [need2fa,    setNeed2fa]    = useState(false);
  const [twoFaCode,  setTwoFaCode]  = useState("");
  const [loading,    setLoading]    = useState(false);
  const [walletAddr, setWalletAddr] = useState<string | null>(null);

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [otp,      setOtp]      = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [savedCreds, setSavedCreds] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => {
    const error = params.get("error");
    if (error) {
      toast.error(OAUTH_ERRORS[error] ?? "Authentication failed. Please try again.");
    }
  }, [params]);

  async function emailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.login({ email, password });
      if (res.data.requires2fa) {
        setSavedCreds({ email, password });
        setNeed2fa(true);
        setLoading(false);
        return;
      }
      if (res.data.user) userStore.update(mapProfile(res.data.user as Record<string, unknown>));
      toast.success("Welcome back!");
      nav.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    }
    setLoading(false);
  }

  async function otpLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.login({ email: otpEmail, otp });
      if (res.data.user) userStore.update(mapProfile(res.data.user as Record<string, unknown>));
      toast.success("Welcome back!");
      nav.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "OTP sign in failed");
    }
    setLoading(false);
  }

  async function sendOtp() {
    if (!otpEmail) { toast.error("Enter your email first"); return; }
    try {
      await api.sendOtp(otpEmail);
      toast.success("Code sent to your email");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send code");
    }
  }

  async function verify2fa() {
    if (!savedCreds) return;
    setLoading(true);
    try {
      const res = await api.loginWith2fa({ ...savedCreds, twoFaCode });
      if (res.data.user) userStore.update(mapProfile(res.data.user as Record<string, unknown>));
      toast.success("Welcome back!");
      nav.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid code");
    }
    setLoading(false);
  }

  return (
    <AuthShell>
      {/* Tab switcher — Email | Wallet only */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted mb-6 text-xs">
        {(["email", "wallet"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 h-8 rounded font-medium transition capitalize",
              tab === t ? "bg-fire text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "email" ? "Email" : "Solana Wallet"}
          </button>
        ))}
      </div>

      {/* ── EMAIL TAB ── */}
      {tab === "email" && (
        otpMode ? (
          <form onSubmit={otpLogin} className="space-y-4">
            <h2 className="font-display text-xl">Sign in with code</h2>
            <input
              className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm focus:outline-none focus:ring-1 focus:ring-fire"
              placeholder="you@example.com"
              type="email"
              value={otpEmail}
              onChange={(e) => setOtpEmail(e.target.value)}
            />
            <FireButton type="button" className="w-full" onClick={sendOtp}>Send Code</FireButton>
            <input
              className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-fire"
              placeholder="6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
            />
            <FireButton type="submit" className="w-full" disabled={loading || !otp || !otpEmail}>
              {loading ? "Signing in…" : "Sign In with Code"}
            </FireButton>
            <div className="text-center text-xs text-muted-foreground">
              <button type="button" onClick={() => setOtpMode(false)} className="hover:text-foreground">
                Use password instead
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <h2 className="font-display text-2xl font-bold">Welcome back</h2>

            <form onSubmit={emailLogin} className="space-y-3">
              <input
                className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm focus:outline-none focus:ring-1 focus:ring-fire"
                placeholder="Email"
                type="email"
                value={email}
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  className="w-full h-11 px-3 pr-10 rounded-md bg-muted border border-border text-sm focus:outline-none focus:ring-1 focus:ring-fire"
                  placeholder="Password"
                  value={password}
                  autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FireButton type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign In"}
              </FireButton>
            </form>

            <div className="flex justify-between text-xs text-muted-foreground">
              <button type="button" onClick={() => setOtpMode(true)} className="hover:text-foreground">
                Use OTP instead
              </button>
              <Link href="/register" className="hover:text-foreground">
                No account? Register →
              </Link>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Google sign-in — inside Email tab */}
            <button
              type="button"
              onClick={() => { window.location.href = `${API_URL}/api/auth/google`; }}
              className="w-full h-11 flex items-center justify-center gap-3 rounded-md border border-border bg-muted/50 text-sm font-medium hover:bg-muted transition"
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </div>
        )
      )}

      {/* ── WALLET TAB ── */}
      {tab === "wallet" && (
        <div className="space-y-3">
          <h2 className="font-display text-xl font-bold mb-2">Connect a Solana wallet</h2>
          {!walletAddr ? (
            walletOptions.map((w) => (
              <button
                key={w.id}
                onClick={async () => {
                  try {
                    const { address } = await connectWallet(w.id);
                    setWalletAddr(address);
                    toast.success(`Connected ${w.name}`);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed to connect wallet");
                  }
                }}
                className="w-full flex items-center gap-3 h-11 px-4 rounded-md glass hover:glow-fire text-sm transition"
              >
                <span className="text-lg">{w.icon}</span>
                <span>{w.name}</span>
              </button>
            ))
          ) : (
            <>
              <div className="glass rounded-md p-4 text-sm">
                <div className="text-xs text-muted-foreground mb-1">Connected</div>
                <div className="font-mono">{truncate(walletAddr, 6)}</div>
              </div>
              <FireButton
                className="w-full"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    const message = `Sign in to Ashnance\ntimestamp:${Date.now()}`;
                    const sig = await signMessage(walletAddr, message);
                    const res = await api.walletLogin({ publicKey: walletAddr, signature: sig.signature, message: sig.message });
                    if (res.data.user) userStore.update(mapProfile(res.data.user as Record<string, unknown>));
                    toast.success("Signed in");
                    nav.push("/dashboard");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Wallet sign-in failed");
                  }
                  setLoading(false);
                }}
              >
                {loading ? "Signing…" : "Sign & Login"}
              </FireButton>
              <button
                className="w-full text-xs text-muted-foreground hover:text-foreground text-center py-1"
                onClick={() => setWalletAddr(null)}
              >
                Use a different wallet
              </button>
            </>
          )}
        </div>
      )}

      {/* ── 2FA MODAL ── */}
      {need2fa && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-elevated ring-fire rounded-2xl p-8 max-w-md w-full">
            <h2 className="font-display text-2xl">Two-Factor Authentication</h2>
            <p className="text-sm text-muted-foreground mt-2 mb-6">
              Enter the 6-digit code from your authenticator app.
            </p>
            <div className="flex gap-2 justify-center mb-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <input
                  key={i}
                  maxLength={1}
                  className="w-11 h-12 text-center font-mono text-lg rounded-md bg-muted border border-border focus:outline-none focus:ring-1 focus:ring-fire"
                  onChange={(e) => {
                    const digits = twoFaCode.split("");
                    digits[i] = e.target.value.slice(-1);
                    setTwoFaCode(digits.join(""));
                    if (e.target.value && e.target.nextElementSibling instanceof HTMLInputElement) {
                      e.target.nextElementSibling.focus();
                    }
                  }}
                />
              ))}
            </div>
            <FireButton className="w-full" disabled={loading} onClick={verify2fa}>
              {loading ? "Verifying…" : "Verify"}
            </FireButton>
          </div>
        </div>
      )}
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <AuthShell>
        <div className="text-center py-8 text-muted-foreground text-sm">Loading…</div>
      </AuthShell>
    }>
      <LoginPageInner />
    </Suspense>
  );
}
