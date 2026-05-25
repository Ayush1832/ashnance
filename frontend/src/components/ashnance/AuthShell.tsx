import Link from "next/link";
import { Logo } from "./Logo";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center px-4 py-12">
      <div className="absolute inset-0 bg-fire-radial pointer-events-none" />
      <div className="absolute inset-0 ember-bg" />
      <div className="relative w-full max-w-md">
        <div className="flex justify-center mb-8"><Logo size="lg" /></div>
        <div className="glass-elevated ring-fire rounded-2xl p-8">{children}</div>
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
