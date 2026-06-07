"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Flame, Mail, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { FireButton } from "@/components/ashnance/primitives";
import { api, mapProfile } from "@/lib/apiClient";
import { userStore } from "@/lib/userStore";
import { cn } from "@/lib/utils";

// Dedicated admin login — separate from the player login. Accepts the same
// owner/admin accounts but verifies the role and rejects normal users.
export default function AdminLoginPage() {
  const nav = useRouter();
  const [otpMode, setOtpMode] = useState(false);
  const [need2fa, setNeed2fa] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [twoFaCode, setTwoFaCode] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  // After any successful sign-in, confirm the account is an admin/owner.
  async function gateAdmin(): Promise<boolean> {
    try {
      const res = await api.profile();
      const mapped = mapProfile(res.data as Record<string, unknown>);
      if (mapped.role === "ADMIN" || mapped.role === "OWNER") {
        userStore.update(mapped);
        toast.success("Welcome, admin");
        nav.replace("/admin");
        return true;
      }
    } catch { /* fall through to rejection */ }
    await api.logout();
    toast.error("This area is for administrators only.");
    return false;
  }

  async function passwordLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.login({ email, password });
      if (res.data.requires2fa) { setNeed2fa(true); setLoading(false); return; }
      if (!(await gateAdmin())) setLoading(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
      setLoading(false);
    }
  }

  async function verify2fa() {
    setLoading(true);
    try {
      await api.loginWith2fa({ email, password, twoFaCode });
      if (!(await gateAdmin())) { setNeed2fa(false); setLoading(false); }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid code");
      setLoading(false);
    }
  }

  async function otpLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.login({ email, otp });
      if (!(await gateAdmin())) setLoading(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "OTP sign in failed");
      setLoading(false);
    }
  }

  async function sendOtp() {
    if (!email) { toast.error("Enter your admin email first"); return; }
    try { await api.sendOtp(email); toast.success("Code sent to your email"); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Failed to send code"); }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-16">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />
      <div className="glass-card w-full max-w-md rounded-2xl p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-fire text-background">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary/80">Ashnance</div>
            <h1 className="font-display text-xl font-bold leading-none">Admin Access</h1>
          </div>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">Restricted area — authorized administrators only.</p>

        {otpMode ? (
          <form onSubmit={otpLogin} className="space-y-4">
            <Input type="email" placeholder="Admin email" value={email} onChange={setEmail} autoComplete="email" />
            <FireButton type="button" className="w-full" onClick={sendOtp}><Mail className="h-4 w-4" /> Send Code</FireButton>
            <Input className="text-center font-mono tracking-[0.4em]" placeholder="● ● ● ● ● ●" value={otp} onChange={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))} maxLength={6} inputMode="numeric" />
            <FireButton type="submit" className="w-full" disabled={loading || !otp || !email}>{loading ? "Signing in…" : "Sign In with Code"}</FireButton>
            <button type="button" onClick={() => setOtpMode(false)} className="block w-full text-center text-xs text-muted-foreground transition hover:text-fire">← Use password instead</button>
          </form>
        ) : (
          <form onSubmit={passwordLogin} className="space-y-3.5">
            <Input type="email" placeholder="Admin email" value={email} onChange={setEmail} autoComplete="email" />
            <div className="relative">
              <Input type={show ? "text" : "password"} placeholder="Password" value={password} onChange={setPassword} autoComplete="current-password" className="pr-10" />
              <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-fire">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <FireButton type="submit" className="w-full" size="lg" disabled={loading}><Flame className="h-4 w-4" />{loading ? "Signing in…" : "Sign In"}</FireButton>
            <button type="button" onClick={() => setOtpMode(true)} className="block w-full text-center text-xs text-muted-foreground transition hover:text-fire">Use email code (OTP) instead</button>
          </form>
        )}
      </div>

      {need2fa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4 backdrop-blur-md">
          <div className="glass-card w-full max-w-md rounded-2xl p-8">
            <h2 className="font-display text-2xl font-bold">Two-Factor Authentication</h2>
            <p className="mb-6 mt-2 text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
            <Input className="mb-6 text-center font-mono text-lg tracking-[0.4em]" placeholder="● ● ● ● ● ●" value={twoFaCode} onChange={(v) => setTwoFaCode(v.replace(/\D/g, "").slice(0, 6))} maxLength={6} inputMode="numeric" />
            <FireButton className="w-full" size="lg" disabled={loading || twoFaCode.length !== 6} onClick={verify2fa}><Flame className="h-4 w-4" />{loading ? "Verifying…" : "Verify"}</FireButton>
          </div>
        </div>
      )}
    </main>
  );
}

function Input({ type = "text", value, onChange, placeholder, autoComplete, className, maxLength, inputMode }: {
  type?: string; value: string; onChange: (v: string) => void; placeholder?: string;
  autoComplete?: string; className?: string; maxLength?: number; inputMode?: "numeric" | "text" | "email";
}) {
  return (
    <input
      type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      autoComplete={autoComplete} maxLength={maxLength} inputMode={inputMode}
      className={cn(
        "h-12 w-full rounded-md border border-border bg-muted/60 px-4 text-sm placeholder:text-muted-foreground/70",
        "transition focus:border-primary focus:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30",
        className,
      )}
    />
  );
}
