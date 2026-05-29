"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Flame, Mail } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/ashnance/AuthShell";
import { FireButton } from "@/components/ashnance/primitives";
import { api, mapProfile } from "@/lib/apiClient";
import { userStore } from "@/lib/userStore";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"];
const STRENGTH_COLORS = [
  "",
  "bg-red-500",
  "bg-orange-400",
  "bg-yellow-400",
  "bg-green-400",
  "bg-green-500",
];

function passwordStrength(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

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

export default function RegisterPage() {
  const nav = useRouter();
  const [method, setMethod] = useState<"email" | "google">("email");
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [pw, setPw]             = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [referral, setReferral] = useState("");
  const [loading, setLoading]   = useState(false);

  const strength = passwordStrength(pw);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !username || pw.length < 8) {
      toast.error("Fill in all fields — password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await api.register({ email, username, password: pw, referralCode: referral || undefined });
      if (res.data?.user) userStore.update(mapProfile(res.data.user as Record<string, unknown>));
      toast.success("Account created — welcome to Ashnance 🔥");
      nav.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    }
    setLoading(false);
  }

  return (
    <AuthShell variant="register">
      {/* Heading */}
      <div className="mb-6">
        <div className="text-[10px] uppercase tracking-[0.25em] text-fire mb-2 font-semibold">Get started</div>
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Create your account</h2>
        <p className="text-sm text-muted-foreground mt-1.5">Light the first spark. The pool is waiting.</p>
      </div>

      {/* Method tabs — fire underline style */}
      <div className="relative flex border-b border-border mb-6">
        {(["email", "google"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMethod(m)}
            className={cn(
              "relative flex-1 h-11 flex items-center justify-center gap-2 text-sm font-medium transition",
              method === m ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m === "email" ? <Mail className="h-4 w-4" /> : <GoogleIcon />}
            {m === "email" ? "Email" : "Google"}
            {method === m && (
              <span className="absolute -bottom-px left-1/2 -translate-x-1/2 w-12 h-0.5 bg-fire rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* ── GOOGLE TAB ── */}
      {method === "google" && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground -mt-2 mb-2">
            Sign up instantly with your Google account. We never see your password.
          </p>

          <input
            value={referral}
            onChange={(e) => setReferral(e.target.value)}
            placeholder="Referral code (optional)"
            className="w-full h-12 px-4 rounded-md bg-muted/60 border border-border text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:border-fire focus:ring-2 focus:ring-fire/30 transition"
          />

          <FireButton
            className="w-full gap-2"
            size="lg"
            onClick={() => {
              if (referral) localStorage.setItem("pendingReferral", referral.trim());
              window.location.href = `${API_URL}/api/auth/google`;
            }}
          >
            <GoogleIcon />
            Continue with Google
          </FireButton>

          <p className="text-[11px] text-muted-foreground text-center pt-1">
            Already have an account? Google sign-in will log you in instead.
          </p>
        </div>
      )}

      {/* ── EMAIL TAB ── */}
      {method === "email" && (
        <form className="space-y-4" onSubmit={submit} noValidate>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            required
            className="w-full h-12 px-4 rounded-md bg-muted/60 border border-border text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:border-fire focus:ring-2 focus:ring-fire/30 transition"
          />

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            autoComplete="email"
            required
            className="w-full h-12 px-4 rounded-md bg-muted/60 border border-border text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:border-fire focus:ring-2 focus:ring-fire/30 transition"
          />

          <div>
            <div className="relative">
              <input
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                type={showPw ? "text" : "password"}
                placeholder="Password (min 8 characters)"
                autoComplete="new-password"
                minLength={8}
                required
                className="w-full h-12 px-4 pr-10 rounded-md bg-muted/60 border border-border text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:border-fire focus:ring-2 focus:ring-fire/30 transition"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                aria-label={showPw ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-fire transition"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {pw.length > 0 && (
              <div className="mt-2.5 flex items-center gap-2">
                <div className="flex-1 flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 h-1 rounded-full transition-all",
                        strength >= i ? STRENGTH_COLORS[strength] : "bg-muted",
                      )}
                    />
                  ))}
                </div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground w-20 text-right">
                  {STRENGTH_LABELS[strength]}
                </span>
              </div>
            )}
          </div>

          <input
            value={referral}
            onChange={(e) => setReferral(e.target.value)}
            placeholder="Referral code (optional)"
            className="w-full h-12 px-4 rounded-md bg-muted/60 border border-border text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:border-fire focus:ring-2 focus:ring-fire/30 transition"
          />

          <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-md bg-fire/5 border border-fire/20 text-[11px] text-muted-foreground">
            <Flame className="h-3.5 w-3.5 text-fire shrink-0 mt-0.5" />
            <span>Have a referral code? Your referrer earns <strong className="text-foreground">10%</strong> from every burn you make.</span>
          </div>

          <FireButton type="submit" className="w-full" size="lg" disabled={loading}>
            <Flame className="h-4 w-4" />
            {loading ? "Creating account…" : "Create Account"}
          </FireButton>

          {/* Divider */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">or continue with</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <button
            type="button"
            onClick={() => {
              if (referral) localStorage.setItem("pendingReferral", referral.trim());
              window.location.href = `${API_URL}/api/auth/google`;
            }}
            className="w-full h-11 flex items-center justify-center gap-3 rounded-md border border-border glass text-sm font-medium hover:border-fire/40 hover:bg-fire/5 transition"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </form>
      )}

      <div className="mt-6 text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground hover:text-fire font-medium transition">
          Sign in →
        </Link>
      </div>
    </AuthShell>
  );
}
