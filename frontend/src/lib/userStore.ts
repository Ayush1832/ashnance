import type { User } from "./types";
import { mockUser } from "./mock";

let _user: User = { ...mockUser };
const _subs = new Set<() => void>();

export const userStore = {
  get(): User { return _user; },
  update(patch: Partial<User>) {
    _user = { ..._user, ...patch };
    Object.assign(mockUser, patch);
    _subs.forEach((fn) => fn());
  },
  subscribe(fn: () => void) {
    _subs.add(fn);
    return () => { _subs.delete(fn); };
  },
};
