// ============================================================
// Ashnance Frontend — API Client
// ============================================================
// Centralized API client for all backend communication.
// Usage: import { api } from "@/lib/api"; api.auth.login({ email, password });

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + "/api";

class ApiClient {
  private accessToken: string | null = null;

  setToken(token: string) {
    this.accessToken = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("accessToken", token);
    }
  }

  getToken(): string | null {
    if (this.accessToken) return this.accessToken;
    if (typeof window !== "undefined") {
      return localStorage.getItem("accessToken");
    }
    return null;
  }

  clearToken() {
    this.accessToken = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      // Try to refresh token on 401
      if (response.status === 401 && token) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          headers.Authorization = `Bearer ${this.getToken()}`;
          const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
          });
          return retryResponse.json();
        }
      }
      throw new Error(data.error || "API request failed");
    }

    return data;
  }

  // Shared promise so concurrent 401s share one refresh call instead of racing
  private refreshPromise: Promise<boolean> | null = null;

  private refreshToken(): Promise<boolean> {
    if (!this.refreshPromise) {
      this.refreshPromise = this._executeRefresh().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  private async _executeRefresh(): Promise<boolean> {
    try {
      const refreshToken = typeof window !== "undefined"
        ? localStorage.getItem("refreshToken")
        : null;

      if (!refreshToken) return false;

      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        this.clearToken();
        return false;
      }

      const data = await response.json();
      this.setToken(data.data.accessToken);
      localStorage.setItem("refreshToken", data.data.refreshToken);
      return true;
    } catch {
      this.clearToken();
      return false;
    }
  }

  // ---- AUTH ----
  auth = {
    register: (body: { email: string; username: string; password?: string; referralCode?: string }) =>
      this.request<unknown>("/auth/register", { method: "POST", body: JSON.stringify(body) }),

    login: (body: { email: string; password: string }) =>
      this.request<unknown>("/auth/login", { method: "POST", body: JSON.stringify(body) }),

    profile: () =>
      this.request<unknown>("/auth/profile"),

    updateProfile: (body: { username?: string; avatarUrl?: string; privacyMode?: boolean; country?: string }) =>
      this.request<unknown>("/auth/profile", { method: "PUT", body: JSON.stringify(body) }),

    changePassword: (currentPassword: string, newPassword: string) =>
      this.request<unknown>("/auth/password", { method: "PUT", body: JSON.stringify({ currentPassword, newPassword }) }),

    logout: (refreshToken: string) =>
      this.request<unknown>("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }),

    sendOtp: (email: string) =>
      this.request<unknown>("/auth/send-otp", { method: "POST", body: JSON.stringify({ email }) }),

    verifyOtp: (email: string, otp: string) =>
      this.request<unknown>("/auth/verify-otp", { method: "POST", body: JSON.stringify({ email, otp }) }),

    wallet: (publicKey: string, signature: number[], message: string) =>
      this.request<unknown>("/auth/wallet", { method: "POST", body: JSON.stringify({ publicKey, signature, message }) }),

    linkWallet: (publicKey: string, signature: number[], message: string) =>
      this.request<unknown>("/auth/link-wallet", { method: "POST", body: JSON.stringify({ publicKey, signature, message }) }),
  };

  // ---- BURN ----
  burn = {
    execute: (amount: number) =>
      this.request<unknown>("/burn", { method: "POST", body: JSON.stringify({ amount }) }),

    history: (page: number = 1, limit: number = 20) =>
      this.request<unknown>(`/burn/history?page=${page}&limit=${limit}`),

    stats: () =>
      this.request<unknown>("/burn/stats"),
  };

  // ---- WALLET ----
  wallet = {
    balance: () =>
      this.request<unknown>("/wallet"),

    deposit: (txHash: string) =>
      this.request<unknown>("/wallet/deposit", { method: "POST", body: JSON.stringify({ txHash }) }),

    withdraw: (amount: number, address: string, twoFaCode: string) =>
      this.request<unknown>("/wallet/withdraw", { method: "POST", body: JSON.stringify({ amount, address, twoFaCode }) }),

    transactions: (type?: string, page: number = 1, limit: number = 20) =>
      this.request<unknown>(`/wallet/transactions?page=${page}&limit=${limit}${type ? `&type=${type}` : ""}`),

    platformInfo: () =>
      this.request<unknown>("/wallet/platform-info"),

    onchain: (address: string) =>
      this.request<unknown>(`/wallet/onchain/${address}`),

    whitelist: () =>
      this.request<unknown>("/wallet/whitelist"),

    addWhitelist: (address: string, label?: string) =>
      this.request<unknown>("/wallet/whitelist", { method: "POST", body: JSON.stringify({ address, label }) }),

    removeWhitelist: (id: string) =>
      this.request<unknown>(`/wallet/whitelist/${id}`, { method: "DELETE" }),
  };

  // ---- LEADERBOARD ----
  leaderboard = {
    winners: () => this.request<unknown>("/leaderboard/winners"),
    burners: () => this.request<unknown>("/leaderboard/burners"),
    referrers: () => this.request<unknown>("/leaderboard/referrers"),
    ash: () => this.request<unknown>("/leaderboard/ash"),
  };

  // ---- 2FA ----
  twoFA = {
    generate: () =>
      this.request<unknown>("/2fa/generate", { method: "POST" }),

    enable: (token: string) =>
      this.request<unknown>("/2fa/enable", { method: "POST", body: JSON.stringify({ token }) }),

    disable: (token: string) =>
      this.request<unknown>("/2fa/disable", { method: "POST", body: JSON.stringify({ token }) }),
  };

  // ---- VIP ----
  vip = {
    status: () => this.request<unknown>("/vip/status"),

    subscribe: (tier: string) =>
      this.request<unknown>("/vip/subscribe", { method: "POST", body: JSON.stringify({ tier }) }),

    cancel: () =>
      this.request<unknown>("/vip/cancel", { method: "POST" }),
  };

  // ---- ADMIN ----
  admin = {
    stats: () => this.request<unknown>("/admin/stats"),
    prizes: () => this.request<unknown>("/admin/prizes"),
    updatePrize: (tier: string, data: any) =>
      this.request<unknown>(`/admin/prizes/${tier}`, { method: "PUT", body: JSON.stringify(data) }),
    config: () => this.request<unknown>("/admin/config"),
    updateConfig: (key: string, value: string) =>
      this.request<unknown>(`/admin/config/${key}`, { method: "PUT", body: JSON.stringify({ value }) }),
    users: (page: number = 1) => this.request<unknown>(`/admin/users?page=${page}`),
    updateRole: (userId: string, role: string) =>
      this.request<unknown>(`/admin/users/${userId}/role`, { method: "PUT", body: JSON.stringify({ role }) }),
    pool: () => this.request<unknown>("/admin/pool"),
  };

  // ---- STAKING ----
  staking = {
    pools: () => this.request<unknown>("/staking/pools"),
    positions: () => this.request<unknown>("/staking/positions"),
    summary: () => this.request<unknown>("/staking/summary"),
    stake: (poolId: string, amount: number) =>
      this.request<unknown>("/staking/stake", { method: "POST", body: JSON.stringify({ poolId, amount }) }),
    claim: (positionId: string) =>
      this.request<unknown>(`/staking/claim/${positionId}`, { method: "POST" }),
    unstake: (positionId: string) =>
      this.request<unknown>(`/staking/unstake/${positionId}`, { method: "POST" }),
  };

  // ---- ROUND ----
  round = {
    current: () => this.request<unknown>("/round/current"),
    leaderboard: () => this.request<unknown>("/round/leaderboard"),
    history: () => this.request<unknown>("/round/history"),
  };

  // ---- OWNER ----
  owner = {
    me: () => this.request<unknown>("/owner/me"),
    stats: () => this.request<unknown>("/owner/stats"),
    profitPool: () => this.request<unknown>("/owner/profit-pool"),
    pendingWithdrawal: () => this.request<unknown>("/owner/withdrawal/pending"),
    initiateWithdrawal: () =>
      this.request<unknown>("/owner/withdrawal/initiate", { method: "POST" }),
    approveWithdrawal: (id: string) =>
      this.request<unknown>(`/owner/withdrawal/approve/${id}`, { method: "POST" }),
    cancelWithdrawal: (id: string) =>
      this.request<unknown>(`/owner/withdrawal/cancel/${id}`, { method: "POST" }),
    getBurnConfig: () => this.request<unknown>("/owner/burn-config"),
    saveBurnConfig: (config: Record<string, number>) =>
      this.request<unknown>("/owner/burn-config", { method: "PUT", body: JSON.stringify(config) }),
    solvency: () => this.request<unknown>("/owner/solvency"),
    rounds: () => this.request<unknown>("/owner/rounds"),
    createRound: (prizePoolTarget?: number, timeLimitHours?: number) =>
      this.request<unknown>("/owner/round", { method: "POST", body: JSON.stringify({ prizePoolTarget, timeLimitHours }) }),
    endRound: (id: string) =>
      this.request<unknown>(`/owner/round/${id}/end`, { method: "POST" }),
    cancelRound: (id: string) =>
      this.request<unknown>(`/owner/round/${id}/cancel`, { method: "POST" }),
  };

  // ---- HEALTH ----
  health = () => this.request<unknown>("/health");
}

export const api = new ApiClient();
