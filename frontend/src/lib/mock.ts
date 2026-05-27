// Pure calculation helpers used in the burn UI preview.
// All mock data constants have been removed — pages now fetch from the real API.

import type { BurnConfig } from "./types";

// Default config values used for local weight/ash preview calculations.
// These are overridden when the real config loads from the backend.
const DEFAULT_CONFIG: Pick<BurnConfig,
  "ash_reward_percent" | "base_unit" | "referral_weight_cap_pct" | "weight_cap"
> = {
  ash_reward_percent:      1.0,
  base_unit:               4.99,
  referral_weight_cap_pct: 0.40,
  weight_cap:              300,
};

export function calcWeight(
  amount: number,
  opts: { vip?: boolean; boost?: boolean; activeReferrals?: number } = {},
  cfg: Partial<typeof DEFAULT_CONFIG> = {},
) {
  const c = { ...DEFAULT_CONFIG, ...cfg };
  const base = amount / c.base_unit;
  const vipBonus    = opts.vip   ? 0.5 : 0;
  const boostBonus  = opts.boost ? 0.5 : 0;
  const referralBonus = Math.min(
    (Math.floor((opts.activeReferrals ?? 0) / 5)) * 0.2,
    (base + vipBonus + boostBonus) * c.referral_weight_cap_pct,
  );
  const raw  = base + vipBonus + boostBonus + referralBonus;
  const cap  = c.weight_cap;
  const final = raw > cap ? cap + Math.sqrt(raw - cap) : raw;
  return { base, vipBonus, boostBonus, referralBonus, raw, final };
}

export function calcAsh(amount: number, vip: boolean, cfg: Partial<typeof DEFAULT_CONFIG> = {}) {
  const c = { ...DEFAULT_CONFIG, ...cfg };
  const base = Math.floor(amount * c.ash_reward_percent / 0.01);
  return vip ? Math.floor(base * 1.2) : base;
}
