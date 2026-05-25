import { mockUser } from "@/lib/mock";

// Mock auth hook — always returns the fixture user so every authenticated
// screen renders. TODO: replace with real auth state.
export function useAuth() {
  return {
    user: mockUser,
    isAuthenticated: true,
    isAdmin: mockUser.role === "ADMIN" || mockUser.role === "OWNER",
    isOwner: mockUser.role === "OWNER",
    logout: () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/";
      }
    },
  };
}
