import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { GrainOverlay } from "@/components/effects/GrainOverlay";
import { LaunchGate } from "@/components/launch/LaunchGate";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#08080A",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ashnance.com"),
  title: "Ashnance — Burn USDC. Earn Weight. Win the Pool.",
  description: "Competitive participation on Solana. Burn USDC, climb the leaderboard, and the #1 weight holder wins the entire prize pool.",
  keywords: ["Ashnance", "Burn to Win", "ASH Token", "Solana", "USDC", "Crypto Gaming", "Web3", "DeFi"],
  authors: [{ name: "Ashnance Team" }],
  openGraph: {
    title: "Ashnance — Burn-to-Earn on Solana",
    description: "Every round, one winner takes everything.",
    url: "https://www.ashnance.com",
    siteName: "Ashnance",
    type: "website",
  },
  twitter: { card: "summary", site: "@Ashnance" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-scroll-behavior="smooth": Next 16 no longer overrides scroll-behavior
    // on navigation, so we opt back in for in-page anchors / Lenis.
    <html lang="en" className="dark" data-scroll-behavior="smooth">
      <body suppressHydrationWarning>
        <GrainOverlay />
        <ScrollProgress />
        <SmoothScroll>
          <LaunchGate>{children}</LaunchGate>
        </SmoothScroll>
        <Toaster position="top-right" theme="dark" />
      </body>
    </html>
  );
}
