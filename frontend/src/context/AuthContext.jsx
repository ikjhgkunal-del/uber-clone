import { createContext, useContext, useEffect, useState } from "react";
import {
  configureSession,
  refreshSession,
  storeSession,
  api,
} from "../services/api";
import { signOut } from "../services/auth.api";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    configureSession((value) => {
      if (active) setSessionState(value);
    });
    refreshSession()
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    const timer = setInterval(
      () => {
        refreshSession().catch(() => {});
      },
      12 * 60 * 1000,
    );
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  async function logout() {
    await signOut();
    storeSession(null);
  }
  async function reloadUser() {
    const data = await api("/auth/me");
    setSessionState((current) =>
      current ? { ...current, user: data.user } : current,
    );
  }
  return (
    <AuthContext.Provider
      value={{ session, loading, setSession: storeSession, logout, reloadUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
