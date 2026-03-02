"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { getValidToken } from "../lib/utils";
import { registerAuthClearHandler, registerAuthRefreshHandler } from "../lib/api";
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
      // 現在の user 情報を保持したまま token だけ更新
      const currentUser = authRef.current?.user;
      if (currentUser) {
        const state = { token: newToken, user: currentUser };
        setAuthState(state);
        authRef.current = state;
      }
    });

    return () => {
      registerAuthClearHandler(() => {});
      registerAuthRefreshHandler(() => {});
    };
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
