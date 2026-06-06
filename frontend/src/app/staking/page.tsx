"use client";

import { useRouter } from "next/navigation";
import { Sprout } from "lucide-react";
import { FireButton, GhostButton } from "@/components/ashnance/primitives";

// ASH staking is a Phase 2 feature. The route is kept (bookmarks + landing footer
// link still resolve) but renders a "coming soon" screen instead of the live
// staking UI. The staking API stays in place behind this; re-enable the nav item
// in AppShell + restore the full page when Phase 2 ships.
export default function StakingPhase2Page() {
  const router = useRouter();
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-20 text-center">
      <div className="glass-card max-w-lg rounded-2xl p-8 sm:p-10">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
          <Sprout className="h-8 w-8 text-primary" />
        </div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
          Phase 2
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          ASH Staking is coming soon
        </h1>
        <p className="mt-4 text-muted-foreground">
          Lock your ASH to earn yield — arriving in Phase 2 once the reward
          treasury goes live. For now, keep burning to climb the leaderboard.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <FireButton size="lg" onClick={() => router.push("/dashboard")}>
            Go to Dashboard
          </FireButton>
          <GhostButton size="lg" onClick={() => router.push("/burn")}>
            Burn now
          </GhostButton>
        </div>
      </div>
    </main>
  );
}
