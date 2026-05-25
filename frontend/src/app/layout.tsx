import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

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
    <html lang="en" className="dark">
      <body suppressHydrationWarning>
        {children}
        <Toaster position="top-right" theme="dark" />
      </body>
    </html>
  );
}
