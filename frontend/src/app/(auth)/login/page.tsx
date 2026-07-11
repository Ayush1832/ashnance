"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { Eye, EyeOff, Flame, Mail, Wallet as WalletIcon } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/ashnance/AuthShell";
import { FireButton } from "@/components/ashnance/primitives";
import { api, mapProfile } from "@/lib/apiClient";
import { userStore } from "@/lib/userStore";
import { walletOptions, connectWallet, signMessage, truncate } from "@/lib/solana";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const OAUTH_ERRORS: Record<string, string> = {
  google_not_configured:  "Google login is not configured on this server.",
  google_auth_failed:     "Google sign-in failed. Please try again.",
  google_cancelled:       "Google sign-in was cancelled.",
  google_unverified:      "Your Google email isn't verified. Please verify it with Google first.",
  google_account_conflict:"An account with this email already exists. Please sign in with your password.",
  oauth_state_mismatch:   "Security check failed. Please try signing in again.",
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
    if (error) toast.error(OAUTH_ERRORS[error] ?? "Authentication failed. Please try again.");
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
    <AuthShell variant="login">
      {/* Heading */}
      <div className="mb-6">
        <div className="text-[10px] uppercase tracking-[0.25em] text-fire mb-2 font-semibold">Sign in</div>
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Welcome back</h2>
        <p className="text-sm text-muted-foreground mt-1.5">Pick up where you left off — your weight is waiting.</p>
      </div>

      {/* Tab switcher — fire underline style */}
      <div className="relative flex border-b border-border mb-6">
        {(["email", "wallet"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "relative flex-1 h-11 flex items-center justify-center gap-2 text-sm font-medium transition",
              tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "email" ? <Mail className="h-4 w-4" /> : <WalletIcon className="h-4 w-4" />}
            {t === "email" ? "Email" : "Solana Wallet"}
            {tab === t && (
              <span className="absolute -bottom-px left-1/2 -translate-x-1/2 w-12 h-0.5 bg-fire rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* ── EMAIL TAB ── */}
      {tab === "email" && (
        otpMode ? (
          <form onSubmit={otpLogin} className="space-y-4">
            <FireInput
              type="email"
              placeholder="you@example.com"
              value={otpEmail}
              onChange={(v) => setOtpEmail(v)}
              autoComplete="email"
            />
            <FireButton type="button" className="w-full" onClick={sendOtp}>
              <Mail className="h-4 w-4" /> Send Code
            </FireButton>
            <FireInput
              className="font-mono tracking-[0.4em] text-center"
              placeholder="● ● ● ● ● ●"
              value={otp}
              onChange={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
              inputMode="numeric"
            />
            <FireButton type="submit" className="w-full" disabled={loading || !otp || !otpEmail}>
              {loading ? "Signing in…" : "Sign In with Code"}
            </FireButton>
            <button
              type="button"
              onClick={() => setOtpMode(false)}
              className="block w-full text-center text-xs text-muted-foreground hover:text-fire transition"
            >
              ← Use password instead
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <form onSubmit={emailLogin} className="space-y-3.5">
              <FireInput
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(v) => setEmail(v)}
                autoComplete="email"
              />
              <div className="relative">
                <FireInput
                  type={show ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(v) => setPassword(v)}
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-fire transition"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FireButton type="submit" className="w-full" size="lg" disabled={loading}>
                <Flame className="h-4 w-4" />
                {loading ? "Signing in…" : "Sign In"}
              </FireButton>
            </form>

            <div className="flex justify-between text-xs">
              <button type="button" onClick={() => setOtpMode(true)} className="text-muted-foreground hover:text-fire transition">
                Use OTP instead
              </button>
              <Link href="/register" className="text-muted-foreground hover:text-fire transition">
                No account? Register →
              </Link>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 pt-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">or continue with</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Google sign-in */}
            <button
              type="button"
              onClick={() => { window.location.href = `${API_URL}/api/auth/google`; }}
              className="w-full h-11 flex items-center justify-center gap-3 rounded-md border border-border glass text-sm font-medium hover:border-primary/40 hover:bg-primary/5 transition"
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
          {!walletAddr ? (
            <>
              <p className="text-xs text-muted-foreground -mt-2 mb-4">
                Sign a free message with your Solana wallet. No SOL spent.
              </p>
              {walletOptions.map((w) => (
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
                  className="w-full flex items-center gap-3 h-12 px-4 rounded-md glass text-sm transition hover:border-primary/40 hover:bg-primary/5 group"
                >
                  <span className="text-xl">{w.icon}</span>
                  <span className="font-medium">{w.name}</span>
                  <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground group-hover:text-fire transition">
                    Connect →
                  </span>
                </button>
              ))}
            </>
          ) : (
            <>
              <div className="glass rounded-lg p-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">Connected wallet</div>
                <div className="font-mono text-sm">{truncate(walletAddr, 6)}</div>
              </div>
              <FireButton
                className="w-full"
                size="lg"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    const message = await api.walletChallenge(walletAddr);
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
                <Flame className="h-4 w-4" />
                {loading ? "Signing…" : "Sign & Login"}
              </FireButton>
              <button
                className="block w-full text-center text-xs text-muted-foreground hover:text-fire transition py-1"
                onClick={() => setWalletAddr(null)}
              >
                ← Use a different wallet
              </button>
            </>
          )}
        </div>
      )}

      {/* ── 2FA MODAL ── */}
      {need2fa && (
        <div className="fixed inset-0 z-50 bg-background/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-elevated ring-fire rounded-2xl p-8 max-w-md w-full">
            <h2 className="font-display text-2xl font-bold">Two-Factor Authentication</h2>
            <p className="text-sm text-muted-foreground mt-2 mb-6">
              Enter the 6-digit code from your authenticator app.
            </p>
            <div className="flex gap-2 justify-center mb-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <input
                  key={i}
                  maxLength={1}
                  inputMode="numeric"
                  className="w-11 h-12 text-center font-mono text-lg rounded-md bg-muted/60 border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition"
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
            <FireButton className="w-full" size="lg" disabled={loading} onClick={verify2fa}>
              <Flame className="h-4 w-4" />
              {loading ? "Verifying…" : "Verify"}
            </FireButton>
          </div>
        </div>
      )}
    </AuthShell>
  );
}

/** Shared input with fire focus state, used across login + register */
function FireInput({
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  className,
  maxLength,
  inputMode,
}: {
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  className?: string;
  maxLength?: number;
  inputMode?: "numeric" | "text" | "email";
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      maxLength={maxLength}
      inputMode={inputMode}
      className={cn(
        "w-full h-12 px-4 rounded-md bg-muted/60 border border-border text-sm",
        "placeholder:text-muted-foreground/70",
        "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 focus:bg-muted",
        "transition",
        className,
      )}
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <AuthShell variant="login">
        <div className="text-center py-8 text-muted-foreground text-sm">Loading…</div>
      </AuthShell>
    }>
      <LoginPageInner />
    </Suspense>
  );
}
