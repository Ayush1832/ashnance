"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/ashnance/AuthShell";
import { FireButton } from "@/components/ashnance/primitives";
import { api, mapProfile } from "@/lib/apiClient";
import { userStore } from "@/lib/userStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"];
const STRENGTH_COLORS = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-green-400", "bg-green-500"];

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
    <svg className="h-5 w-5" viewBox="0 0 48 48">
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
    <AuthShell>
      {/* Heading */}
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold">Create your account</h2>
        <p className="text-sm text-muted-foreground mt-1">Start burning.</p>
      </div>

      {/* Method tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted mb-6 text-xs">
        <button
          onClick={() => setMethod("email")}
          className={`flex-1 h-8 rounded transition font-medium ${method === "email" ? "bg-fire text-background" : "text-muted-foreground hover:text-foreground"}`}
        >
          Email
        </button>
        <button
          onClick={() => setMethod("google")}
          className={`flex-1 h-8 rounded transition font-medium ${method === "google" ? "bg-fire text-background" : "text-muted-foreground hover:text-foreground"}`}
        >
          Google
        </button>
      </div>

      {method === "google" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Sign up instantly with your Google account. No password needed.
          </p>

          {/* Referral code — stored in localStorage and applied automatically after OAuth */}
          <input
            className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-fire"
            placeholder="Referral code (optional)"
            value={referral}
            onChange={(e) => setReferral(e.target.value)}
          />

          <FireButton
            className="w-full gap-2"
            onClick={() => {
              if (referral) localStorage.setItem("pendingReferral", referral.trim());
              window.location.href = `${API_URL}/api/auth/google`;
            }}
          >
            <GoogleIcon />
            Continue with Google
          </FireButton>

          <p className="text-xs text-muted-foreground text-center">
            Already have an account? Google sign-in will log you in instead.
          </p>
        </div>
      )}

      {method === "email" && (
        <form className="space-y-4" onSubmit={submit} noValidate>
          <input
            className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-fire"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />

          <input
            className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-fire"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <div>
            <div className="relative">
              <input
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                type={showPw ? "text" : "password"}
                className="w-full h-11 px-3 pr-10 rounded-md bg-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-fire"
                placeholder="Password (min 8 characters)"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {pw.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 flex gap-0.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`flex-1 h-1 rounded-full transition-all ${
                        strength >= i ? STRENGTH_COLORS[strength] : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground w-16 text-right">
                  {STRENGTH_LABELS[strength]}
                </span>
              </div>
            )}
          </div>

          <input
            className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-fire"
            placeholder="Referral code (optional)"
            value={referral}
            onChange={(e) => setReferral(e.target.value)}
          />

          <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-md bg-fire/5 border border-fire/20 text-xs text-muted-foreground">
            <span className="text-fire mt-0.5">🔥</span>
            <span>Have a referral code? Your referrer earns <strong className="text-foreground">10% commission</strong> from every burn you make.</span>
          </div>

          <FireButton type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account…" : "Create Account"}
          </FireButton>

          {/* Divider */}
          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <button
            type="button"
            onClick={() => { window.location.href = `${API_URL}/api/auth/google`; }}
            className="w-full h-11 flex items-center justify-center gap-3 rounded-md border border-border bg-muted/50 text-sm font-medium hover:bg-muted transition"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </form>
      )}

      <div className="mt-5 text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground hover:text-primary font-medium">
          Sign in →
        </Link>
      </div>
    </AuthShell>
  );
}
