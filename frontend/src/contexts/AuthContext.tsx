"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { getValidToken } from "../lib/utils";
import { API_BASE, fetchWithAuth, registerAuthClearHandler, registerAuthRefreshHandler } from "../lib/api";
import type { User } from "../lib/types";

type AuthState = {
  token: string;
  user: User;
} | null;

type AuthContextValue = {
  auth: AuthState;
  isInitialized: boolean;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuthState] = useState<AuthState>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const authRef = useRef<AuthState>(null);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const token = getValidToken();
    const stored = localStorage.getItem("user");
    if (token && stored) {
      try {
        const user = JSON.parse(stored);
        const state = { token, user };
        setAuthState(state);
        authRef.current = state;
      } catch {
        /* ignore */
      }
    }
    setIsInitialized(true);
  }, []);

  const setAuth = useCallback((token: string, user: User) => {
    const state = { token, user };
    setAuthState(state);
    authRef.current = state;
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
  }, []);

  const clearAuth = useCallback(() => {
    setAuthState(null);
    authRef.current = null;
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  }, []);

  // fetchWithAuth がリフレッシュ成功/失敗した時に AuthContext の state を同期する
  useEffect(() => {
    registerAuthClearHandler(() => {
      setAuthState(null);
      authRef.current = null;
    });

    registerAuthRefreshHandler((newToken: string) => {
      // リフレッシュ時は、localStorage に保存された最新の user 情報も反映する
      let user = authRef.current?.user ?? null;
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("user");
        if (stored) {
          try {
            user = JSON.parse(stored);
          } catch {
            // ignore parse error and fall back to current user
          }
        }
      }
      if (user) {
        const state = { token: newToken, user };
        setAuthState(state);
        authRef.current = state;
      }
    });

    return () => {
      registerAuthClearHandler(() => {});
      registerAuthRefreshHandler(() => {});
    };
  }, []);

  // アプリ起動時にサブスクリプション状態をサーバーと同期
  useEffect(() => {
    const syncSubscription = async () => {
      if (!authRef.current) return;
      // チェックアウト成功直後はconfirm-sessionに任せる（レースコンディション防止）
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("subscription") === "success") return;
      }
      try {
        const res = await fetchWithAuth(`${API_BASE}/subscriptions/status`);
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (!data || !data.status) return;
        const current = authRef.current;
        if (!current) return;
        const updatedUser = { ...current.user, subscriptionStatus: data.status };
        const nextState = { token: current.token, user: updatedUser };
        setAuthState(nextState);
        authRef.current = nextState;
        if (typeof window !== "undefined") {
          localStorage.setItem("user", JSON.stringify(updatedUser));
        }
      } catch {
        // ignore sync errors
      }
    };
    if (typeof window !== "undefined") {
      void syncSubscription();
    }
  }, []);

  return (
    <AuthContext.Provider value={{ auth, isInitialized, setAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
