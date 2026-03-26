import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login — Ashnance",
  description: "Log in to your Ashnance account. Start burning USDC to win prizes and earn ASH tokens.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
