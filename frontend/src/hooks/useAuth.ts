import { useEffect, useState, useCallback, useRef } from "react";
import { userStore } from "@/lib/userStore";
import { api, mapProfile } from "@/lib/apiClient";

export function useAuth() {
  const [user, setUser] = useState(userStore.get());
  const initialized = useRef(false);

  // Subscribe to userStore changes
  useEffect(() => userStore.subscribe(() => setUser(userStore.get())), []);

  // On mount: always attempt to restore the session, even with no access token in
  // localStorage (cleared, or just an expired 15min token after the browser was
  // closed) — a valid 7-day refresh cookie may still exist. restoreSession() probes
  // for that cookie without redirecting on failure, so anonymous visitors (no
  // cookie) are left alone; only a real session gets its profile fetched.
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (typeof window === "undefined") return;

    api.restoreSession()
      .then((restored) => {
        if (!restored) return;
        return api.profile().then((res) => {
          if (res.success && res.data) {
            userStore.update(mapProfile(res.data as Record<string, unknown>));
          }
        });
      })
      .catch(() => {
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
