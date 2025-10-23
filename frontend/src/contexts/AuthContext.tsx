import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

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
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("lecq.auth");
      if (raw) {
        const parsed = JSON.parse(raw) as AuthUser;
        setUser(parsed);
      }
    } catch (_e) {
      // ignore
    }
  }, []);

  const login = (nextUser: AuthUser) => {
    setUser(nextUser);
    localStorage.setItem("lecq.auth", JSON.stringify(nextUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("lecq.auth");
  };

  const value = useMemo(() => ({ user, login, logout }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
