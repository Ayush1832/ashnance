import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Burn Now — Ashnance",
  description: "Burn USDC and spin the fire. Win up to 2,500 USDC or earn ASH tokens.",
};

export default function BurnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
