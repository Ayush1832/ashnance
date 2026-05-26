import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wallet — Ashnance",
};

export default function WalletLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
