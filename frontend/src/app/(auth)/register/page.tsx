"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/ashnance/AuthShell";
import { FireButton } from "@/components/ashnance/primitives";
import { api } from "@/lib/apiClient";

function strength(pw: string) {
  let s = 0; if (pw.length >= 8) s++; if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++; if (/[^A-Za-z0-9]/.test(pw)) s++;
  return ["Weak","Fair","Good","Strong","Very Strong"][s];
}

export default function RegisterPage() {
  const nav = useRouter();
  const [pw, setPw] = useState("");
  return (
    <AuthShell>
      <h2 className="font-display text-2xl mb-1">Create your account</h2>
      <p className="text-sm text-muted-foreground mb-6">Start competing in seconds.</p>
      <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); await api.register({}); toast.success("Welcome to Ashnance"); nav.push("/dashboard"); }}>
        <input className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm" placeholder="Username" />
        <input className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm" placeholder="Email" type="email" />
        <div>
          <input value={pw} onChange={(e) => setPw(e.target.value)} type="password"
            className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm" placeholder="Password (min 8)" />
          {pw && <div className="mt-2 flex items-center gap-2 text-xs">
            <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden"><div className="h-full bg-fire" style={{ width: `${Math.min(100, pw.length * 12)}%` }} /></div>
            <span className="text-muted-foreground">{strength(pw)}</span>
          </div>}
        </div>
        <input className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm" placeholder="Referral code (optional)" />
        <div className="glass rounded-md p-3 text-xs text-muted-foreground">Get a referral bonus! Your referrer earns 10% of your burns.</div>
        <FireButton type="submit" className="w-full">Create Account</FireButton>
        <div className="text-center text-xs text-muted-foreground">
          Already have an account? <Link href="/login" className="text-foreground hover:text-primary">Sign in →</Link>
        </div>
      </form>
    </AuthShell>
  );
}
