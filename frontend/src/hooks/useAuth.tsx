import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import api from "../lib/api";
import type { User } from "../lib/types";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearMustReset: (updatedUser: User) => void;
  isAdmin: boolean;
  mustResetPassword: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("qa_pulse_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api.get("/auth/me")
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem("qa_pulse_user", JSON.stringify(data.user));
      })
      .catch(() => {
        localStorage.removeItem("qa_pulse_token");
        localStorage.removeItem("qa_pulse_user");
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("qa_pulse_token", data.token);
    localStorage.setItem("qa_pulse_user", JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("qa_pulse_token");
    localStorage.removeItem("qa_pulse_user");
    localStorage.removeItem("qa_pulse_project");
    setUser(null);
  };

  const clearMustReset = (updatedUser: User) => {
    const u = { ...updatedUser, mustResetPassword: false };
    setUser(u);
    localStorage.setItem("qa_pulse_user", JSON.stringify(u));
  };

  return (
    <AuthContext.Provider value={{
      user, login, logout, clearMustReset,
      isAdmin: user?.role === "ADMIN",
      mustResetPassword: user?.mustResetPassword === true,
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
