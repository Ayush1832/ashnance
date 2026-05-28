"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/ashnance/AuthShell";
import { FireButton } from "@/components/ashnance/primitives";
import { api, mapProfile } from "@/lib/apiClient";
import { userStore } from "@/lib/userStore";
import { walletOptions, connectWallet, signMessage, truncate } from "@/lib/solana";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function LoginPage() {
  const nav = useRouter();
  const [tab, setTab] = useState<"email"|"wallet"|"google">("email");
  const [show, setShow] = useState(false);
  const [otpMode, setOtpMode] = useState(false);
  const [need2fa, setNeed2fa] = useState(false);
  const [twoFaCode, setTwoFaCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [walletAddr, setWalletAddr] = useState<string|null>(null);

  // Form field state
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp]           = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [savedCreds, setSavedCreds] = useState<{ email: string; password: string } | null>(null);

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
      <div className="flex gap-1 p-1 rounded-md bg-muted mb-6 text-xs">
        {(["email","wallet","google"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("flex-1 h-8 rounded capitalize transition", tab===t ? "bg-fire text-background font-semibold" : "text-muted-foreground hover:text-foreground")}>
            {t === "email" ? "Email" : t === "wallet" ? "Solana Wallet" : "Google"}
          </button>
        ))}
      </div>

      {tab === "email" && (
        otpMode ? (
          <form onSubmit={otpLogin} className="space-y-4">
            <h2 className="font-display text-xl">Sign in with code</h2>
            <input
              className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm"
              placeholder="you@example.com"
              type="email"
              value={otpEmail}
              onChange={(e) => setOtpEmail(e.target.value)}
            />
            <FireButton type="button" className="w-full" onClick={sendOtp}>Send Code</FireButton>
            <input
              className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm font-mono tracking-widest"
              placeholder="6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
            />
            <FireButton type="submit" className="w-full" disabled={loading || !otp || !otpEmail}>
              {loading ? "Signing in…" : "Sign In with Code"}
            </FireButton>
            <div className="text-center text-xs text-muted-foreground">
              <button type="button" onClick={() => setOtpMode(false)} className="hover:text-foreground">Use password instead</button>
            </div>
          </form>
        ) : (
          <form onSubmit={emailLogin} className="space-y-4">
            <h2 className="font-display text-2xl mb-2">Welcome back</h2>
            <input
              className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                className="w-full h-11 px-3 pr-10 rounded-md bg-muted border border-border text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-3 text-muted-foreground">
                {show ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
              </button>
            </div>
            <FireButton type="submit" className="w-full" disabled={loading}>{loading ? "Signing in…" : "Sign In"}</FireButton>
            <div className="flex justify-between text-xs text-muted-foreground">
              <button type="button" onClick={() => setOtpMode(true)} className="hover:text-foreground">Use OTP instead</button>
              <Link href="/register" className="hover:text-foreground">No account? Register →</Link>
            </div>
          </form>
        )
      )}

      {tab === "wallet" && (
        <div className="space-y-3">
          <h2 className="font-display text-xl mb-2">Connect a Solana wallet</h2>
          {!walletAddr ? walletOptions.map((w) => (
            <button key={w.id} onClick={async () => { const {address} = await connectWallet(w.id); setWalletAddr(address); toast.success(`Connected ${w.name}`); }}
              className="w-full flex items-center gap-3 h-11 px-4 rounded-md glass hover:glow-fire text-sm">
              <span className="text-lg">{w.icon}</span><span>{w.name}</span>
            </button>
          )) : (
            <>
              <div className="glass rounded-md p-4 text-sm">
                <div className="text-xs text-muted-foreground">Connected</div>
                <div className="font-mono mt-1">{truncate(walletAddr, 6)}</div>
              </div>
              <FireButton className="w-full" onClick={async () => {
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
              }}>Sign & Login</FireButton>
            </>
          )}
        </div>
      )}

      {tab === "google" && (
        <div className="space-y-4 text-center">
          <h2 className="font-display text-xl">Continue with Google</h2>
          <p className="text-sm text-muted-foreground">Sign in instantly with your Google account.</p>
          <FireButton
            className="w-full"
            onClick={() => {
              window.location.href = `${API_URL}/api/auth/google`;
            }}
          >
            Continue with Google
          </FireButton>
        </div>
      )}

      {need2fa && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-elevated ring-fire rounded-2xl p-8 max-w-md w-full">
            <h2 className="font-display text-2xl">Two-Factor Authentication</h2>
            <p className="text-sm text-muted-foreground mt-2">Enter the 6-digit code from your authenticator app.</p>
            <div className="flex gap-2 my-6 justify-center">
              {Array.from({length:6}).map((_,i) => (
                <input key={i} maxLength={1}
                  className="w-11 h-12 text-center font-mono text-lg rounded-md bg-muted border border-border"
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
            <div className="text-center text-xs text-muted-foreground mt-4">
              <button className="hover:text-foreground">Use a backup recovery code instead</button>
            </div>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
