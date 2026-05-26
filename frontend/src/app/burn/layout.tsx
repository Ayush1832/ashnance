import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Burn — Ashnance",
};

export default function BurnLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
