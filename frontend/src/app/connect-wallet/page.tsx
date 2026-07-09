"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ConnectWalletPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard"); }, [router]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="size-6 animate-spin rounded-full border-2 border-white/15 border-t-primary" />
    </div>
  );
}
