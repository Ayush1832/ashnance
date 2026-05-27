import type { User } from "./types";

const DEFAULT_USER: User = {
  id: "",
  username: "",
  email: "",
  role: "USER",
  vip: null,
  vipExpiresAt: undefined,
  banned: false,
  privacy: false,
  twoFaEnabled: false,
  recoveryCodesRemaining: 0,
  walletAddress: undefined,
  referralCode: "",
  createdAt: "",
  usdcBalance: 0,
  ashBalance: 0,
  ashBoostExpiresAt: undefined,
  depositAddress: "",
};

let _user: User = { ...DEFAULT_USER };
const _subs = new Set<() => void>();

export const userStore = {
  get(): User { return _user; },
  update(patch: Partial<User>) {
    _user = { ..._user, ...patch };
    _subs.forEach((fn) => fn());
  },
  clear() {
    _user = { ...DEFAULT_USER };
    _subs.forEach((fn) => fn());
  },
  subscribe(fn: () => void) {
    _subs.add(fn);
    return () => { _subs.delete(fn); };
  },
};
