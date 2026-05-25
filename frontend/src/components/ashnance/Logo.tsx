import Link from "next/link";
export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "text-base", md: "text-xl", lg: "text-2xl" };
  return (
    <Link href="/" className="inline-flex items-center gap-2 font-display font-bold tracking-tight">
      <span className={sizes[size]}>🔥</span>
      <span className={sizes[size]}>Ashnance</span>
    </Link>
  );
}
