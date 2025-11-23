import React, { createContext, useContext, useMemo, useState } from "react";

type UserRole = "student" | "professor";

export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem("lecq.auth");
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch (_e) {
      return null;
    }
  });

  const login = (nextUser: AuthUser) => {
    setUser(nextUser);
    localStorage.setItem("lecq.auth", JSON.stringify(nextUser));
  };

  const logout = () => {
    setUser(null);
    // 모든 인증 관련 데이터 정리
    localStorage.removeItem("lecq.auth");
    localStorage.removeItem("lecq.token");
    localStorage.removeItem("lecq.refreshToken");
    localStorage.removeItem("lecq.tokenExpiresAt");
  };

  const value = useMemo(() => ({ user, login, logout }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
