import Link from "next/link";
import { Logo } from "@/components/ashnance/Logo";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Platform",
    links: [
      { label: "How it works", href: "#how" },
      { label: "Leaderboard", href: "/leaderboard" },
      { label: "Live round", href: "/burn" },
      { label: "Holy Fire VIP", href: "/subscribe" },
      { label: "Whitepaper", href: "/whitepaper" },
    ],
  },
  {
    title: "ASH",
    links: [
      { label: "Earn & boost", href: "#ash" },
      { label: "Staking", href: "/staking" },
      { label: "Referrals", href: "/referrals" },
      { label: "Wallet", href: "/wallet" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Create account", href: "/register" },
      { label: "Log in", href: "/login" },
      { label: "Settings", href: "/settings" },
      { label: "Hall of Fire", href: "#winners" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-border px-5 pb-12 pt-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo size="md" />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Competitive burn-to-win on Solana. Burn USDC, climb the leaderboard, and the
              #1 weight holder takes the entire pool.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 animate-pulse rounded-full bg-success" />
              All systems operational
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {col.title}
              </div>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-xs text-muted-foreground sm:flex-row">
          <span>© {2026} Ashnance · Powered by Solana</span>
          <div className="flex items-center gap-6">
            <a href="#" className="transition-colors hover:text-foreground">Terms</a>
            <a href="#" className="transition-colors hover:text-foreground">Privacy</a>
            <Link href="/whitepaper" className="transition-colors hover:text-foreground">Whitepaper</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
