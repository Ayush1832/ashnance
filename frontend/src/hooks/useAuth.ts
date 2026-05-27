import { useEffect, useState, useCallback, useRef } from "react";
import { userStore } from "@/lib/userStore";
import { api, mapProfile } from "@/lib/apiClient";

export function useAuth() {
  const [user, setUser] = useState(userStore.get());
  const initialized = useRef(false);

  // Subscribe to userStore changes
  useEffect(() => userStore.subscribe(() => setUser(userStore.get())), []);

  // On mount: if we have a token, fetch the real profile
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (typeof window === "undefined") return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    api.profile()
      .then((res) => {
        if (res.success && res.data) {
          userStore.update(mapProfile(res.data as Record<string, unknown>));
        }
      })
      .catch(() => {
        // Token invalid — clear it
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        userStore.clear();
      });
  }, []);

  const logout = useCallback(async () => {
    if (typeof window === "undefined") return;
    await api.logout();
    window.location.href = "/";
  }, []);

  const isAuthenticated = !!(user.id);

  return {
    user,
    isAuthenticated,
    isAdmin: user.role === "ADMIN" || user.role === "OWNER",
    isOwner: user.role === "OWNER",
    logout,
  };
}
