// Real API client. All methods make fetch calls to the backend.

import { userStore } from "./userStore";
import type { User } from "./types";

// Maps the raw backend profile response to the frontend User shape.
export function mapProfile(raw: Record<string, unknown>): Partial<User> {
  const wallet = raw.wallet as {
    usdcBalance?: number | string;
    ashBalance?: number | string;
    depositAddress?: string;
    ashBoostExpiresAt?: string;
  } | null;
  return {
    id: raw.id as string,
    email: raw.email as string,
    username: raw.username as string,
    role: (raw.isOwner ? "OWNER" : (raw.role as string) ?? "USER") as User["role"],
    vip: (raw.isVip ? (raw.vipTier as string) : null) as User["vip"],
    vipExpiresAt: raw.vipExpiresAt as string | undefined,
    banned: (raw.banned as boolean) ?? false,
    privacy: (raw.privacyMode as boolean) ?? false,
    twoFaEnabled: (raw.twoFaEnabled as boolean) ?? false,
    recoveryCodesRemaining: (raw.recoveryCodesRemaining as number) ?? 0,
    walletAddress: raw.solanaAddress as string | undefined,
    referralCode: (raw.referralCode as string) ?? "",
    createdAt: raw.createdAt as string,
    usdcBalance: Number(wallet?.usdcBalance ?? 0),
    ashBalance: Number(wallet?.ashBalance ?? 0),
    depositAddress: (wallet?.depositAddress as string) ?? "",
    ashBoostExpiresAt: wallet?.ashBoostExpiresAt as string | undefined,
  };
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// ─── Token helpers ───────────────────────────────────────────────────────────

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refreshToken");
}

function setTokens(accessToken: string, _refreshToken?: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("accessToken", accessToken);
  // The refresh token now lives in an HttpOnly cookie set by the backend — it is
  // intentionally NOT persisted to JS-readable storage so XSS can't exfiltrate it.
}

function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

function isTokenExpiringSoon(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const expiresAt = payload.exp * 1000;
    return Date.now() > expiresAt - 30_000; // refresh if expiring within 30s
  } catch {
    return true; // if we can't parse, treat as expired
  }
}

// Prevents concurrent refreshes
let refreshPromise: Promise<void> | null = null;

async function maybeRefresh(): Promise<void> {
  const access = getAccessToken();
  if (access && !isTokenExpiringSoon(access)) return;

  // The refresh token is in an HttpOnly cookie (not readable here). A legacy token
  // may still sit in localStorage from before the cookie migration — send it as a
  // body fallback so those sessions transparently move onto the cookie.
  const legacyRefresh = getRefreshToken();
  if (!access && !legacyRefresh) return; // not logged in — nothing to refresh

  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // send + receive the HttpOnly refresh cookie
        body: legacyRefresh ? JSON.stringify({ refreshToken: legacyRefresh }) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (json?.success && json.data?.accessToken) {
        setTokens(json.data.accessToken);
        // Migrated onto the cookie — drop the legacy localStorage refresh token.
        if (typeof window !== "undefined") localStorage.removeItem("refreshToken");
      } else {
        clearTokens();
        userStore.clear();
      }
    } catch {
      clearTokens();
      userStore.clear();
    }
  })().finally(() => { refreshPromise = null; });

  return refreshPromise;
}

function authHeader(): Record<string, string> {
  const t = getAccessToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  requiresAuth = true,
): Promise<T> {
  if (requiresAuth) await maybeRefresh();

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (requiresAuth) Object.assign(headers, authHeader());

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: "include", // send the HttpOnly refresh cookie to /api/auth/* + store Set-Cookie on login
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error ?? "Request failed");
  }

  return json.data as T;
}

const get  = <T>(path: string, auth = true) => request<T>("GET",    path, undefined, auth);
const post = <T>(path: string, body?: unknown, auth = true) => request<T>("POST",   path, body, auth);
const put  = <T>(path: string, body?: unknown, auth = true) => request<T>("PUT",    path, body, auth);
const del  = <T>(path: string, auth = true) => request<T>("DELETE", path, undefined, auth);

// ─── API methods ─────────────────────────────────────────────────────────────

export const api = {

  // ── Auth ──────────────────────────────────────────────────────────────────

  async login(b: { email: string; password?: string; otp?: string }) {
    const data = await post<{ accessToken: string; refreshToken: string; user: unknown; requires2fa?: boolean }>(
      "/api/auth/login", b, false,
    );
    if (data.accessToken) setTokens(data.accessToken, data.refreshToken);
    return { success: true, data };
  },

  async loginWith2fa(b: { email: string; password: string; twoFaCode: string }) {
    const data = await post<{ accessToken: string; refreshToken: string; user: unknown }>(
      "/api/auth/login", b, false,
    );
    if (data.accessToken) setTokens(data.accessToken, data.refreshToken);
    return { success: true, data };
  },

  async sendOtp(email: string) {
    await post("/api/auth/send-otp", { email }, false);
    return { success: true };
  },

  // Admin-scoped OTP: backend only emails a code to admin/owner accounts.
  async adminRequestOtp(email: string) {
    await post("/api/auth/admin/request-otp", { email }, false);
    return { success: true };
  },

  // Admin-scoped login: backend issues tokens ONLY for admins/owners.
  async adminOtpLogin(b: { email: string; otp: string }) {
    const data = await post<{ accessToken: string; refreshToken: string; user: unknown }>(
      "/api/auth/admin/login", b, false,
    );
    if (data.accessToken) setTokens(data.accessToken, data.refreshToken);
    return { success: true, data };
  },

  async register(b: { email: string; username?: string; password?: string; otp?: string; referralCode?: string }) {
    const data = await post<{ accessToken: string; refreshToken: string; user: unknown }>(
      "/api/auth/register", b, false,
    );
    if (data.accessToken) setTokens(data.accessToken, data.refreshToken);
    return { success: true, data };
  },

  // Fetch a single-use server nonce message to sign (anti-replay for wallet auth).
  async walletChallenge(publicKey: string): Promise<string> {
    const data = await post<{ message: string }>("/api/auth/challenge", { publicKey }, false);
    return data.message;
  },

  async walletLogin(b: { publicKey: string; signature: number[]; message: string }) {
    const data = await post<{ accessToken: string; refreshToken: string; user: unknown }>(
      "/api/auth/wallet", b, false,
    );
    if (data.accessToken) setTokens(data.accessToken, data.refreshToken);
    return { success: true, data };
  },

  async linkWallet(b: { publicKey: string; signature: number[]; message: string }) {
    const data = await post("/api/auth/link-wallet", b);
    return { success: true, data };
  },

  async applyReferral(referralCode: string) {
    await post("/api/auth/apply-referral", { referralCode });
    return { success: true };
  },

  async profile() {
    const data = await get<Record<string, unknown>>("/api/auth/profile");
    return { success: true, data };
  },

  async updateProfile(patch: { username?: string; privacyMode?: boolean; avatarUrl?: string }) {
    const data = await put("/api/auth/profile", patch);
    // Re-fetch full profile so all computed fields stay in sync
    get<Record<string, unknown>>("/api/auth/profile")
      .then((profileData) => userStore.update(mapProfile(profileData)))
      .catch(() => {});
    return { success: true, data };
  },

  async updatePassword(b: { currentPassword: string; newPassword: string }) {
    await put("/api/auth/password", b);
    return { success: true };
  },

  async logout() {
    // Always hit the endpoint — the HttpOnly cookie carries the refresh token and
    // must be cleared server-side (legacy localStorage token sent as a fallback).
    try {
      await post("/api/auth/logout", { refreshToken: getRefreshToken() });
    } catch {
      // fire-and-forget; don't block logout on network failure
    }
    clearTokens();
    userStore.clear();
  },

  // ── 2FA ───────────────────────────────────────────────────────────────────

  async generate2fa() {
    const data = await post<{ secret: string; otpauthUrl: string }>("/api/2fa/generate");
    return { success: true, data };
  },

  async enable2fa(token: string) {
    const data = await post("/api/2fa/enable", { token });
    return { success: true, data };
  },

  async disable2fa(token: string) {
    await post("/api/2fa/disable", { token });
    return { success: true };
  },

  // ── Rounds ────────────────────────────────────────────────────────────────

  async currentRound() {
    const data = await get("/api/round/current");
    return { success: true, data };
  },

  async publicRound() {
    const data = await get("/api/round/current/public", false);
    return { success: true, data };
  },

  async roundHistory() {
    const data = await get("/api/round/history", false);
    return { success: true, data };
  },

  // ── Burn ──────────────────────────────────────────────────────────────────

  async burn(amount: number) {
    const data = await post<{ weight: number; ash: number; rank: number; newPool: number }>(
      "/api/burn", { amount },
    );
    // Refresh full user profile so header balances update immediately
    get<Record<string, unknown>>("/api/auth/profile")
      .then((profileData) => userStore.update(mapProfile(profileData)))
      .catch(() => {});
    return { success: true, data };
  },

  async activateBoost() {
    const data = await post("/api/burn/boost");
    // Refresh full user profile so ASH balance and boost expiry update
    get<Record<string, unknown>>("/api/auth/profile")
      .then((profileData) => userStore.update(mapProfile(profileData)))
      .catch(() => {});
    return { success: true, data };
  },

  // ── Wallet ────────────────────────────────────────────────────────────────

  async walletPlatformInfo() {
    const data = await get<{ masterWallet: string; usdcMint: string; network: string }>(
      "/api/wallet/platform-info",
      false,
    );
    return { success: true, data };
  },

  async deposit(b: { txHash: string }) {
    const data = await post("/api/wallet/deposit", b);
    return { success: true, data };
  },

  async recoverDeposits() {
    const data = await post<{ recovered: number; totalAmount: number; txHashes: string[] }>(
      "/api/wallet/deposit/recover",
    );
    return { success: true, data };
  },

  async withdraw(b: { amount: number; address: string; twoFaCode: string }) {
    const data = await post<{ txHash: string }>("/api/wallet/withdraw", b);
    return { success: true, data };
  },

  async transactions(q?: { type?: string; page?: number }) {
    const params = new URLSearchParams();
    if (q?.type) params.set("type", q.type);
    if (q?.page) params.set("page", String(q.page));
    const qs = params.toString();
    const data = await get(`/api/wallet/transactions${qs ? "?" + qs : ""}`);
    return { success: true, data };
  },

  async whitelist() {
    const data = await get("/api/wallet/whitelist");
    return { success: true, data };
  },

  async addWhitelist(b: { address: string; label?: string }) {
    const data = await post("/api/wallet/whitelist", b);
    return { success: true, data };
  },

  async deleteWhitelist(id: string) {
    await del(`/api/wallet/whitelist/${id}`);
    return { success: true };
  },

  async claimAsh(b: { toAddress: string; amount?: number }) {
    const data = await post<{ txHash: string }>("/api/wallet/claim-ash", b);
    return { success: true, data };
  },

  // ── Leaderboard ───────────────────────────────────────────────────────────

  async leaderboard(kind: "winners" | "burners" | "referrers" | "ash") {
    const data = await get(`/api/leaderboard/${kind}`, false);
    return { success: true, data };
  },

  // ── VIP ───────────────────────────────────────────────────────────────────

  async subscribeVip(tier: string) {
    const data = await post("/api/vip/subscribe", { tier });
    return { success: true, data };
  },

  async cancelVip() {
    const data = await post("/api/vip/cancel");
    return { success: true, data };
  },

  // ── Staking ───────────────────────────────────────────────────────────────

  async stakingSummary() {
    const data = await get("/api/staking/summary");
    return { success: true, data };
  },

  async stakingPools() {
    const data = await get("/api/staking/pools", false);
    return { success: true, data };
  },

  async stakingPositions() {
    const data = await get("/api/staking/positions");
    return { success: true, data };
  },

  async stake(b: { poolId: string; amount: number }) {
    const data = await post("/api/staking/stake", b);
    return { success: true, data };
  },

  async unstake(id: string) {
    const data = await post(`/api/staking/unstake/${id}`);
    return { success: true, data };
  },

  async claimStakingRewards(id: string) {
    const data = await post(`/api/staking/claim/${id}`);
    return { success: true, data };
  },

  // ── Referrals ─────────────────────────────────────────────────────────────

  async referrals() {
    const data = await get("/api/referrals");
    return { success: true, data };
  },

  // ── Admin ─────────────────────────────────────────────────────────────────

  async adminStats() {
    const data = await get("/api/admin/stats");
    return { success: true, data };
  },

  async adminUsers() {
    const data = await get("/api/admin/users");
    return { success: true, data };
  },

  async adminConfig() {
    const data = await get("/api/admin/config");
    return { success: true, data };
  },

  async adminSetUserRole(id: string, role: string) {
    await put(`/api/admin/users/${id}/role`, { role });
    return { success: true };
  },

  async adminBanUser(id: string, ban: boolean) {
    await put(`/api/admin/users/${id}/ban`, { ban });
    return { success: true };
  },

  async adminSetConfig(key: string, value: unknown) {
    await put(`/api/admin/config/${key}`, { value });
    return { success: true };
  },

  // ── Launch mode / waitlist ──────────────────────────────────────────────────

  async launchStatus() {
    const data = await get<{ launchMode: boolean; launchAt: string | null }>("/api/launch-status", false);
    return { success: true, data };
  },

  async subscribe(email: string) {
    const data = await post<{ subscribed?: boolean; alreadySubscribed?: boolean }>(
      "/api/subscribe", { email }, false,
    );
    return { success: true, data };
  },

  async adminLaunch() {
    const data = await get<{ launchMode: boolean; launchAt: string | null }>("/api/admin/launch");
    return { success: true, data };
  },

  async adminSetLaunch(b: { launchMode?: boolean; launchAt?: string | null }) {
    await put("/api/admin/launch", b);
    return { success: true };
  },

  async adminSubscribers(q?: { search?: string; page?: number }) {
    const params = new URLSearchParams();
    if (q?.search) params.set("search", q.search);
    if (q?.page) params.set("page", String(q.page));
    const qs = params.toString();
    const data = await get<{
      items: { id: string; email: string; source: string; ipAddress: string | null; createdAt: string }[];
      total: number; page: number; pages: number;
    }>(`/api/admin/subscribers${qs ? "?" + qs : ""}`);
    return { success: true, data };
  },

  async adminDeleteSubscriber(id: string) {
    await del(`/api/admin/subscribers/${id}`);
    return { success: true };
  },

  // CSV endpoint returns a file (not JSON) — raw fetch with auth, return the text.
  async adminExportSubscribersCsv(): Promise<string> {
    await maybeRefresh();
    const res = await fetch(`${BASE}/api/admin/subscribers/export`, {
      headers: { ...authHeader() },
      credentials: "include",
    });
    if (!res.ok) throw new Error("Export failed");
    return res.text();
  },

  // ── Owner ─────────────────────────────────────────────────────────────────

  async ownerSolvency() {
    const data = await get("/api/owner/solvency");
    return { success: true, data };
  },

  async ownerProfitPool() {
    const data = await get("/api/owner/profit-pool");
    return { success: true, data };
  },

  async ownerPendingWithdrawal() {
    const data = await get("/api/owner/withdrawal/pending");
    return { success: true, data };
  },

  async ownerInitiateWithdrawal(_amount?: number) {
    const data = await post("/api/owner/withdrawal/initiate", {});
    return { success: true, data };
  },

  async ownerCreateRound() {
    const data = await post("/api/owner/round");
    return { success: true, data };
  },

  async ownerEndRound(id: string) {
    const data = await post(`/api/owner/round/${id}/end`);
    return { success: true, data };
  },

  async ownerApproveWithdrawal(id: string) {
    const data = await post(`/api/owner/withdrawal/approve/${id}`);
    return { success: true, data };
  },

  async ownerCancelWithdrawal(id: string) {
    const data = await post(`/api/owner/withdrawal/cancel/${id}`);
    return { success: true, data };
  },

  async ownerBurnConfig() {
    const data = await get("/api/owner/burn-config");
    return { success: true, data };
  },

  async ownerSetBurnConfig(cfg: Record<string, unknown>) {
    await put("/api/owner/burn-config", cfg);
    return { success: true };
  },

  async ownerDevnetAirdrop() {
    const data = await post("/api/owner/devnet-airdrop");
    return { success: true, data };
  },
};
