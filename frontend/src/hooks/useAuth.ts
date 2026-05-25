import { useEffect, useState, useCallback } from "react";
import { userStore } from "@/lib/userStore";

export function useAuth() {
  const [user, setUser] = useState(userStore.get());

  useEffect(() => userStore.subscribe(() => setUser(userStore.get())), []);

  const logout = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      window.location.href = "/";
    }
  }, []);

  return {
    user,
    isAuthenticated: true,
    isAdmin: user.role === "ADMIN" || user.role === "OWNER",
    isOwner: user.role === "OWNER",
    logout,
  };
}
