"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/ashnance/AuthShell";
import { FireButton } from "@/components/ashnance/primitives";
import { api } from "@/lib/apiClient";
import { walletOptions, connectWallet, signMessage, truncate } from "@/lib/solana";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const nav = useRouter();
  const [tab, setTab] = useState<"email"|"wallet"|"google">("email");
  const [show, setShow] = useState(false);
  const [otpMode, setOtpMode] = useState(false);
  const [need2fa, setNeed2fa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [walletAddr, setWalletAddr] = useState<string|null>(null);

  async function emailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await api.login({ email: "you@ashnance.com", password: "demo" });
    setLoading(false);
    if (res.data.requires2fa) { setNeed2fa(true); return; }
    toast.success("Welcome back!");
    nav.push("/dashboard");
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
          <div className="space-y-4">
            <h2 className="font-display text-xl">Sign in with code</h2>
            <input className="w-full h-11 px-3 rounded-md bg-muted border border-border" placeholder="you@example.com" />
            <FireButton className="w-full" onClick={() => { api.sendOtp("test"); toast.success("Code sent to your email"); }}>Send Code</FireButton>
            <div className="text-center text-xs text-muted-foreground"><button onClick={() => setOtpMode(false)} className="hover:text-foreground">Use password instead</button></div>
          </div>
        ) : (
          <form onSubmit={emailLogin} className="space-y-4">
            <h2 className="font-display text-2xl mb-2">Welcome back</h2>
            <input className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm" placeholder="Email" />
            <div className="relative">
              <input type={show?"text":"password"} className="w-full h-11 px-3 pr-10 rounded-md bg-muted border border-border text-sm" placeholder="Password" />
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
                const sig = await signMessage(walletAddr, `Sign in to Ashnance\ntimestamp:${Date.now()}`);
                await api.walletLogin({ address: walletAddr, signature: sig.signature, timestamp: sig.timestamp });
                toast.success("Signed in"); nav.push("/dashboard");
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
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              await api.login({ email: "google-user@gmail.com" });
              toast.success("Signed in with Google");
              nav.push("/dashboard");
            }}
          >
            {loading ? "Signing in…" : "Continue with Google"}
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
                <input key={i} maxLength={1} className="w-11 h-12 text-center font-mono text-lg rounded-md bg-muted border border-border" />
              ))}
            </div>
            <FireButton className="w-full" onClick={() => { toast.success("Logged in"); nav.push("/dashboard"); }}>Verify</FireButton>
            <div className="text-center text-xs text-muted-foreground mt-4">
              <button className="hover:text-foreground">Use a backup recovery code instead</button>
            </div>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
