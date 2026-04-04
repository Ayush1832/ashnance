import type { Metadata, Viewport } from "next";
import "./globals.css";
import AshBot from "../components/ai/AshBot";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0D0A09",
};

export const metadata: Metadata = {
  title: "Ashnance — Burn to Win ASH Token | Keep Burning, Keep Earning",
  description:
    "Burn USDC to win grand prizes or earn ASH tokens on the Solana blockchain. A gamified crypto platform where every burn is an instant chance to win.",
  keywords: ["Ashnance", "Burn to Win", "ASH Token", "Solana", "USDC", "Crypto Gaming", "Web3", "DeFi"],
  authors: [{ name: "Ashnance Team" }],
  icons: {
    icon: "/logo-symbol.png",
    apple: "/logo-symbol.png",
  },
  openGraph: {
    title: "Ashnance — Burn to Win ASH Token",
    description: "Burn USDC for a chance to win up to $2,500 or earn ASH tokens. Built on Solana.",
    url: "https://ashnance.io",
    siteName: "Ashnance",
    images: [{ url: "/logo-dark.png", width: 2001, height: 2001 }],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ashnance — Burn to Win ASH Token",
    description: "Burn USDC for a chance to win up to $2,500 or earn ASH tokens. Built on Solana.",
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

