import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ashnance — Enter the Forge",
  description:
    "Login or register to Ashnance. Burn USDC, earn ASH tokens, and win prizes in the fire-powered DeFi protocol.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
