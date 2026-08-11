import Link from "next/link";
import Image from "next/image";
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
  const markPx = { sm: 24, md: 32, lg: 40 }[size];
  const text = { sm: "text-sm", md: "text-lg", lg: "text-2xl" }[size];

  return (
    <Link
      href={href}
      aria-label="Ashnance home"
      className={cn("group inline-flex items-center gap-2.5 font-display font-bold tracking-tight", className)}
    >
      <span
        className={cn(
          "relative grid shrink-0 place-items-center transition-transform duration-500 ease-out group-hover:scale-105",
          mark,
        )}
      >
        <Image
          src="/logo-symbol.png"
          alt=""
          width={markPx}
          height={markPx}
          className="size-full object-contain drop-shadow-[0_4px_14px_rgba(255,69,0,0.45)]"
          priority
        />
      </span>
      {showText && <span className={cn(text, "leading-none")}>Ashnance</span>}
    </Link>
  );
}
