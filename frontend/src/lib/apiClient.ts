// Centralized API client. All methods currently return mock data.
// TODO: replace with real API call (each method individually noted).

import {
  mockUser, mockRound, mockTransactions, mockWhitelist,
  stakingPools, mockStakingPositions, mockReferrals, mockLeaderboards,
  mockAdminUsers, mockBurnConfig, mockOwnerSolvency, mockProfitPool,
  mockPendingWithdrawal, calcWeight, calcAsh,
} from "./mock";
import { userStore } from "./userStore";

const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));

function authHeader(): Record<string,string> {
  if (typeof window === "undefined") return {};
  const t = localStorage.getItem("accessToken");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// TODO: replace with real API call (POST /api/auth/refresh)
async function maybeRefresh() { void authHeader(); return; }

export const api = {
  async login(_b: { email: string; password?: string; otp?: string }) {
    // TODO: replace with real API call (POST /api/auth/login)
    await wait();
    if (typeof window !== "undefined") {
      localStorage.setItem("accessToken", "mock.access.token");
      localStorage.setItem("refreshToken", "mock.refresh.token");
    }
    return { success: true, data: { user: mockUser, requires2fa: false } };
  },
  async loginWith2fa(_b: { email: string; password: string; twoFaCode: string }) {
    // TODO: replace with real API call
    await wait(); return { success: true, data: { user: mockUser } };
  },
  async sendOtp(_email: string) {
    // TODO: replace with real API call (POST /api/auth/send-otp)
    await wait(); return { success: true };
  },
  async register(_b: any) {
    // TODO: replace with real API call (POST /api/auth/register)
    await wait();
    if (typeof window !== "undefined") localStorage.setItem("accessToken", "mock.access.token");
    return { success: true, data: { user: mockUser } };
  },
  async walletLogin(_b: { address: string; signature: string; timestamp: number }) {
    // TODO: replace with real API call (POST /api/auth/wallet)
    await wait();
    if (typeof window !== "undefined") localStorage.setItem("accessToken", "mock.access.token");
    return { success: true, data: { user: mockUser } };
  },
  async profile() {
    // TODO: replace with real API call (GET /api/auth/profile)
    await maybeRefresh(); return { success: true, data: mockUser };
  },
  async updateProfile(patch: Partial<typeof mockUser>) {
    // TODO: replace with real API call (PUT /api/auth/profile)
    await wait();
    userStore.update(patch);
    return { success: true };
  },
  async updatePassword(_b: { currentPassword: string; newPassword: string }) {
    // TODO: replace with real API call (PUT /api/auth/password)
    await wait(); return { success: true };
  },
  async generate2fa() {
    // TODO: replace with real API call (POST /api/2fa/generate)
    await wait();
    return { success: true, data: {
      secret: "JBSWY3DPEHPK3PXP",
      otpauthUrl: "otpauth://totp/Ashnance:you@ashnance.com?secret=JBSWY3DPEHPK3PXP&issuer=Ashnance",
    }};
  },
  async enable2fa(_t: string) {
    // TODO: replace with real API call (POST /api/2fa/enable)
    await wait();
    return { success: true, data: { recoveryCodes: Array.from({length:8}, () =>
      Math.random().toString(36).slice(2,7).toUpperCase() + "-" +
      Math.random().toString(36).slice(2,7).toUpperCase()) }};
  },
  async disable2fa(_t: string) {
    // TODO: replace with real API call (POST /api/2fa/disable)
    await wait(); return { success: true };
  },
  async currentRound() {
    // TODO: replace with real API call (GET /api/round/current)
    await wait(150); return { success: true, data: mockRound };
  },
  async publicRound() {
    // TODO: replace with real API call (GET /api/round/current/public)
    await wait(150); return { success: true, data: mockRound };
  },
  async roundHistory() {
    // TODO: replace with real API call (GET /api/round/history)
    await wait();
    return { success: true, data: Array.from({ length: 8 }, (_, i) => ({
      number: 411 - i,
      winner: ["blazewolf","emberqueen","torchbearer","Anonymous","pyromancer","ashking","infernox","molten"][i],
      prize: 500, status: "ENDED" as const,
      endedAt: new Date(Date.now() - (i+1) * 9 * 3600000).toISOString(),
    }))};
  },
  async burn(amount: number) {
    // TODO: replace with real API call (POST /api/burn)
    await wait(800);
    const u = userStore.get();
    const w = calcWeight(amount, { vip: !!u.vip, boost: !!u.ashBoostExpiresAt && new Date(u.ashBoostExpiresAt) > new Date(), activeReferrals: 3 });
    const ash = calcAsh(amount, !!u.vip);
    userStore.update({ usdcBalance: u.usdcBalance - amount, ashBalance: u.ashBalance + ash });
    mockRound.prizePool = Math.min(mockRound.prizePoolTarget, mockRound.prizePool + amount * 0.4);
    const newRank = Math.max(1, 5 - Math.floor(amount / 25));
    return { success: true, data: { weight: w.final, ash, newPool: mockRound.prizePool, rank: newRank } };
  },
  async activateBoost() {
    // TODO: replace with real API call (POST /api/burn/boost)
    await wait();
    const u = userStore.get();
    if (u.ashBalance < 1000) throw new Error("Insufficient ASH balance");
    userStore.update({
      ashBalance: u.ashBalance - 1000,
      ashBoostExpiresAt: new Date(Date.now() + 3600000).toISOString(),
    });
    return { success: true };
  },
  async deposit(_b: { txHash: string }) {
    // TODO: replace with real API call (POST /api/wallet/deposit)
    await wait(800); return { success: true };
  },
  async withdraw(_b: { amount: number; address: string; twoFaCode: string }) {
    // TODO: replace with real API call (POST /api/wallet/withdraw)
    await wait(1200); return { success: true, data: { txHash: "5JxhP9Y3kN2A...c8" }};
  },
  async transactions(_q?: { type?: string; page?: number }) {
    // TODO: replace with real API call (GET /api/wallet/transactions)
    await wait();
    return { success: true, data: { items: mockTransactions, total: mockTransactions.length, page: 1, pages: 1 }};
  },
  async whitelist() {
    // TODO: replace with real API call (GET /api/wallet/whitelist)
    await wait(); return { success: true, data: mockWhitelist };
  },
  async addWhitelist(_b: { address: string; label?: string }) {
    // TODO: replace with real API call (POST /api/wallet/whitelist)
    await wait(); return { success: true };
  },
  async deleteWhitelist(_id: string) {
    // TODO: replace with real API call (DELETE /api/wallet/whitelist/:id)
    await wait(); return { success: true };
  },
  async claimAsh(_b: { toAddress: string; amount: number }) {
    // TODO: replace with real API call (POST /api/wallet/claim-ash)
    await wait(1000); return { success: true, data: { txHash: "9KkLm4Z8r..." }};
  },
  async leaderboard(kind: "winners"|"burners"|"referrers"|"ash") {
    // TODO: replace with real API call (GET /api/leaderboard/:kind)
    await wait(); return { success: true, data: mockLeaderboards[kind] };
  },
  async subscribeVip(_t: string) {
    // TODO: replace with real API call (POST /api/vip/subscribe)
    await wait(800); return { success: true };
  },
  async cancelVip() {
    // TODO: replace with real API call (POST /api/vip/cancel)
    await wait(); return { success: true };
  },
  async stakingSummary() {
    // TODO: replace with real API call (GET /api/staking/summary)
    await wait();
    const totalStaked = mockStakingPositions.reduce((s,p)=>s+p.staked,0);
    const pending = mockStakingPositions.reduce((s,p)=>s+p.pending,0);
    return { success: true, data: { totalStaked, pending, activePositions: mockStakingPositions.filter(p=>p.status==="ACTIVE").length }};
  },
  async stakingPools() {
    // TODO: replace with real API call (GET /api/staking/pools)
    return { success: true, data: stakingPools };
  },
  async stakingPositions() {
    // TODO: replace with real API call (GET /api/staking/positions)
    await wait(); return { success: true, data: mockStakingPositions };
  },
  async stake(_b: { poolId: string; amount: number }) {
    // TODO: replace with real API call (POST /api/staking/stake)
    await wait(800); return { success: true };
  },
  async unstake(_id: string) {
    // TODO: replace with real API call (POST /api/staking/unstake/:id)
    await wait(800); return { success: true };
  },
  async claimStakingRewards(_id: string) {
    // TODO: replace with real API call (POST /api/staking/claim/:id)
    await wait(); return { success: true };
  },
  async referrals() {
    // TODO: replace with real API call (GET /api/referrals)
    await wait(); return { success: true, data: mockReferrals };
  },
  async adminStats() {
    // TODO: replace with real API call (GET /api/admin/stats)
    await wait(); return { success: true, data: { totalUsers: 1284, totalBurns: 58213, activeVips: 134, rewardPool: 3127.84 }};
  },
  async adminUsers() {
    // TODO: replace with real API call (GET /api/admin/users)
    await wait(); return { success: true, data: mockAdminUsers };
  },
  async adminConfig() {
    // TODO: replace with real API call (GET /api/admin/config)
    await wait(); return { success: true, data: mockBurnConfig };
  },
  async adminSetUserRole(_id: string, _role: string) {
    // TODO: replace with real API call (PUT /api/admin/users/:id/role)
    await wait(); return { success: true };
  },
  async adminBanUser(_id: string, _ban: boolean) {
    // TODO: replace with real API call (PUT /api/admin/users/:id/ban)
    await wait(); return { success: true };
  },
  async adminSetConfig(_k: string, _v: any) {
    // TODO: replace with real API call (PUT /api/admin/config/:key)
    await wait(); return { success: true };
  },
  async ownerSolvency() {
    // TODO: replace with real API call (GET /api/owner/solvency)
    await wait(); return { success: true, data: mockOwnerSolvency };
  },
  async ownerProfitPool() {
    // TODO: replace with real API call (GET /api/owner/profit-pool)
    await wait(); return { success: true, data: mockProfitPool };
  },
  async ownerPendingWithdrawal() {
    // TODO: replace with real API call (GET /api/owner/withdrawal/pending)
    await wait(); return { success: true, data: mockPendingWithdrawal };
  },
  async ownerInitiateWithdrawal(_a: number) {
    // TODO: replace with real API call (POST /api/owner/withdrawal/initiate)
    await wait(); return { success: true };
  },
  async ownerBurnConfig() {
    // TODO: replace with real API call (GET /api/owner/burn-config)
    await wait(); return { success: true, data: mockBurnConfig };
  },
  async ownerSetBurnConfig(_c: typeof mockBurnConfig) {
    // TODO: replace with real API call (PUT /api/owner/burn-config)
    await wait(); return { success: true };
  },
  async ownerDevnetAirdrop() {
    // TODO: replace with real API call (POST /api/owner/devnet-airdrop)
    await wait(1500); return { success: true };
  },
};
