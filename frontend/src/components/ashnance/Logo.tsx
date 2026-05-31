import Link from "next/link";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

// Premium product mark: a molten rounded-square badge (à la Linear/Raycast)
// holding a flame glyph, paired with the wordmark. Backward-compatible API.
export function Logo({
  size = "md",
  href = "/",
  className,
  showText = true,
}: {
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
  showText?: boolean;
}) {
  const mark = { sm: "size-6", md: "size-8", lg: "size-10" }[size];
  const icon = { sm: "size-3.5", md: "size-[18px]", lg: "size-6" }[size];
  const text = { sm: "text-sm", md: "text-lg", lg: "text-2xl" }[size];

  return (
    <Link
      href={href}
      aria-label="Ashnance home"
      className={cn("group inline-flex items-center gap-2.5 font-display font-bold tracking-tight", className)}
    >
      <span
        className={cn(
          "relative grid shrink-0 place-items-center rounded-[32%] bg-fire text-background",
          "shadow-[0_4px_18px_-3px_rgba(255,69,0,0.6)] transition-transform duration-500 ease-out group-hover:scale-105",
          mark,
        )}
      >
        <Flame className={cn(icon, "drop-shadow-sm")} strokeWidth={2.4} fill="currentColor" fillOpacity={0.22} />
        <span className="pointer-events-none absolute inset-0 rounded-[32%] ring-1 ring-inset ring-white/25" />
      </span>
      {showText && <span className={cn(text, "leading-none")}>Ashnance</span>}
    </Link>
  );
}
