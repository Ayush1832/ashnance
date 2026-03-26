// ============================================================
// Ashnance Frontend — API Client
// ============================================================
// Centralized API client for all backend communication.
// Usage: import { api } from "@/lib/api"; api.auth.login({ email, password });

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

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

  private async refreshToken(): Promise<boolean> {
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
      this.request<any>("/auth/register", { method: "POST", body: JSON.stringify(body) }),

    login: (body: { email: string; password: string }) =>
      this.request<any>("/auth/login", { method: "POST", body: JSON.stringify(body) }),

    profile: () =>
      this.request<any>("/auth/profile"),

    logout: (refreshToken: string) =>
      this.request<any>("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }),
  };

  // ---- BURN ----
  burn = {
    execute: (amount: number, useBoost: boolean = false) =>
      this.request<any>("/burn", { method: "POST", body: JSON.stringify({ amount, useBoost }) }),

    history: (page: number = 1, limit: number = 20) =>
      this.request<any>(`/burn/history?page=${page}&limit=${limit}`),

    stats: () =>
      this.request<any>("/burn/stats"),
  };

  // ---- WALLET ----
  wallet = {
    balance: () =>
      this.request<any>("/wallet"),

    deposit: (amount: number, txHash: string) =>
      this.request<any>("/wallet/deposit", { method: "POST", body: JSON.stringify({ amount, txHash }) }),

    withdraw: (amount: number, address: string, twoFaCode: string) =>
      this.request<any>("/wallet/withdraw", { method: "POST", body: JSON.stringify({ amount, address, twoFaCode }) }),

    transactions: (type?: string, page: number = 1, limit: number = 20) =>
      this.request<any>(`/wallet/transactions?page=${page}&limit=${limit}${type ? `&type=${type}` : ""}`),
  };

  // ---- LEADERBOARD ----
  leaderboard = {
    winners: () => this.request<any>("/leaderboard/winners"),
    burners: () => this.request<any>("/leaderboard/burners"),
    referrers: () => this.request<any>("/leaderboard/referrers"),
    ash: () => this.request<any>("/leaderboard/ash"),
  };

  // ---- 2FA ----
  twoFA = {
    generate: () =>
      this.request<any>("/2fa/generate", { method: "POST" }),

    enable: (token: string) =>
      this.request<any>("/2fa/enable", { method: "POST", body: JSON.stringify({ token }) }),

    disable: (token: string) =>
      this.request<any>("/2fa/disable", { method: "POST", body: JSON.stringify({ token }) }),
  };

  // ---- HEALTH ----
  health = () => this.request<any>("/health");
}

export const api = new ApiClient();
