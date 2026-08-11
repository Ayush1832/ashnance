"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Flame, Users, Swords, Shield, RotateCcw, Zap, HeartPulse } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/ashnance/AppShell";
import { Reveal } from "@/components/motion/Reveal";
import {
  GlassCard, SectionHeader, FireButton, GhostButton, StatTile, RankBadge, EmptyState,
} from "@/components/ashnance/primitives";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/apiClient";
import { socket } from "@/lib/socketClient";
import { fmtUsd, fmtNum, timeAgo } from "@/lib/format";
import type { Creator, CreatorPool, CreatorPoolParticipant, CreatorPoolWinner, BattleEvent, BattleActionType } from "@/lib/types";

const BATTLE_ACTIONS: { type: BattleActionType; label: string; cost: number; icon: typeof Swords; needsTarget?: boolean }[] = [
  { type: "ATTACK", label: "Attack", cost: 10, icon: Swords, needsTarget: true },
  { type: "SHIELD", label: "Shield", cost: 8, icon: Shield },
  { type: "COUNTER", label: "Counter", cost: 12, icon: RotateCcw },
  { type: "BOOST", label: "Boost", cost: 15, icon: Zap },
  { type: "RECOVERY", label: "Recovery", cost: 10, icon: HeartPulse },
];

export default function PublicPoolPage() {
  const params = useParams<{ creatorSlug: string; poolSlug: string }>();
  const searchParams = useSearchParams();
  const creatorSlug = params.creatorSlug;
  const poolSlug = params.poolSlug;

  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [pool, setPool] = useState<CreatorPool | null>(null);
  const [participants, setParticipants] = useState<CreatorPoolParticipant[]>([]);
  const [winners, setWinners] = useState<CreatorPoolWinner[]>([]);
  const [battleLog, setBattleLog] = useState<BattleEvent[]>([]);
  const [amount, setAmount] = useState("");
  const [contributing, setContributing] = useState(false);
  const [busyAction, setBusyAction] = useState<BattleActionType | null>(null);
  const [attackTarget, setAttackTarget] = useState("");
  const followedRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await api.publicPool(creatorSlug, poolSlug);
      const data = res.data as { creator: Creator; pool: CreatorPool; participants: CreatorPoolParticipant[]; winners: CreatorPoolWinner[] };
      setCreator(data.creator);
      setPool(data.pool);
      setParticipants(data.participants);
      setWinners(data.winners);
    } catch {
      setPool(null);
    } finally {
      setLoading(false);
    }
  }, [creatorSlug, poolSlug]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!pool) return;
    api.battleLog(pool.id).then((res) => setBattleLog((res.data as BattleEvent[]) ?? [])).catch(() => {});
  }, [pool?.id]);

  useEffect(() => {
    if (!pool) return;
    socket.joinPool(pool.id);
    const offProgress = socket.on("creatorPool:progress", () => load());
    const offContribution = socket.on("creatorPool:contribution", () => load());
    const offBattle = socket.on("creatorPool:battle", () => {
      load();
      api.battleLog(pool.id).then((res) => setBattleLog((res.data as BattleEvent[]) ?? [])).catch(() => {});
    });
    const offWinner = socket.on("creatorPool:winner", (payload) => {
      const p = payload as { winner: string; prize: number };
      toast.success(`${p.winner} won ${fmtUsd(p.prize)}!`);
      load();
    });
    const offEnded = socket.on("creatorPool:ended", () => {
      toast("This pool has ended.");
      load();
    });
    return () => {
      offProgress(); offContribution(); offBattle(); offWinner(); offEnded();
      socket.leavePool(pool.id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool?.id]);

  // Associate the visitor with the creator via ?ref= once, if signed in.
  useEffect(() => {
    if (followedRef.current || !user.id) return;
    const ref = searchParams.get("ref") ?? undefined;
    followedRef.current = true;
    api.followCreator(creatorSlug, ref).catch(() => {});
  }, [user.id, creatorSlug, searchParams]);

  async function submitContribution() {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error("Enter a contribution amount");
      return;
    }
    setContributing(true);
    try {
      await api.contributeToPool(creatorSlug, poolSlug, amt);
      toast.success("Contribution successful!");
      setAmount("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Contribution failed");
    } finally {
      setContributing(false);
    }
  }

  async function runBattleAction(actionType: BattleActionType) {
    if (!pool) return;
    if (actionType === "ATTACK" && !attackTarget) {
      toast.error("Pick a target to attack");
      return;
    }
    setBusyAction(actionType);
    try {
      await api.battleAction(pool.id, {
        actionType,
        targetUserId: actionType === "ATTACK" ? attackTarget : undefined,
      });
      toast.success(`${actionType} used`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyAction(null);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="text-center py-16 text-muted-foreground text-sm">Loading…</div>
      </AppShell>
    );
  }

  if (!pool || !creator) {
    return (
      <AppShell>
        <EmptyState icon={<Flame className="h-8 w-8" />} title="Pool not found" sub="This pool may have been removed or the URL is wrong." />
      </AppShell>
    );
  }

  const isActive = pool.status === "ACTIVE";
  const isParticipant = participants.some((p) => p.userId === user.id);
  const otherParticipants = participants.filter((p) => p.userId !== user.id);

  return (
    <AppShell>
      <Reveal>
        {pool.coverImageUrl && (
          <div className="rounded-2xl overflow-hidden mb-5 h-40 sm:h-56 bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pool.coverImageUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <SectionHeader
          eyebrow={`by ${creator.displayName}`}
          title={pool.name}
          sub={pool.description ?? undefined}
        />
      </Reveal>

      <Reveal delay={0.08}>
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <StatTile label="Prize Pool" value={fmtUsd(pool.currentPoolValue)} accent="fire" />
          <StatTile label="Participants" value={participants.length} accent="ash" sub={<span className="flex items-center gap-1"><Users className="h-3 w-3" /> live</span>} />
          <StatTile label="Status" value={pool.status} accent="gold" />
        </div>
      </Reveal>

      {isActive && (
        <Reveal delay={0.12}>
          <GlassCard ring className="mb-6 max-w-md">
            <div className="text-sm font-semibold mb-3">Contribute to this pool</div>
            <div className="flex gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Min $${pool.minContribution}`}
                className="flex-1 glass rounded-lg px-3 py-2 text-sm font-mono outline-none"
              />
              <FireButton onClick={submitContribution} disabled={contributing || !user.id}>
                {contributing ? "…" : "Contribute"}
              </FireButton>
            </div>
            {!user.id && <div className="text-xs text-muted-foreground mt-2">Sign in to contribute.</div>}
          </GlassCard>
        </Reveal>
      )}

      {isActive && isParticipant && (
        <Reveal delay={0.14}>
          <GlassCard className="mb-6">
            <div className="text-sm font-semibold mb-1">Battle System</div>
            <div className="text-xs text-muted-foreground mb-4">
              Spend ASH to attack rivals, shield your weight, counter a recent attacker, boost yourself, or recover lost weight.
            </div>
            {otherParticipants.length > 0 && (
              <select
                value={attackTarget}
                onChange={(e) => setAttackTarget(e.target.value)}
                className="w-full mb-3 glass rounded-lg px-3 py-2 text-sm outline-none"
              >
                <option value="">Select attack target…</option>
                {otherParticipants.map((p) => (
                  <option key={p.userId} value={p.userId}>{p.user.username}</option>
                ))}
              </select>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {BATTLE_ACTIONS.map((a) => (
                <GhostButton
                  key={a.type}
                  size="sm"
                  disabled={busyAction !== null || (a.needsTarget && otherParticipants.length === 0)}
                  onClick={() => runBattleAction(a.type)}
                  className="flex flex-col items-center justify-center h-auto py-2 gap-1"
                >
                  <a.icon className="h-4 w-4" />
                  <span className="text-[11px]">{a.label}</span>
                  <span className="text-[10px] text-muted-foreground">{a.cost} ASH</span>
                </GhostButton>
              ))}
            </div>
          </GlassCard>
        </Reveal>
      )}

      <Reveal delay={0.16}>
        <GlassCard className="mb-5">
          <div className="text-sm font-semibold mb-4">Leaderboard</div>
          {participants.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">No contributions yet — be the first!</div>
          ) : (
            <div className="space-y-2">
              {participants.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 glass rounded-lg px-4 py-3">
                  <RankBadge rank={i + 1} />
                  <span className="text-sm flex-1 truncate">{p.user.username}</span>
                  <span className="font-mono text-xs text-muted-foreground">{fmtNum(p.weight, 1)} wt</span>
                  <span className="font-mono text-sm text-fire">{fmtUsd(p.totalContributed)}</span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </Reveal>

      {battleLog.length > 0 && (
        <Reveal delay={0.18}>
          <GlassCard className="mb-5">
            <div className="text-sm font-semibold mb-4">Battle log</div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {battleLog.map((e) => (
                <div key={e.id} className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="text-foreground font-medium">{e.actor.username}</span>
                  <span>used {e.actionType.toLowerCase()}</span>
                  {e.target && <span>on <span className="text-foreground">{e.target.username}</span></span>}
                  <span className="ml-auto">{timeAgo(e.createdAt)}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </Reveal>
      )}

      {winners.length > 0 && (
        <Reveal delay={0.2}>
          <GlassCard>
            <div className="text-sm font-semibold mb-4">Winner history</div>
            <div className="space-y-2">
              {winners.map((w) => (
                <div key={w.id} className="flex items-center gap-3 glass rounded-lg px-4 py-3">
                  <span className="text-sm flex-1">{w.user.username}</span>
                  <span className="text-xs text-muted-foreground">{timeAgo(w.selectedAt)}</span>
                  <span className="font-mono text-sm text-gold">{fmtUsd(w.prizeAmount)}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </Reveal>
      )}
    </AppShell>
  );
}
