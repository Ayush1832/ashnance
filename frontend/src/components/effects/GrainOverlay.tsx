// Fixed film-grain overlay — kills gradient banding and adds a premium texture.
// Pure CSS (see .grain-overlay in globals.css); pointer-events: none.
export function GrainOverlay() {
  return <div className="grain-overlay" aria-hidden />;
}
