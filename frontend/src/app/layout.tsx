import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ashnance — Burn to Win ASH Token | Keep Burning, Keep Earning",
  description:
    "Burn USDC to win grand prizes or earn ASH tokens on the Solana blockchain. A gamified crypto platform where every burn is an instant chance to win.",
  keywords: ["Ashnance", "Burn to Win", "ASH Token", "Solana", "USDC", "Crypto Gaming", "Web3"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
