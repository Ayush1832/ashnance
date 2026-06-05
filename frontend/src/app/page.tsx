"use client";

import { useEffect, useState } from "react";
import { LandingNav } from "@/components/ashnance/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { TrustBar } from "@/components/landing/TrustBar";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LiveRound } from "@/components/landing/LiveRound";
import { SocialProof } from "@/components/landing/SocialProof";
import { BeyondTheAshes } from "@/components/landing/BeyondTheAshes";
import { AshSection } from "@/components/landing/AshSection";
import { Vip } from "@/components/landing/Vip";
import { Winners } from "@/components/landing/Winners";
import { FinalCta } from "@/components/landing/FinalCta";
import { Footer } from "@/components/landing/Footer";
import { api } from "@/lib/apiClient";
import type { LeaderboardRow, Round } from "@/lib/types";

export default function LandingPage() {
  const [round, setRound] = useState<Round | null>(null);
  const [winners, setWinners] = useState<LeaderboardRow[]>([]);

  useEffect(() => {
    api
      .publicRound()
      .then((res) => {
        if (res.success && res.data) setRound(res.data as Round);
      })
      .catch(() => {});
    api
      .leaderboard("winners")
      .then((res) => {
        if (res.success && res.data) setWinners(res.data as LeaderboardRow[]);
      })
      .catch(() => {});
  }, []);

  return (
    <main className="relative overflow-x-clip">
      <LandingNav />
      <Hero round={round} />
      <TrustBar />
      <HowItWorks />
      <LiveRound round={round} />
      <SocialProof round={round} />
      <BeyondTheAshes />
      <AshSection />
      <Vip />
      <Winners winners={winners} />
      <FinalCta />
      <Footer />
    </main>
  );
}
