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
                ? "bg-fire text-background border-fire font-semibold"
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
      await api.updateProfile({ username, privacy });
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

const MOCK_RECOVERY_CODES = [
  "A3F2B-9E4C1", "D8K7M-2P1Q5", "X4N9R-6T3W8", "B5J2H-0L8Y4",
  "C7V3K-4M9P2", "E1Q8N-7S5X6", "F6T2W-3A1C9", "G9P4B-8K6M0",
];

function TwoFaTab() {
  const { user } = useAuth();
  const [step, setStep] = useState<"status" | "setup" | "codes">("status");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);

  async function enable2fa() {
    if (code.length !== 6) return;
    setLoading(true);
    try {
      await api.enable2fa(code);
      toast.success("2FA enabled!");
      setStep("codes");
    } catch { toast.error("Invalid code"); }
    setLoading(false);
  }

  async function disable2fa() {
    setLoading(true);
    try {
      await api.disable2fa("");
      toast.success("2FA disabled");
    } catch { toast.error("Failed"); }
    setLoading(false);
  }

  if (step === "codes") {
    return (
      <GlassCard>
        <div className="text-sm font-semibold mb-2">Recovery Codes</div>
        <p className="text-sm text-muted-foreground mb-4">
          Save these 8 recovery codes in a safe place. Each code can only be used once.
          If you lose access to your authenticator, use a recovery code to log in.
        </p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {MOCK_RECOVERY_CODES.map((c) => (
            <div key={c} className="glass rounded-md px-3 py-2 font-mono text-sm tracking-wider text-center">{c}</div>
          ))}
        </div>
        <div className="flex gap-2">
          <GhostButton onClick={() => { navigator.clipboard.writeText(MOCK_RECOVERY_CODES.join("\n")); toast.success("Codes copied"); }}>
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
          Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code.
        </p>
        {/* QR placeholder */}
        <div className="w-40 h-40 glass rounded-xl flex items-center justify-center mx-auto mb-4 text-muted-foreground text-xs">
          QR code here
        </div>
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
              : <FireButton onClick={() => setStep("setup")}><Key className="h-4 w-4" />Enable 2FA</FireButton>
            }
          </div>
        </div>
      </GlassCard>

      {user.twoFaEnabled && (
        <GlassCard>
          <div className="text-sm font-semibold mb-2">Recovery codes</div>
          <p className="text-sm text-muted-foreground mb-3">
            You have <span className="font-mono text-foreground">{user.recoveryCodesRemaining}</span> recovery codes remaining.
            Recovery codes can be used to log in if you lose access to your authenticator.
          </p>
          <div className="flex gap-2">
            <GhostButton onClick={() => { setRevealed(!revealed); }}>
              {revealed ? <EyeOff className="h-4 w-4 inline mr-1" /> : <Eye className="h-4 w-4 inline mr-1" />}
              {revealed ? "Hide" : "Reveal"} codes
            </GhostButton>
            <GhostButton onClick={() => setStep("codes")}>Regenerate</GhostButton>
          </div>
          {revealed && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              {MOCK_RECOVERY_CODES.map((c, i) => (
                <div key={c} className={cn("glass rounded-md px-3 py-2 font-mono text-sm tracking-wider text-center",
                  i >= user.recoveryCodesRemaining && "opacity-40 line-through")}>
                  {c}
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}
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
        The address must be whitelisted.
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
