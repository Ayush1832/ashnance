"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { FireButton } from "@/components/ashnance/primitives";
import { api, mapProfile } from "@/lib/apiClient";
import { userStore } from "@/lib/userStore";
import { cn } from "@/lib/utils";

// Dedicated admin login — OTP (email code) only. Uses the same owner/admin
// accounts; after sign-in the role is verified and normal users are rejected.
export default function AdminLoginPage() {
  const nav = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function sendOtp() {
    if (!email) { toast.error("Enter your admin email first"); return; }
    setLoading(true);
    try {
      // Backend only sends a code if this is an admin/owner email (silent otherwise).
      await api.adminRequestOtp(email);
      setSent(true);
      toast.success("If that's an admin account, a code has been sent.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send code");
    }
    setLoading(false);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    // Before a code is requested, submit/Enter should SEND the code — not attempt
    // a login with an empty code.
    if (!sent) { await sendOtp(); return; }
    if (otp.length !== 6) { toast.error("Enter the 6-digit code"); return; }
    setLoading(true);
    try {
      // Backend verifies the code AND that the account is an admin/owner; a
      // non-admin is rejected server-side and never receives a token.
      const res = await api.adminOtpLogin({ email, otp });
      if (res.data.user) userStore.update(mapProfile(res.data.user as Record<string, unknown>));
      toast.success("Welcome, admin");
      nav.replace("/admin");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
      setLoading(false);
    }
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
        <p className="mb-6 text-sm text-muted-foreground">
          Restricted area — authorized administrators only. We&apos;ll email you a one-time sign-in code.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <Input type="email" placeholder="Admin email" value={email} onChange={setEmail} autoComplete="email" />
          <FireButton type="button" className="w-full" onClick={sendOtp} disabled={loading || !email}>
            <Mail className="h-4 w-4" /> {sent ? "Resend Code" : "Send Code"}
          </FireButton>
          {sent && (
            <>
              <Input
                className="text-center font-mono tracking-[0.4em]"
                placeholder="● ● ● ● ● ●"
                value={otp}
                onChange={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                inputMode="numeric"
              />
              <FireButton type="submit" className="w-full" size="lg" disabled={loading || otp.length !== 6}>
                {loading ? "Signing in…" : "Sign In"}
              </FireButton>
            </>
          )}
        </form>
      </div>
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
