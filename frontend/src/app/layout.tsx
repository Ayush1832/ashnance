import type { Metadata, Viewport } from "next";
import "./globals.css";
import AshBot from "../components/ai/AshBot";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0D0A09",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ashnance.com"),
  title: "Ashnance — Burn to Compete | Earn ASH & Win Round Prizes",
  description:
    "Burn USDC to accumulate weight, earn ASH tokens, and compete in prize rounds on the Solana blockchain. The #1 ranked player when the pool hits its target wins the entire prize.",
  keywords: ["Ashnance", "Burn to Win", "ASH Token", "Solana", "USDC", "Crypto Gaming", "Web3", "DeFi"],
  authors: [{ name: "Ashnance Team" }],
  icons: {
    icon: [
      { url: "/logo-symbol.png", type: "image/png" },
    ],
    apple: "/logo-symbol.png",
    shortcut: "/logo-symbol.png",
  },
  openGraph: {
    title: "Ashnance — Burn to Win ASH Token",
    description: "Burn USDC to accumulate weight, earn ASH, and compete in round-based prize pools. #1 on the leaderboard wins. Built on Solana.",
    url: "https://www.ashnance.com",
    siteName: "Ashnance",
    images: [{ url: "/logo-dark.png", width: 2001, height: 2001 }],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ashnance — Burn to Win ASH Token",
    description: "Burn USDC to accumulate weight, earn ASH, and compete in round-based prize pools. #1 on the leaderboard wins. Built on Solana.",
    images: ["/logo-dark.png"],
    creator: "@Ashnance",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <AshBot />
      </body>
    </html>
  );
}

