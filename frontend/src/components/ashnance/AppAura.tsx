// Subtle ambient backdrop for authenticated pages — echoes the landing aurora
// without harming data readability. Static, low-opacity radial glows only: no
// transforms/filters that would create a containing block for fixed overlays.
export function AppAura() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute -top-40 left-1/2 h-[28rem] w-[140%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(255,69,0,0.10),transparent_60%)] blur-3xl" />
      <div className="absolute right-[-10%] top-10 size-96 rounded-full bg-[radial-gradient(circle,rgba(255,184,0,0.06),transparent_70%)] blur-3xl" />
      <div className="absolute left-[-10%] top-1/3 size-96 rounded-full bg-[radial-gradient(circle,rgba(120,80,255,0.05),transparent_70%)] blur-3xl" />
    </div>
  );
}
