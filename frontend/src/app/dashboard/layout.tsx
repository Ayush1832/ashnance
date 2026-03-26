import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — Ashnance",
  description: "Your Ashnance dashboard. View balances, burn USDC, track wins, and manage your account.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
