import type { Metadata } from "next";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Burn Now — Ashnance",
};

export default function BurnLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
