"use client";

import { useState } from "react";
import { Shield, Key, User, Coins, Eye, EyeOff, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/ashnance/AppShell";
import { GlassCard, SectionHeader, FireButton, GhostButton } from "@/components/ashnance/primitives";
import { useAuth } from "@/hooks/useAuth";
import { fmtNum } from "@/lib/format";
import { api } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

type Tab = "profile" | "security" | "2fa" | "ash";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "profile",  label: "Profile",   icon: <User className="h-4 w-4" /> },
  { key: "security", label: "Security",  icon: <Shield className="h-4 w-4" /> },
  { key: "2fa",      label: "2FA",       icon: <Key className="h-4 w-4" /> },
  { key: "ash",      label: "ASH Claim", icon: <Coins className="h-4 w-4" /> },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");
  return (
    <AppShell>
      <SectionHeader eyebrow="Account" title="Settings" sub="Manage your profile, security, and ASH claims." />
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-2 h-9 px-4 rounded-md text-sm border transition whitespace-nowrap",
              tab === t.key
                ? "bg-fire text-background border-primary font-semibold"
                : "border-border glass text-muted-foreground hover:text-foreground",
            )}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>
      {tab === "profile"  && <ProfileTab />}
      {tab === "security" && <SecurityTab />}
      {tab === "2fa"      && <TwoFaTab />}
      {tab === "ash"      && <AshClaimTab />}
    </AppShell>
  );
}

function ProfileTab() {
  const { user } = useAuth();
  const [username, setUsername] = useState(user.username);
  const [privacy, setPrivacy] = useState(user.privacy);
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.updateProfile({ username, privacyMode: privacy });
      toast.success("Profile updated");
    } catch { toast.error("Failed to save"); }
    setLoading(false);
  }

  return (
    <GlassCard>
      <form onSubmit={save} className="space-y-5 max-w-md">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)}
            className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Email</label>
          <input value={user.email} disabled
            className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm opacity-60 cursor-not-allowed" />
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setPrivacy(!privacy)}
            className={cn("relative w-10 h-6 rounded-full transition-colors", privacy ? "bg-fire" : "bg-muted")}>
            <span className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-[left]", privacy ? "left-5" : "left-1")} />
          </button>
          <div>
            <div className="text-sm font-medium">Anonymous mode</div>
            <div className="text-xs text-muted-foreground">Show as &quot;Anonymous&quot; on leaderboards</div>
          </div>
        </div>
        <FireButton type="submit" disabled={loading}>{loading ? "Saving…" : "Save Profile"}</FireButton>
      </form>
    </GlassCard>
  );
}

function SecurityTab() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) { toast.error("Passwords don't match"); return; }
    setLoading(true);
    try {
      await api.updatePassword({ currentPassword: current, newPassword: next });
      toast.success("Password changed");
      setCurrent(""); setNext(""); setConfirm("");
    } catch { toast.error("Failed to change password"); }
    setLoading(false);
  }

  return (
    <GlassCard>
      <div className="text-sm font-semibold mb-4">Change Password</div>
      <form onSubmit={changePassword} className="space-y-4 max-w-md">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Current password</label>
          <div className="relative">
            <input type={show ? "text" : "password"} value={current} onChange={(e) => setCurrent(e.target.value)}
              className="w-full h-11 px-3 pr-10 rounded-md bg-muted border border-border text-sm" />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-3 text-muted-foreground">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">New password</label>
          <input type={show ? "text" : "password"} value={next} onChange={(e) => setNext(e.target.value)}
            className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Confirm new password</label>
          <input type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)}
            className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm" />
        </div>
        <FireButton type="submit" disabled={loading || !current || !next || !confirm}>
          {loading ? "Updating…" : "Change Password"}
        </FireButton>
      </form>
    </GlassCard>
  );
}

function TwoFaTab() {
  const { user } = useAuth();
  const [step, setStep] = useState<"status" | "setup" | "codes">("status");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  async function startSetup() {
    try {
      const res = await api.generate2fa();
      if (res.success && res.data) {
        setSecret(res.data.secret ?? "");
        // Generate QR image URL via Google Charts API
        setQrUrl(`https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(res.data.otpauthUrl ?? "")}`);
      }
    } catch { toast.error("Failed to generate 2FA secret"); return; }
    setStep("setup");
  }

  async function enable2fa() {
    if (code.length !== 6) return;
    setLoading(true);
    try {
      const res = await api.enable2fa(code);
      const codes = (res.data as { recoveryCodes?: string[] })?.recoveryCodes;
      if (codes) setRecoveryCodes(codes);
      toast.success("2FA enabled!");
      setStep("codes");
    } catch { toast.error("Invalid code — check your authenticator app"); }
    setLoading(false);
  }

  async function disable2fa() {
    const token = prompt("Enter your 6-digit authenticator code to disable 2FA:");
    if (!token) return;
    setLoading(true);
    try {
      await api.disable2fa(token);
      toast.success("2FA disabled");
    } catch { toast.error("Invalid code"); }
    setLoading(false);
  }

  if (step === "codes") {
    return (
      <GlassCard>
        <div className="text-sm font-semibold mb-2">Recovery Codes</div>
        <p className="text-sm text-muted-foreground mb-4">
          Save these recovery codes in a safe place. Each code can only be used once.
        </p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {recoveryCodes.map((c) => (
            <div key={c} className="glass rounded-md px-3 py-2 font-mono text-sm tracking-wider text-center">{c}</div>
          ))}
        </div>
        <div className="flex gap-2">
          <GhostButton onClick={() => { navigator.clipboard.writeText(recoveryCodes.join("\n")); toast.success("Codes copied"); }}>
            <Copy className="h-4 w-4 inline mr-1" />Copy all
          </GhostButton>
          <FireButton onClick={() => setStep("status")}><Check className="h-4 w-4" />I&apos;ve saved them</FireButton>
        </div>
      </GlassCard>
    );
  }

  if (step === "setup") {
    return (
      <GlassCard className="max-w-md">
        <div className="text-sm font-semibold mb-4">Set up authenticator app</div>
        <p className="text-sm text-muted-foreground mb-4">
          Scan the QR code with Google Authenticator, Authy, or any TOTP app, then enter the 6-digit code below.
        </p>
        {qrUrl ? (
          <img src={qrUrl} alt="2FA QR code" className="w-40 h-40 rounded-xl mx-auto mb-2" />
        ) : (
          <div className="w-40 h-40 glass rounded-xl flex items-center justify-center mx-auto mb-2 text-muted-foreground text-xs">Loading…</div>
        )}
        {secret && (
          <div className="text-center mb-4">
            <div className="text-xs text-muted-foreground mb-1">Or enter manually:</div>
            <div className="font-mono text-xs glass rounded px-3 py-1.5 inline-block tracking-widest">{secret}</div>
          </div>
        )}
        <div className="flex gap-2 mb-4 justify-center">
          {Array.from({ length: 6 }).map((_, i) => (
            <input key={i} maxLength={1} value={code[i] ?? ""} onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "");
              setCode((prev) => (prev.slice(0, i) + v + prev.slice(i + 1)).slice(0, 6));
              if (v && i < 5) (document.querySelectorAll("[data-otp]")[i + 1] as HTMLInputElement)?.focus();
            }}
              data-otp className="w-11 h-12 text-center font-mono text-lg rounded-md bg-muted border border-border" />
          ))}
        </div>
        <div className="flex gap-2">
          <GhostButton onClick={() => setStep("status")}>Back</GhostButton>
          <FireButton className="flex-1" onClick={enable2fa} disabled={loading || code.length < 6}>
            {loading ? "Verifying…" : "Enable 2FA"}
          </FireButton>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      <GlassCard>
        <div className="flex items-center gap-4">
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center",
            user.twoFaEnabled ? "bg-success/20 text-success" : "bg-muted text-muted-foreground")}>
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="font-medium">{user.twoFaEnabled ? "2FA is enabled" : "2FA is disabled"}</div>
            <div className="text-xs text-muted-foreground">
              {user.twoFaEnabled
                ? `${user.recoveryCodesRemaining} recovery codes remaining`
                : "Add an extra layer of security to your account"}
            </div>
          </div>
          <div className="ml-auto">
            {user.twoFaEnabled
              ? <GhostButton onClick={disable2fa} disabled={loading}>Disable</GhostButton>
              : <FireButton onClick={startSetup}><Key className="h-4 w-4" />Enable 2FA</FireButton>
            }
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function AshClaimTab() {
  const { user } = useAuth();
  const [address, setAddress] = useState(user.walletAddress ?? "");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  async function claim(e: React.FormEvent) {
    e.preventDefault();
    const a = amount ? parseFloat(amount) : undefined;
    if (a !== undefined && (isNaN(a) || a <= 0)) return;
    setLoading(true);
    try {
      await api.claimAsh({ toAddress: address, amount: a ?? user.ashBalance });
      toast.success(`ASH claim initiated${a ? ` for ${fmtNum(a)} ASH` : " (full balance)"}`);
      setAmount("");
    } catch { toast.error("Claim failed"); }
    setLoading(false);
  }

  return (
    <GlassCard>
      <div className="text-sm font-semibold mb-2">Claim ASH on-chain</div>
      <p className="text-sm text-muted-foreground mb-5">
        Transfer your ASH balance to any Solana wallet. You can claim a partial amount or your full balance.
      </p>
      <div className="glass rounded-lg p-4 mb-5 flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Available ASH</span>
        <span className="font-mono text-xl font-bold text-ash">{fmtNum(user.ashBalance)} ASH</span>
      </div>
      <form onSubmit={claim} className="space-y-4 max-w-md">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Destination address</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
            placeholder="Solana wallet address"
            className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm font-mono" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Amount (optional — leave blank to claim all)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder={String(user.ashBalance)}
            className="w-full h-11 px-3 rounded-md bg-muted border border-border text-sm font-mono" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Leave blank to claim full balance</span>
            <button type="button" onClick={() => setAmount(String(user.ashBalance))} className="hover:text-foreground">
              Max: {fmtNum(user.ashBalance)} ASH
            </button>
          </div>
        </div>
        <FireButton type="submit" className="w-full" disabled={loading || !address}>
          <Coins className="h-4 w-4" />{loading ? "Processing…" : "Claim ASH"}
        </FireButton>
      </form>
    </GlassCard>
  );
}
