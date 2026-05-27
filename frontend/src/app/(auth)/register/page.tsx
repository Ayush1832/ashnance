"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AuthShell } from "@/components/ashnance/AuthShell";
import { FireButton } from "@/components/ashnance/primitives";
import { api, mapProfile } from "@/lib/apiClient";
import { userStore } from "@/lib/userStore";

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return ["Weak", "Fair", "Good", "Strong", "Very Strong"][s];
}

export default function RegisterPage() {
  const nav = useRouter();
  const [username, setUsername]     = useState("");
  const [email, setEmail]           = useState("");
  const [pw, setPw]                 = useState("");
  const [referralCode, setReferral] = useState("");
  const [loading, setLoading]       = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !username || pw.length < 8) {
      toast.error("Please fill in all required fields (password min 8 chars)");
      return;
    }
    setLoading(true);
    try {
      const res = await api.register({ email, username, password: pw, referralCode: referralCode || undefined });
      if (res.data?.user) userStore.update(mapProfile(res.data.user as Record<string, unknown>));
      toast.success("Welcome to Ashnance 🔥");
      nav.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    }
    setLoading(false);
  }

  return (
    <AuthShell>
      <h2 className="font-display text-2xl mb-1">Create your account</h2>
      <p className="text-sm text-muted-foreground mb-6">Start competing in seconds.</p>
      <form className="space-y-4" onSubmit={submit}>
        <input
          className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div>
          <input
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            type="password"
            className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm"
            placeholder="Password (min 8 characters)"
            required
            minLength={8}
          />
          {pw && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-fire" style={{ width: `${Math.min(100, pw.length * 12)}%` }} />
              </div>
              <span className="text-muted-foreground">{strength(pw)}</span>
            </div>
          )}
        </div>
        <input
          className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm"
          placeholder="Referral code (optional)"
          value={referralCode}
          onChange={(e) => setReferral(e.target.value)}
        />
        <div className="glass rounded-md p-3 text-xs text-muted-foreground">
          Get a referral bonus! Your referrer earns 10% of your burns.
        </div>
        <FireButton type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account…" : "Create Account"}
        </FireButton>
        <div className="text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-foreground hover:text-primary">Sign in →</Link>
        </div>
      </form>
    </AuthShell>
  );
}
